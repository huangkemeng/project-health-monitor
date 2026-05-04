import { Router } from 'express';
import { query } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { success, error } from '../utils/api-response';
import type { Monitor, Alert, DashboardData, DashboardSummary, DashboardMonitorItem, AlertResponse } from '../types';

const router = Router();

// Get dashboard data - aggregate all accessible projects
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email;
    console.log('[Dashboard] Fetching data for user:', userId);

    // Get all accessible projects
    const { getAccessibleProjects } = await import('../services/collaboration');
    const accessibleProjects = await getAccessibleProjects(userId, userEmail);

    // Get owner info for all projects
    const ownerIds = accessibleProjects.map(p => p.ownerId);
    let ownerInfoMap = new Map<string, { username: string; email: string }>();
    if (ownerIds.length > 0) {
      const placeholders = ownerIds.map(() => '?').join(',');
      const ownerInfo = await query<{ id: string; username: string; email: string }>(
        `SELECT id, username, email FROM users WHERE id IN (${placeholders})`,
        ownerIds
      );
      ownerInfo.forEach(o => ownerInfoMap.set(o.id, { username: o.username, email: o.email }));
    }

    // Aggregate data from all accessible projects
    let totalMonitors = 0;
    let normalMonitors = 0;
    let warningMonitors = 0;
    let criticalMonitors = 0;
    let pausedMonitors = 0;
    const allMonitorIds: string[] = [];
    const allAlerts: AlertResponse[] = [];
    const allMonitorItems: DashboardMonitorItem[] = [];

    for (const project of accessibleProjects) {
      const ownerInfo = ownerInfoMap.get(project.ownerId) || { username: '', email: '' };

      // Build group filter for collaborators
      let groupFilter = '';
      const queryParams: any[] = [project.ownerId];

      if (!project.isOwner && project.accessibleGroupIds !== null) {
        if (project.accessibleGroupIds.length === 0) {
          groupFilter = 'AND m.group_id IS NULL';
        } else {
          const placeholders = project.accessibleGroupIds.map(() => '?').join(',');
          groupFilter = `AND (m.group_id IS NULL OR m.group_id IN (${placeholders}))`;
          queryParams.push(...project.accessibleGroupIds);
        }
      }

      // Get summary counts for this project
      const summaryResult = await query<DashboardSummary>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN health_status = 'normal' AND status = 'active' THEN 1 ELSE 0 END) as normal,
          SUM(CASE WHEN health_status = 'warning' AND status = 'active' THEN 1 ELSE 0 END) as warning,
          SUM(CASE WHEN health_status = 'critical' AND status = 'active' THEN 1 ELSE 0 END) as critical,
          SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused
         FROM monitors m
         WHERE m.owner_id = ? AND m.status != 'archived' ${groupFilter}`,
        queryParams
      );

      totalMonitors += Number(summaryResult[0]?.total) || 0;
      normalMonitors += Number(summaryResult[0]?.normal) || 0;
      warningMonitors += Number(summaryResult[0]?.warning) || 0;
      criticalMonitors += Number(summaryResult[0]?.critical) || 0;
      pausedMonitors += Number(summaryResult[0]?.paused) || 0;

      // Get monitor IDs for 24h stats
      const monitorIdsResult = await query<{ id: string }>(
        `SELECT id FROM monitors m WHERE m.owner_id = ? ${groupFilter}`,
        queryParams
      );
      allMonitorIds.push(...monitorIdsResult.map(m => m.id));

      // Get recent alerts for this project
      const recentAlerts = await query<Alert & { monitor_name: string; group_name: string | null }>(
        `SELECT a.*, m.name as monitor_name, mg.name as group_name
         FROM alerts a
         JOIN monitors m ON a.monitor_id = m.id
         LEFT JOIN monitor_groups mg ON m.group_id = mg.id
         WHERE m.owner_id = ? ${groupFilter}
         ORDER BY a.started_at DESC
         LIMIT 10`,
        queryParams
      );

      allAlerts.push(...recentAlerts.map(a => ({
        id: a.id,
        monitor_id: a.monitor_id,
        monitor_name: a.monitor_name,
        group_name: a.group_name,
        alert_level: a.alert_level,
        status: a.status,
        resolved_reason: a.resolved_reason,
        started_at: a.started_at,
        ended_at: a.ended_at,
        duration: a.duration,
        send_status: a.send_status,
        created_at: a.created_at,
        is_own_project: project.isOwner,
        role: project.role,
        owner_id: project.ownerId,
        owner_username: ownerInfo.username,
        owner_email: ownerInfo.email
      })));

      // Get active monitors with latest status and group info
      const monitors = await query<Monitor & { group_name: string | null }>(
        `SELECT m.*, mg.name as group_name
         FROM monitors m
         LEFT JOIN monitor_groups mg ON m.group_id = mg.id
         WHERE m.owner_id = ? AND m.status = 'active' ${groupFilter}
         ORDER BY
           CASE m.health_status
             WHEN 'critical' THEN 1
             WHEN 'warning' THEN 2
             WHEN 'normal' THEN 3
           END,
           m.last_check_at DESC`,
        queryParams
      );

      allMonitorItems.push(...monitors.map(m => ({
        id: m.id,
        name: m.name,
        url: m.url,
        health_status: m.health_status,
        last_check_at: m.last_check_at,
        last_response_time: m.last_response_time,
        group_name: m.group_name,
        is_own_project: project.isOwner,
        role: project.role,
        owner_id: project.ownerId,
        owner_username: ownerInfo.username,
        owner_email: ownerInfo.email
      })));
    }

    // Sort and limit alerts
    allAlerts.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    const recentAlerts = allAlerts.slice(0, 3);
    const totalAlerts = allAlerts.length;

    // Sort monitors by health status
    allMonitorItems.sort((a, b) => {
      const statusOrder = { critical: 1, warning: 2, normal: 3 };
      return statusOrder[a.health_status] - statusOrder[b.health_status];
    });

    // Get 24h stats from check_logs for all accessible monitors
    let totalChecks24h = 0;
    let successChecks24h = 0;

    if (allMonitorIds.length > 0) {
      // Batch query for performance
      const batchSize = 1000;
      for (let i = 0; i < allMonitorIds.length; i += batchSize) {
        const batch = allMonitorIds.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');
        const stats24h = await query<{ total_checks: number; success_checks: number }>(
          `SELECT
            COUNT(*) as total_checks,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_checks
           FROM check_logs
           WHERE monitor_id IN (${placeholders})
             AND checked_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
          batch
        );
        totalChecks24h += Number(stats24h[0]?.total_checks) || 0;
        successChecks24h += Number(stats24h[0]?.success_checks) || 0;
      }
    }

    const successRate24h = totalChecks24h > 0
      ? Math.round((successChecks24h / totalChecks24h) * 100)
      : 0;

    const summary: DashboardSummary = {
      total: totalMonitors,
      normal: normalMonitors,
      warning: warningMonitors,
      critical: criticalMonitors,
      paused: pausedMonitors
    };

    const dashboardData: DashboardData = {
      summary,
      recent_alerts: recentAlerts,
      total_alerts: totalAlerts,
      items: allMonitorItems,
      stats: {
        total_monitors: summary.total,
        active_monitors: summary.total - summary.paused,
        warning_monitors: summary.warning,
        critical_monitors: summary.critical,
        total_checks_24h: totalChecks24h,
        success_rate_24h: successRate24h,
        success_rate: successRate24h,
        avg_response_time_24h: 0
      }
    };

    success(res, dashboardData);
  } catch (err) {
    console.error('Get dashboard error:', err);
    if (err instanceof Error) {
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
    }
    error(res, '获取监控大盘数据失败');
  }
});

export default router;

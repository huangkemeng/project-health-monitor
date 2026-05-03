import { Router } from 'express';
import { query } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { success, error } from '../utils/api-response';
import type { Monitor, Alert, DashboardData, DashboardSummary, DashboardMonitorItem, AlertResponse } from '../types';

const router = Router();

// Get dashboard data
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    console.log('[Dashboard] Fetching data for user:', userId);

    // Get summary counts
    console.log('[Dashboard] Executing summary query...');
    const summaryResult = await query<DashboardSummary>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN health_status = 'normal' AND status = 'active' THEN 1 ELSE 0 END) as normal,
        SUM(CASE WHEN health_status = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN health_status = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused
       FROM monitors
       WHERE owner_id = ? AND status != 'archived'`,
      [userId]
    );
    console.log('[Dashboard] Summary result:', summaryResult);

    const summary: DashboardSummary = {
      total: Number(summaryResult[0]?.total) || 0,
      normal: Number(summaryResult[0]?.normal) || 0,
      warning: Number(summaryResult[0]?.warning) || 0,
      critical: Number(summaryResult[0]?.critical) || 0,
      paused: Number(summaryResult[0]?.paused) || 0
    };

    // Get group statistics
    console.log('[Dashboard] Executing group stats query...');
    const groupStats = await query<{ total_groups: number; monitors_with_group: number }>(
      `SELECT
        COUNT(DISTINCT mg.id) as total_groups,
        COUNT(DISTINCT m.group_id) as monitors_with_group
       FROM monitor_groups mg
       LEFT JOIN monitors m ON mg.id = m.group_id AND m.owner_id = ? AND m.status != 'archived'
       WHERE mg.owner_id = ?`,
      [userId, userId]
    );
    console.log('[Dashboard] Group stats:', groupStats);

    // Get 24h stats from check_logs
    console.log('[Dashboard] Executing 24h stats query...');
    const stats24h = await query<{ total_checks: number; success_checks: number; success_rate: number }>(
      `SELECT
        COUNT(*) as total_checks,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_checks,
        ROUND(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*) * 100, 1) as success_rate
       FROM check_logs
       WHERE monitor_id IN (SELECT id FROM monitors WHERE owner_id = ?)
         AND checked_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [userId]
    );
    console.log('[Dashboard] 24h stats:', stats24h);

    // Get recent alerts (limit 3) and total count
    console.log('[Dashboard] Executing alerts query...');
    const recentAlerts = await query<Alert & { monitor_name: string }>(
      `SELECT a.*, m.name as monitor_name
       FROM alerts a
       JOIN monitors m ON a.monitor_id = m.id
       WHERE m.owner_id = ?
       ORDER BY a.started_at DESC
       LIMIT 3`,
      [userId]
    );
    console.log('[Dashboard] Alerts result count:', recentAlerts.length);

    // Get total alerts count
    const totalAlertsResult = await query<{ total: number }>(
      `SELECT COUNT(*) as total
       FROM alerts a
       JOIN monitors m ON a.monitor_id = m.id
       WHERE m.owner_id = ?`,
      [userId]
    );
    const totalAlerts = Number(totalAlertsResult[0]?.total) || 0;

    const alertsResponse: AlertResponse[] = recentAlerts.map(a => ({
      id: a.id,
      monitor_id: a.monitor_id,
      monitor_name: a.monitor_name,
      alert_level: a.alert_level,
      status: a.status,
      started_at: a.started_at,
      ended_at: a.ended_at,
      duration: a.duration,
      send_status: a.send_status,
      created_at: a.created_at
    }));

    // Get active monitors with latest status
    console.log('[Dashboard] Executing monitors query...');
    const monitors = await query<Monitor>(
      `SELECT * FROM monitors
       WHERE owner_id = ? AND status = 'active'
       ORDER BY
         CASE health_status
           WHEN 'critical' THEN 1
           WHEN 'warning' THEN 2
           WHEN 'normal' THEN 3
         END,
         last_check_at DESC`,
      [userId]
    );
    console.log('[Dashboard] Monitors result count:', monitors.length);

    const monitorItems: DashboardMonitorItem[] = monitors.map(m => ({
      id: m.id,
      name: m.name,
      url: m.url,
      health_status: m.health_status,
      last_check_at: m.last_check_at,
      last_response_time: m.last_response_time
    }));

    // Build stats object for frontend
    const totalChecks24h = Number(stats24h[0]?.total_checks) || 0;
    const successChecks24h = Number(stats24h[0]?.success_checks) || 0;
    const successRate24h = totalChecks24h > 0 
      ? Math.round((successChecks24h / totalChecks24h) * 100) 
      : 0;

    const dashboardData: DashboardData = {
      summary,
      recent_alerts: alertsResponse,
      total_alerts: totalAlerts,
      items: monitorItems,
      stats: {
        total_monitors: summary.total,
        active_monitors: summary.total - summary.paused,
        warning_monitors: summary.warning,
        critical_monitors: summary.critical,
        total_checks_24h: totalChecks24h,
        success_rate_24h: successRate24h,
        success_rate: successRate24h,
        avg_response_time_24h: 0, // TODO: calculate if needed
        total_groups: Number(groupStats[0]?.total_groups) || 0,
        monitors_with_group: Number(groupStats[0]?.monitors_with_group) || 0
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

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

    // Get recent alerts
    console.log('[Dashboard] Executing alerts query...');
    const recentAlerts = await query<Alert & { monitor_name: string }>(
      `SELECT a.*, m.name as monitor_name
       FROM alerts a
       JOIN monitors m ON a.monitor_id = m.id
       WHERE m.owner_id = ?
       ORDER BY a.started_at DESC
       LIMIT 5`,
      [userId]
    );
    console.log('[Dashboard] Alerts result count:', recentAlerts.length);

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

    const dashboardData: DashboardData = {
      summary,
      recent_alerts: alertsResponse,
      items: monitorItems
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

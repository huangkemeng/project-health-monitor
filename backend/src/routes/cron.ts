import { Router } from 'express';
import crypto from 'crypto';
import { query, queryOne, execute } from '../lib/db';
import { success, error, unauthorized } from '../utils/api-response';
import type { Monitor, Webhook, Alert, CheckLog, AlertSilence } from '../types';

const router = Router();

// Cron secret for authentication - must be set in environment
const CRON_SECRET = process.env.CRON_SECRET;

// Validate cron secret on startup
if (!CRON_SECRET) {
  console.error('ERROR: CRON_SECRET environment variable is not set!');
  console.error('Please set a secure random string for CRON_SECRET');
  process.exit(1);
}

// Silence duration in minutes (15 minutes)
const SILENCE_DURATION_MINUTES = 15;

// Middleware to verify cron secret
function verifyCronSecret(req: any, res: any, next: any) {
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (secret !== CRON_SECRET) {
    unauthorized(res, 'Invalid cron secret');
    return;
  }
  next();
}

// Cron job execution tracking
interface CronJobLog {
  id: string;
  started_at: Date;
  ended_at: Date | null;
  status: 'running' | 'completed' | 'failed';
  total_monitors: number;
  success_count: number;
  failure_count: number;
  error_message: string | null;
}

// Note: cron_job_logs table is created by auto-migrate on server startup
// See src/lib/db/schema.ts for table definition

// Send alert notification for cron job failure
async function sendCronFailureAlert(errorMessage: string, jobLogId: string): Promise<void> {
  // Get default webhook for system alerts
  const webhook = await queryOne<Webhook>(
    'SELECT * FROM webhooks WHERE is_default = TRUE LIMIT 1'
  );

  if (!webhook) {
    console.error('No default webhook configured for cron failure alerts');
    return;
  }

  const atContent = webhook.at_users
    ? webhook.at_users.split(',').map(p => `<@${p.trim()}>`).join(' ')
    : '';

  const message = {
    msgtype: 'markdown',
    markdown: {
      content: `<font color="warning">【系统告警】Cron 任务执行失败</font>

> **任务类型**: 健康检查定时任务
> **失败原因**: ${errorMessage}
> **日志ID**: ${jobLogId}
> **时间**: ${new Date().toLocaleString('zh-CN')}

请立即检查系统状态！
${atContent}`
    }
  };

  try {
    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      console.error('Failed to send cron failure alert:', await response.text());
    }
  } catch (err) {
    console.error('Error sending cron failure alert:', err);
  }
}

// Run health checks for all active monitors
router.post('/check', verifyCronSecret, async (req, res) => {
  const jobId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    console.log(`[${jobId}] Starting health check cron job at`, new Date().toISOString());

    // Create job log entry
    await execute(
      `INSERT INTO cron_job_logs (id, status, started_at) VALUES (?, 'running', NOW())`,
      [jobId]
    );

    // Get all active monitors
    const monitors = await query<Monitor>(
      "SELECT * FROM monitors WHERE status = 'active'"
    );

    console.log(`[${jobId}] Found ${monitors.length} active monitors to check`);

    const results = {
      total: monitors.length,
      success: 0,
      failure: 0,
      alerts_triggered: 0,
      warning_alerts: 0
    };

    // Process monitors in batches to avoid timeout
    const batchSize = 10;
    for (let i = 0; i < monitors.length; i += batchSize) {
      const batch = monitors.slice(i, i + batchSize);
      await Promise.all(batch.map(async monitor => {
        try {
          const checkResult = await checkMonitor(monitor);
          if (checkResult.status === 'success') {
            results.success++;
          } else {
            results.failure++;
          }
          if (checkResult.alertTriggered) {
            if (checkResult.alertLevel === 'warning') {
              results.warning_alerts++;
            } else {
              results.alerts_triggered++;
            }
          }
        } catch (err) {
          console.error(`[${jobId}] Error checking monitor ${monitor.id}:`, err);
          results.failure++;
        }
      }));
    }

    // Clean up expired silences
    await cleanupExpiredSilences();

    // Update job log as completed
    await execute(
      `UPDATE cron_job_logs 
       SET status = 'completed', 
           ended_at = NOW(), 
           total_monitors = ?, 
           success_count = ?, 
           failure_count = ? 
       WHERE id = ?`,
      [results.total, results.success, results.failure, jobId]
    );

    const duration = Date.now() - startTime;
    console.log(`[${jobId}] Health check cron job completed in ${duration}ms:`, results);

    success(res, { ...results, job_id: jobId, duration_ms: duration });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[${jobId}] Cron check error:`, errorMessage);

    // Update job log as failed
    await execute(
      `UPDATE cron_job_logs 
       SET status = 'failed', 
           ended_at = NOW(), 
           error_message = ? 
       WHERE id = ?`,
      [errorMessage, jobId]
    );

    // Send failure alert
    await sendCronFailureAlert(errorMessage, jobId);

    error(res, 'Health check failed');
  }
});

// Check result interface
interface CheckResult {
  status: 'success' | 'failure';
  alertTriggered: boolean;
  alertLevel?: 'warning' | 'critical';
}

// Check a single monitor
async function checkMonitor(monitor: Monitor): Promise<CheckResult> {
  const startTime = Date.now();
  let status: 'success' | 'failure' = 'failure';
  let httpCode: number | null = null;
  let responseTime: number | null = null;
  let errorMsg: string | null = null;

  try {
    // Prepare request options
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), monitor.timeout * 1000);

    const fetchOptions: RequestInit = {
      method: monitor.method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'ProjectHealthMonitor/1.0',
        ...safeJsonParse(monitor.headers as unknown as string, {})
      }
    };

    if (monitor.body && ['POST', 'PUT'].includes(monitor.method)) {
      fetchOptions.body = monitor.body;
    }

    // Make request
    const response = await fetch(monitor.url, fetchOptions);
    clearTimeout(timeoutId);

    httpCode = response.status;
    responseTime = Date.now() - startTime;

    // Check if response is successful
    if (response.status === monitor.expected_status) {
      status = 'success';
    } else {
      status = 'failure';
      errorMsg = `Expected status ${monitor.expected_status}, got ${response.status}`;
    }
  } catch (err) {
    status = 'failure';
    responseTime = Date.now() - startTime;
    
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        errorMsg = `Request timeout after ${monitor.timeout}s`;
      } else {
        errorMsg = err.message;
      }
    } else {
      errorMsg = 'Unknown error';
    }
  }

  // Record check log
  await execute(
    `INSERT INTO check_logs (id, monitor_id, status, http_code, response_time, error_msg) 
     VALUES (UUID(), ?, ?, ?, ?, ?)`,
    [monitor.id, status, httpCode, responseTime, errorMsg]
  );

  // Update monitor status
  const healthStatus = await updateMonitorStatus(monitor, status, responseTime);

  // Check for alerts and handle silence mechanism
  const result: CheckResult = {
    status,
    alertTriggered: false
  };

  if (status === 'failure') {
    const alertResult = await handleMonitorFailure(monitor, errorMsg);
    result.alertTriggered = alertResult.triggered;
    result.alertLevel = alertResult.level;
  } else {
    await handleMonitorSuccess(monitor);
    
    // Check for response time warning
    if (responseTime && responseTime >= monitor.warning_threshold) {
      const warningResult = await handleResponseTimeWarning(monitor, responseTime);
      result.alertTriggered = warningResult.triggered;
      result.alertLevel = 'warning';
    }
  }

  return result;
}

// Update monitor status after check
async function updateMonitorStatus(
  monitor: Monitor, 
  status: 'success' | 'failure',
  responseTime: number | null
): Promise<'normal' | 'warning' | 'critical'> {
  const newConsecutiveFailures = status === 'success' 
    ? 0 
    : monitor.consecutive_failures + 1;

  // Determine health status
  let healthStatus: 'normal' | 'warning' | 'critical' = monitor.health_status;
  
  if (status === 'success') {
    // Check response time for warning status
    if (responseTime && responseTime >= monitor.warning_threshold) {
      healthStatus = 'warning';
    } else {
      healthStatus = 'normal';
    }
  } else if (newConsecutiveFailures >= monitor.retry_times) {
    healthStatus = 'critical';
  } else if (newConsecutiveFailures > 0) {
    healthStatus = 'warning';
  }

  await execute(
    `UPDATE monitors 
     SET consecutive_failures = ?, 
         health_status = ?, 
         last_check_at = NOW(), 
         last_response_time = ? 
     WHERE id = ?`,
    [newConsecutiveFailures, healthStatus, responseTime, monitor.id]
  );

  return healthStatus;
}

// Alert result interface
interface AlertResult {
  triggered: boolean;
  level?: 'warning' | 'critical';
}

// Handle monitor failure - check if alert should be triggered
async function handleMonitorFailure(monitor: Monitor, errorMsg: string | null): Promise<AlertResult> {
  // Check if we've reached the retry threshold
  if (monitor.consecutive_failures + 1 < monitor.retry_times) {
    return { triggered: false }; // Not enough consecutive failures yet
  }

  const alertLevel = 'critical';

  // Check if there's already an active alert for this monitor
  const existingAlert = await queryOne<Alert>(
    "SELECT * FROM alerts WHERE monitor_id = ? AND status = 'firing' AND alert_level = ?",
    [monitor.id, alertLevel]
  );

  if (existingAlert) {
    return { triggered: false, level: alertLevel }; // Alert already active
  }

  // Check silence mechanism
  const isSilenced = await checkSilenceStatus(monitor.id, alertLevel);
  if (isSilenced) {
    console.log(`Alert for monitor ${monitor.id} is silenced, skipping notification`);
    // Still create alert record but don't send notification
    await execute(
      `INSERT INTO alerts (id, monitor_id, alert_level, status, started_at, send_status) 
       VALUES (UUID(), ?, ?, 'firing', NOW(), 'silenced')`,
      [monitor.id, alertLevel]
    );
    return { triggered: true, level: alertLevel };
  }

  // Create new alert
  await execute(
    `INSERT INTO alerts (id, monitor_id, alert_level, status, started_at) 
     VALUES (UUID(), ?, ?, 'firing', NOW())`,
    [monitor.id, alertLevel]
  );

  // Send webhook notification
  await sendAlertNotification(monitor, alertLevel, errorMsg);

  // Create silence record
  await createSilenceRecord(monitor.id, alertLevel, `连续失败${monitor.retry_times}次触发告警`);

  return { triggered: true, level: alertLevel };
}

// Handle response time warning
async function handleResponseTimeWarning(monitor: Monitor, responseTime: number): Promise<AlertResult> {
  const alertLevel = 'warning';

  // Check if there's already an active warning alert for this monitor
  const existingAlert = await queryOne<Alert>(
    "SELECT * FROM alerts WHERE monitor_id = ? AND status = 'firing' AND alert_level = ?",
    [monitor.id, alertLevel]
  );

  if (existingAlert) {
    return { triggered: false, level: alertLevel }; // Warning alert already active
  }

  // Check silence mechanism
  const isSilenced = await checkSilenceStatus(monitor.id, alertLevel);
  if (isSilenced) {
    console.log(`Warning alert for monitor ${monitor.id} is silenced, skipping notification`);
    await execute(
      `INSERT INTO alerts (id, monitor_id, alert_level, status, started_at, send_status) 
       VALUES (UUID(), ?, ?, 'firing', NOW(), 'silenced')`,
      [monitor.id, alertLevel]
    );
    return { triggered: true, level: alertLevel };
  }

  // Create warning alert
  await execute(
    `INSERT INTO alerts (id, monitor_id, alert_level, status, started_at) 
     VALUES (UUID(), ?, ?, 'firing', NOW())`,
    [monitor.id, alertLevel]
  );

  // Send webhook notification
  await sendAlertNotification(monitor, alertLevel, `响应时间 ${responseTime}ms 超过阈值 ${monitor.warning_threshold}ms`);

  // Create silence record
  await createSilenceRecord(monitor.id, alertLevel, `响应时间超过阈值${monitor.warning_threshold}ms`);

  return { triggered: true, level: alertLevel };
}

// Check if alert is silenced
async function checkSilenceStatus(monitorId: string, alertLevel: string): Promise<boolean> {
  const silence = await queryOne<AlertSilence>(
    `SELECT * FROM alert_silences 
     WHERE monitor_id = ? 
     AND alert_level = ? 
     AND expires_at > NOW()
     ORDER BY expires_at DESC 
     LIMIT 1`,
    [monitorId, alertLevel]
  );
  
  return !!silence;
}

// Create silence record
async function createSilenceRecord(monitorId: string, alertLevel: string, reason: string): Promise<void> {
  await execute(
    `INSERT INTO alert_silences (id, monitor_id, alert_level, reason, silenced_at, expires_at) 
     VALUES (UUID(), ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [monitorId, alertLevel, reason, SILENCE_DURATION_MINUTES]
  );
}

// Clean up expired silence records
async function cleanupExpiredSilences(): Promise<void> {
  await execute(
    `DELETE FROM alert_silences WHERE expires_at < NOW()`
  );
}

// Handle monitor success - check if alert should be resolved
async function handleMonitorSuccess(monitor: Monitor): Promise<void> {
  // Check if there's an active alert for this monitor
  const existingAlert = await queryOne<Alert>(
    "SELECT * FROM alerts WHERE monitor_id = ? AND status = 'firing'",
    [monitor.id]
  );

  if (!existingAlert) {
    return; // No active alert to resolve
  }

  // Only resolve critical alerts (warning alerts for response time may persist)
  if (existingAlert.alert_level === 'warning') {
    // Check if response time is now normal
    const recentCheck = await queryOne<CheckLog>(
      `SELECT * FROM check_logs 
       WHERE monitor_id = ? 
       AND status = 'success'
       ORDER BY checked_at DESC 
       LIMIT 1`,
      [monitor.id]
    );
    
    if (recentCheck && recentCheck.response_time && recentCheck.response_time < monitor.warning_threshold) {
      // Response time is back to normal, resolve the warning
      await resolveAlert(existingAlert, monitor);
    }
    return;
  }

  // Resolve critical alert
  await resolveAlert(existingAlert, monitor);
}

// Resolve an alert
async function resolveAlert(alert: Alert, monitor: Monitor): Promise<void> {
  const duration = Math.floor((Date.now() - new Date(alert.started_at).getTime()) / 1000);
  
  await execute(
    `UPDATE alerts 
     SET status = 'resolved', ended_at = NOW(), duration = ? 
     WHERE id = ?`,
    [duration, alert.id]
  );

  // Send recovery notification
  await sendRecoveryNotification(monitor, alert, duration);
}

// Send alert notification via webhook
async function sendAlertNotification(
  monitor: Monitor, 
  alertLevel: string,
  errorMsg: string | null
): Promise<void> {
  if (!monitor.webhook_id) {
    return;
  }

  const webhook = await queryOne<Webhook>(
    'SELECT * FROM webhooks WHERE id = ?',
    [monitor.webhook_id]
  );

  if (!webhook) {
    return;
  }

  const atContent = webhook.at_users 
    ? webhook.at_users.split(',').map(p => `<@${p.trim()}>`).join(' ')
    : '';

  const levelText = alertLevel === 'critical' ? '严重' : '警告';
  const colorCode = alertLevel === 'critical' ? 'warning' : 'info';

  const message = {
    msgtype: 'markdown',
    markdown: {
      content: `<font color="${colorCode}">【告警】${monitor.name}</font>
      
> **监控项**: ${monitor.name}
> **URL**: ${monitor.url}
> **级别**: <font color="${colorCode}">${levelText}</font>
> **错误**: ${errorMsg || '服务异常'}
> **时间**: ${new Date().toLocaleString('zh-CN')}
> **连续失败**: ${monitor.consecutive_failures + 1} 次

${atContent}`
    }
  };

  try {
    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (response.ok) {
      // Update alert send status
      await execute(
        "UPDATE alerts SET send_status = 'sent' WHERE monitor_id = ? AND status = 'firing'",
        [monitor.id]
      );
    } else {
      const errorText = await response.text();
      await execute(
        "UPDATE alerts SET send_status = 'failed', send_error = ? WHERE monitor_id = ? AND status = 'firing'",
        [errorText, monitor.id]
      );
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    await execute(
      "UPDATE alerts SET send_status = 'failed', send_error = ? WHERE monitor_id = ? AND status = 'firing'",
      [errorMsg, monitor.id]
    );
  }
}

// Send recovery notification via webhook
async function sendRecoveryNotification(
  monitor: Monitor,
  alert: Alert,
  duration: number
): Promise<void> {
  if (!monitor.webhook_id) {
    return;
  }

  const webhook = await queryOne<Webhook>(
    'SELECT * FROM webhooks WHERE id = ?',
    [monitor.webhook_id]
  );

  if (!webhook) {
    return;
  }

  const atContent = webhook.at_users 
    ? webhook.at_users.split(',').map(p => `<@${p.trim()}>`).join(' ')
    : '';

  const durationText = formatDuration(duration);
  const alertLevelText = alert.alert_level === 'critical' ? '严重告警' : '警告';

  const message = {
    msgtype: 'markdown',
    markdown: {
      content: `<font color="info">【恢复】${monitor.name}</font>
      
> **监控项**: ${monitor.name}
> **URL**: ${monitor.url}
> **原${alertLevelText}**: <font color="info">已恢复</font>
> **持续时间**: ${durationText}
> **恢复时间**: ${new Date().toLocaleString('zh-CN')}

${atContent}`
    }
  };

  try {
    await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch (err) {
    console.error('Failed to send recovery notification:', err);
  }
}

// Format duration in human readable format
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${mins}分`;
  }
}

// Safe JSON parse helper
function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

export default router;

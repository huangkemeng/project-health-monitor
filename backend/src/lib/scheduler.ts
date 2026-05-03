import cron from 'node-cron';
import { query, queryOne, execute } from './db';
import type { Monitor, Webhook, Alert, Group } from '../types';

// Cron secret from environment
const CRON_SECRET = process.env.CRON_SECRET || '';

// Silence duration in minutes (15 minutes)
const SILENCE_DURATION_MINUTES = 15;

// Safe JSON parse helper
function safeJsonParse(json: string, defaultValue: Record<string, string> = {}): Record<string, string> {
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return defaultValue;
  }
}

// Check result interface
interface CheckResult {
  status: 'success' | 'failure';
  alertTriggered: boolean;
  alertLevel?: 'warning' | 'critical';
}

// Send alert notification for cron job failure
async function sendCronFailureAlert(errorMessage: string, jobLogId: string): Promise<void> {
  const webhook = await queryOne<Webhook>(
    'SELECT * FROM webhooks WHERE is_default = TRUE LIMIT 1'
  );

  if (!webhook) {
    console.error('[Scheduler] No default webhook configured for cron failure alerts');
    return;
  }

  // Parse at_users - support both individual users and @all
  const atUsersList = webhook.at_users ? webhook.at_users.split(',').map(p => p.trim()) : [];
  const hasAll = atUsersList.some(u => u.toLowerCase() === 'all');
  const individualUsers = atUsersList.filter(u => u.toLowerCase() !== 'all');

  // Build mentioned_list for WeChat Work (supports @all and userids)
  const mentionedList: string[] = [];
  if (hasAll) {
    mentionedList.push('@all');
  }
  mentionedList.push(...individualUsers);

  // For Feishu/Lark: <@userid> format in markdown
  const atContent = individualUsers.length > 0
    ? individualUsers.map(p => `<@${p}>`).join(' ')
    : '';

  // Use markdown for all platforms (supports color and @mentions)
  const message = {
    msgtype: 'markdown',
    markdown: {
      content: `<font color="warning">【系统告警】定时任务执行失败</font>

> **任务类型**: 健康检查定时任务
> **失败原因**: ${errorMessage}
> **日志ID**: ${jobLogId}
> **时间**: ${new Date().toLocaleString('zh-CN')}

请立即检查系统状态！
${atContent}`
    },
    // WeChat Work specific: mentioned_list for @all and userids
    ...(mentionedList.length > 0 && {
      mentioned_list: mentionedList
    })
  };

  try {
    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      console.error('[Scheduler] Failed to send cron failure alert:', await response.text());
    }
  } catch (err) {
    console.error('[Scheduler] Error sending cron failure alert:', err);
  }
}

// Check a single monitor
async function checkMonitor(monitor: Monitor): Promise<CheckResult> {
  const startTime = Date.now();
  let status: 'success' | 'failure' = 'failure';
  let httpCode: number | null = null;
  let responseTime: number | null = null;
  let errorMsg: string | null = null;

  try {
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

    if (monitor.body && ['POST', 'PUT', 'PATCH'].includes(monitor.method)) {
      fetchOptions.body = monitor.body;
    }

    const response = await fetch(monitor.url, fetchOptions);
    clearTimeout(timeoutId);

    httpCode = response.status;
    responseTime = Date.now() - startTime;

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

  // Calculate new consecutive failures before updating
  const newConsecutiveFailures = status === 'success' 
    ? 0 
    : monitor.consecutive_failures + 1;

  // Update monitor status
  await updateMonitorStatus(monitor, status, responseTime, newConsecutiveFailures);

  // Check for alerts
  const result: CheckResult = {
    status,
    alertTriggered: false
  };

  if (status === 'failure') {
    const alertResult = await handleMonitorFailure(monitor, errorMsg, newConsecutiveFailures);
    result.alertTriggered = alertResult.triggered;
    result.alertLevel = alertResult.level;
  } else {
    await handleMonitorSuccess(monitor);
    
    if (responseTime && responseTime >= monitor.warning_threshold) {
      const warningResult = await handleResponseTimeWarning(monitor, responseTime);
      result.alertTriggered = warningResult.triggered;
      result.alertLevel = 'warning';
    }
  }

  return result;
}

// Update monitor status
async function updateMonitorStatus(
  monitor: Monitor,
  status: 'success' | 'failure',
  responseTime: number | null,
  newConsecutiveFailures: number
): Promise<void> {
  let healthStatus: 'normal' | 'warning' | 'critical' = 'normal';

  if (status === 'success') {
    if (responseTime && responseTime >= monitor.warning_threshold) {
      healthStatus = 'warning';
    }
  } else {
    if (newConsecutiveFailures >= monitor.retry_times) {
      healthStatus = 'critical';
    } else if (newConsecutiveFailures >= 1) {
      healthStatus = 'warning';
    }
  }

  await execute(
    `UPDATE monitors 
     SET last_check_at = NOW(), 
         consecutive_failures = ?,
         health_status = ?,
         last_response_time = ?
     WHERE id = ?`,
    [newConsecutiveFailures, healthStatus, responseTime, monitor.id]
  );
}

// Handle monitor failure
async function handleMonitorFailure(
  monitor: Monitor,
  errorMsg: string | null,
  consecutiveFailures: number
): Promise<{ triggered: boolean; level: 'warning' | 'critical' }> {
  const alertLevel = consecutiveFailures >= monitor.retry_times ? 'critical' : 'warning';

  // Check if there's an active silence
  const activeSilence = await queryOne(
    `SELECT * FROM alert_silences 
     WHERE monitor_id = ? AND expires_at > NOW()`,
    [monitor.id]
  );

  if (activeSilence) {
    console.log(`[Scheduler] Alert suppressed for monitor ${monitor.id} due to active silence`);
    return { triggered: false, level: alertLevel };
  }

  // Check if there's already an active alert
  const existingAlert = await queryOne<Alert>(
    `SELECT * FROM alerts 
     WHERE monitor_id = ? AND status = 'firing'`,
    [monitor.id]
  );

  if (!existingAlert) {
    // Create new alert
    await execute(
      `INSERT INTO alerts (id, monitor_id, alert_level, status, started_at) 
       VALUES (UUID(), ?, ?, 'firing', NOW())`,
      [monitor.id, alertLevel]
    );

    // Send webhook notification
    await sendAlertNotification(monitor, alertLevel, errorMsg || 'Monitor check failed');

    return { triggered: true, level: alertLevel };
  }

  // Check if alert level should be upgraded (warning -> critical)
  if (existingAlert.alert_level === 'warning' && alertLevel === 'critical') {
    // Upgrade existing alert to critical
    await execute(
      `UPDATE alerts 
       SET alert_level = 'critical' 
       WHERE id = ?`,
      [existingAlert.id]
    );

    // Send webhook notification for critical alert
    await sendAlertNotification(monitor, 'critical', errorMsg || 'Monitor check failed (upgraded to critical)');

    return { triggered: true, level: 'critical' };
  }

  return { triggered: false, level: alertLevel };
}

// Handle monitor success
async function handleMonitorSuccess(monitor: Monitor): Promise<void> {
  // Check if there's an active alert to resolve
  const activeAlert = await queryOne<Alert>(
    `SELECT * FROM alerts 
     WHERE monitor_id = ? AND status = 'firing'`,
    [monitor.id]
  );

  if (activeAlert) {
    // Resolve the alert with reason 'recovered'
    await execute(
      `UPDATE alerts 
       SET status = 'resolved', resolved_reason = 'recovered', ended_at = NOW() 
       WHERE id = ?`,
      [activeAlert.id]
    );

    // Send recovery notification
    await sendRecoveryNotification(monitor);
  }
}

// Handle response time warning
async function handleResponseTimeWarning(
  monitor: Monitor, 
  responseTime: number
): Promise<{ triggered: boolean }> {
  // Check if there's already an active warning for this monitor
  const existingAlert = await queryOne(
    `SELECT * FROM alerts 
     WHERE monitor_id = ? AND status = 'firing' AND alert_level = 'warning'`,
    [monitor.id]
  );

  if (!existingAlert) {
    const message = `Response time (${responseTime}ms) exceeded warning threshold (${monitor.warning_threshold}ms)`;
    
    await execute(
      `INSERT INTO alerts (id, monitor_id, alert_level, status, started_at) 
       VALUES (UUID(), ?, 'warning', 'firing', NOW())`,
      [monitor.id]
    );

    await sendAlertNotification(monitor, 'warning', message);
    return { triggered: true };
  }

  return { triggered: false };
}

// Send alert notification
async function sendAlertNotification(
  monitor: Monitor,
  level: 'warning' | 'critical',
  message: string
): Promise<void> {
  const webhook = monitor.webhook_id
    ? await queryOne<Webhook>('SELECT * FROM webhooks WHERE id = ?', [monitor.webhook_id])
    : await queryOne<Webhook>('SELECT * FROM webhooks WHERE is_default = TRUE LIMIT 1');

  if (!webhook) {
    console.log(`[Scheduler] No webhook configured for monitor ${monitor.id}`);
    return;
  }

  // Get group name if monitor belongs to a group
  let groupName = '未分组';
  if (monitor.group_id) {
    const group = await queryOne<Group>('SELECT name FROM monitor_groups WHERE id = ?', [monitor.group_id]);
    if (group) {
      groupName = group.name;
    }
  }

  const color = level === 'critical' ? 'red' : 'warning';

  // Parse at_users - support both individual users and @all
  const atUsersList = webhook.at_users ? webhook.at_users.split(',').map(p => p.trim()) : [];
  const hasAll = atUsersList.some(u => u.toLowerCase() === 'all');
  const individualUsers = atUsersList.filter(u => u.toLowerCase() !== 'all');

  // Build mentioned_list for WeChat Work (supports @all and userids)
  const mentionedList: string[] = [];
  if (hasAll) {
    mentionedList.push('@all');
  }
  mentionedList.push(...individualUsers);

  // For Feishu/Lark: <@userid> format in markdown
  const atContent = individualUsers.length > 0
    ? individualUsers.map(p => `<@${p}>`).join(' ')
    : '';

  // Use markdown for all platforms (supports color and @mentions)
  const alertMessage = {
    msgtype: 'markdown',
    markdown: {
      content: `<font color="${color}">【${level === 'critical' ? '严重告警' : '警告'}】${monitor.name}</font>

> **监控项**: ${monitor.name}
> **所属分组**: ${groupName}
> **告警级别**: ${level === 'critical' ? '严重' : '警告'}
> **详细信息**: ${message}
> **时间**: ${new Date().toLocaleString('zh-CN')}
> **URL**: ${monitor.url}

请尽快检查！
${atContent}`
    },
    // WeChat Work specific: mentioned_list for @all and userids
    ...(mentionedList.length > 0 && {
      mentioned_list: mentionedList
    })
  };

  try {
    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertMessage)
    });

    if (!response.ok) {
      console.error(`[Scheduler] Failed to send alert for monitor ${monitor.id}:`, await response.text());
    }
  } catch (err) {
    console.error(`[Scheduler] Error sending alert for monitor ${monitor.id}:`, err);
  }
}

// Send recovery notification
async function sendRecoveryNotification(monitor: Monitor): Promise<void> {
  const webhook = monitor.webhook_id
    ? await queryOne<Webhook>('SELECT * FROM webhooks WHERE id = ?', [monitor.webhook_id])
    : await queryOne<Webhook>('SELECT * FROM webhooks WHERE is_default = TRUE LIMIT 1');

  if (!webhook) return;

  // Get group name if monitor belongs to a group
  let groupName = '未分组';
  if (monitor.group_id) {
    const group = await queryOne<Group>('SELECT name FROM monitor_groups WHERE id = ?', [monitor.group_id]);
    if (group) {
      groupName = group.name;
    }
  }

  // Parse at_users - support both individual users and @all
  const atUsersList = webhook.at_users ? webhook.at_users.split(',').map(p => p.trim()) : [];
  const hasAll = atUsersList.some(u => u.toLowerCase() === 'all');
  const individualUsers = atUsersList.filter(u => u.toLowerCase() !== 'all');

  // Build mentioned_list for WeChat Work (supports @all and userids)
  const mentionedList: string[] = [];
  if (hasAll) {
    mentionedList.push('@all');
  }
  mentionedList.push(...individualUsers);

  // For Feishu/Lark: <@userid> format in markdown
  const atContent = individualUsers.length > 0
    ? individualUsers.map(p => `<@${p}>`).join(' ')
    : '';

  // Use markdown for all platforms (supports color and @mentions)
  const recoveryMessage = {
    msgtype: 'markdown',
    markdown: {
      content: `<font color="info">【恢复通知】${monitor.name}</font>

> **监控项**: ${monitor.name}
> **所属分组**: ${groupName}
> **状态**: 已恢复正常
> **时间**: ${new Date().toLocaleString('zh-CN')}
> **URL**: ${monitor.url}

服务已恢复正常！
${atContent}`
    },
    // WeChat Work specific: mentioned_list for @all and userids
    ...(mentionedList.length > 0 && {
      mentioned_list: mentionedList
    })
  };

  try {
    await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recoveryMessage)
    });
  } catch (err) {
    console.error(`[Scheduler] Error sending recovery notification:`, err);
  }
}

// Clean up expired silences
async function cleanupExpiredSilences(): Promise<void> {
  await execute(
    `DELETE FROM alert_silences 
     WHERE expires_at <= NOW()`
  );
}

// Run health checks for all active monitors
async function runHealthChecks(): Promise<void> {
  const jobId = `scheduler-${Date.now()}`;
  const startTime = Date.now();

  try {
    console.log(`[${jobId}] Starting scheduled health check at`, new Date().toISOString());

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

    // Process monitors in batches
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

    const duration = Date.now() - startTime;
    console.log(`[${jobId}] Health check completed in ${duration}ms:`, results);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[${jobId}] Scheduled health check error:`, errorMessage);
    await sendCronFailureAlert(errorMessage, jobId);
  }
}

// Scheduler instance
let scheduledTask: cron.ScheduledTask | null = null;

// Start the scheduler
export function startScheduler(): void {
  if (scheduledTask) {
    console.log('[Scheduler] Already running');
    return;
  }

  // Run every minute
  scheduledTask = cron.schedule('* * * * *', async () => {
    await runHealthChecks();
  });

  console.log('[Scheduler] Health check scheduler started - running every minute');
  
  // Run immediately on startup
  runHealthChecks().catch(err => {
    console.error('[Scheduler] Initial health check failed:', err);
  });
}

// Stop the scheduler
export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Scheduler] Health check scheduler stopped');
  }
}

// Get scheduler status
export function isSchedulerRunning(): boolean {
  return scheduledTask !== null;
}

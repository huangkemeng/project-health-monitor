import { Router, Request, Response } from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { success, error, created, validationError, notFound } from '../utils/api-response';
import { isValidUrl, isValidHttpMethod, safeJsonParse, sanitizeString } from '../utils/validators';
import type { Monitor, MonitorResponse, Webhook, CheckLog, MonitorStats, HttpMethod } from '../types';

const router = Router();

// Get all monitors for current user
router.get(
  '/',
  authenticate,
  [
    queryValidator('page').optional().isInt({ min: 1 }),
    queryValidator('page_size').optional().isInt({ min: 1, max: 100 }),
    queryValidator('status').optional().isIn(['active', 'paused', 'archived']),
    queryValidator('health_status').optional().isIn(['normal', 'warning', 'critical']),
    queryValidator('keyword').optional().trim()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;
      const status = req.query.status as string;
      const healthStatus = req.query.health_status as string;
      const keyword = req.query.keyword as string;

      const offset = (page - 1) * pageSize;

      // Build query conditions
      const conditions: string[] = ['m.owner_id = ?'];
      const values: (string | number)[] = [req.user!.userId];

      if (status) {
        conditions.push('m.status = ?');
        values.push(status);
      }

      if (healthStatus) {
        conditions.push('m.health_status = ?');
        values.push(healthStatus);
      }

      if (keyword) {
        conditions.push('(m.name LIKE ? OR m.url LIKE ?)');
        values.push(`%${keyword}%`, `%${keyword}%`);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await queryOne<{ total: number }>(
        `SELECT COUNT(*) as total FROM monitors m WHERE ${whereClause}`,
        values
      );
      const total = countResult?.total || 0;

      // Get monitors
      const monitors = await query<Monitor>(
        `SELECT m.*, w.name as webhook_name
         FROM monitors m
         LEFT JOIN webhooks w ON m.webhook_id = w.id
         WHERE ${whereClause}
         ORDER BY m.created_at DESC
         LIMIT ? OFFSET ?`,
        [...values, pageSize, offset]
      );

      success(res, {
        items: monitors,
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: Math.ceil(total / pageSize)
        }
      });
    } catch (err) {
      console.error('Get monitors error:', err);
      error(res, '获取监控列表失败', 500);
    }
  }
);

// Get monitor by ID
router.get(
  '/:id',
  authenticate,
  [
    param('id').isUUID()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { id } = req.params;
      const userId = req.user!.userId;

      const monitor = await queryOne<Monitor & { webhook_name?: string; webhook_url?: string; at_users?: string | null; is_default?: boolean; webhook_created_at?: Date; webhook_updated_at?: Date }>(
        `SELECT m.*,
                w.name as webhook_name, w.webhook_url, w.at_users, w.is_default,
                w.created_at as webhook_created_at, w.updated_at as webhook_updated_at
         FROM monitors m
         LEFT JOIN webhooks w ON m.webhook_id = w.id
         WHERE m.id = ? AND m.owner_id = ?`,
        [id, userId]
      );

      if (!monitor) {
        notFound(res, '监控项不存在');
        return;
      }

      // Get 24h stats
      const stats = await queryOne<MonitorStats>(
        `SELECT
          COUNT(*) as total_checks,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_checks,
          SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failed_checks,
          ROUND(AVG(CASE WHEN status = 'success' THEN response_time END), 0) as avg_response_time
         FROM check_logs
         WHERE monitor_id = ? AND checked_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
        [id]
      );

      const totalChecks = stats?.total_checks || 0;
      const successChecks = stats?.success_checks || 0;

      const monitorResponse: MonitorResponse = {
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
        method: monitor.method,
        headers: monitor.headers,
        body: monitor.body,
        interval: monitor.interval,
        timeout: monitor.timeout,
        expected_status: monitor.expected_status,
        retry_times: monitor.retry_times,
        warning_threshold: monitor.warning_threshold,
        status: monitor.status,
        health_status: monitor.health_status,
        consecutive_failures: monitor.consecutive_failures,
        last_check_at: monitor.last_check_at,
        last_response_time: monitor.last_response_time,
        webhook_id: monitor.webhook_id,
        created_at: monitor.created_at,
        updated_at: monitor.updated_at,
        webhook: monitor.webhook_id ? {
          id: monitor.webhook_id,
          name: monitor.webhook_name || '',
          webhook_url: monitor.webhook_url || '',
          at_users: monitor.at_users ?? null,
          is_default: monitor.is_default || false,
          created_at: monitor.webhook_created_at || new Date(),
          updated_at: monitor.webhook_updated_at || new Date()
        } : undefined,
        stats: {
          total_checks: totalChecks,
          success_checks: successChecks,
          failed_checks: stats?.failed_checks || 0,
          success_rate: totalChecks > 0 ? Math.round((successChecks / totalChecks) * 100) : 100,
          avg_response_time: stats?.avg_response_time || 0
        }
      };

      success(res, monitorResponse);
    } catch (err) {
      console.error('Get monitor error:', err);
      error(res, '获取监控项失败', 500);
    }
  }
);

// Create monitor
router.post(
  '/',
  authenticate,
  [
    body('name').trim().isLength({ min: 1, max: 50 }),
    body('url').isURL(),
    body('method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE']),
    body('interval').optional().isInt({ min: 30, max: 300 }),
    body('timeout').optional().isInt({ min: 5, max: 60 }),
    body('expected_status').optional().isInt({ min: 100, max: 599 }),
    body('retry_times').optional().isInt({ min: 1, max: 10 }),
    body('warning_threshold').optional().isInt({ min: 1000, max: 30000 })
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const {
        name,
        url,
        method = 'GET',
        headers = {},
        body = null,
        interval = 60,
        timeout = 10,
        expected_status = 200,
        retry_times = 5,
        warning_threshold = 3000,
        webhook_id
      } = req.body;

      // Validate URL format
      if (!isValidUrl(url)) {
        validationError(res, [{ field: 'url', message: 'URL 格式不正确' }]);
        return;
      }

      // Validate HTTP method
      if (!isValidHttpMethod(method)) {
        validationError(res, [{ field: 'method', message: '不支持的 HTTP 方法' }]);
        return;
      }

      // Validate webhook_id if provided
      if (webhook_id) {
        const webhook = await queryOne<Webhook>(
          'SELECT * FROM webhooks WHERE id = ? AND owner_id = ?',
          [webhook_id, req.user!.userId]
        );
        if (!webhook) {
          validationError(res, [{ field: 'webhook_id', message: 'Webhook 不存在' }]);
          return;
        }
      }

      const monitorId = uuidv4();
      await execute(
        `INSERT INTO monitors (
          id, owner_id, name, url, method, headers, body,
          interval, timeout, expected_status, retry_times, warning_threshold,
          status, health_status, consecutive_failures, webhook_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'normal', 0, ?, NOW(), NOW())`,
        [
          monitorId,
          req.user!.userId,
          sanitizeString(name),
          url,
          method,
          JSON.stringify(headers),
          body,
          interval,
          timeout,
          expected_status,
          retry_times,
          warning_threshold,
          webhook_id || null
        ]
      );

      const monitor = await queryOne<Monitor>('SELECT * FROM monitors WHERE id = ?', [monitorId]);
      created(res, monitor);
    } catch (err) {
      console.error('Create monitor error:', err);
      error(res, '创建监控项失败', 500);
    }
  }
);

// Update monitor
router.put(
  '/:id',
  authenticate,
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 1, max: 50 }),
    body('url').optional().isURL(),
    body('method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE']),
    body('interval').optional().isInt({ min: 30, max: 300 }),
    body('timeout').optional().isInt({ min: 5, max: 60 }),
    body('expected_status').optional().isInt({ min: 100, max: 599 }),
    body('retry_times').optional().isInt({ min: 1, max: 10 }),
    body('warning_threshold').optional().isInt({ min: 1000, max: 30000 })
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { id } = req.params;
      const userId = req.user!.userId;

      // Check if monitor exists and belongs to user
      const existingMonitor = await queryOne<Monitor>(
        'SELECT * FROM monitors WHERE id = ? AND owner_id = ?',
        [id, userId]
      );

      if (!existingMonitor) {
        notFound(res, '监控项不存在');
        return;
      }

      const {
        name,
        url,
        method,
        headers,
        body,
        interval,
        timeout,
        expected_status,
        retry_times,
        warning_threshold,
        webhook_id
      } = req.body;

      // Validate URL if provided
      if (url && !isValidUrl(url)) {
        validationError(res, [{ field: 'url', message: 'URL 格式不正确' }]);
        return;
      }

      // Validate HTTP method if provided
      if (method && !isValidHttpMethod(method)) {
        validationError(res, [{ field: 'method', message: '不支持的 HTTP 方法' }]);
        return;
      }

      // Validate webhook_id if provided
      if (webhook_id) {
        const webhook = await queryOne<Webhook>(
          'SELECT * FROM webhooks WHERE id = ? AND owner_id = ?',
          [webhook_id, userId]
        );
        if (!webhook) {
          validationError(res, [{ field: 'webhook_id', message: 'Webhook 不存在' }]);
          return;
        }
      }

      // Build update query
      const updates: string[] = ['updated_at = NOW()'];
      const values: (string | number | null)[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(sanitizeString(name));
      }
      if (url !== undefined) {
        updates.push('url = ?');
        values.push(url);
      }
      if (method !== undefined) {
        updates.push('method = ?');
        values.push(method);
      }
      if (headers !== undefined) {
        updates.push('headers = ?');
        values.push(JSON.stringify(headers));
      }
      if (body !== undefined) {
        updates.push('body = ?');
        values.push(body);
      }
      if (interval !== undefined) {
        updates.push('interval = ?');
        values.push(interval);
      }
      if (timeout !== undefined) {
        updates.push('timeout = ?');
        values.push(timeout);
      }
      if (expected_status !== undefined) {
        updates.push('expected_status = ?');
        values.push(expected_status);
      }
      if (retry_times !== undefined) {
        updates.push('retry_times = ?');
        values.push(retry_times);
      }
      if (warning_threshold !== undefined) {
        updates.push('warning_threshold = ?');
        values.push(warning_threshold);
      }
      if (webhook_id !== undefined) {
        updates.push('webhook_id = ?');
        values.push(webhook_id || null);
      }

      values.push(id);
      values.push(userId);

      await execute(
        `UPDATE monitors SET ${updates.join(', ')} WHERE id = ? AND owner_id = ?`,
        values
      );

      const monitor = await queryOne<Monitor>('SELECT * FROM monitors WHERE id = ?', [id]);
      success(res, monitor);
    } catch (err) {
      console.error('Update monitor error:', err);
      error(res, '更新监控项失败', 500);
    }
  }
);

// Delete monitor
router.delete(
  '/:id',
  authenticate,
  [
    param('id').isUUID()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { id } = req.params;
      const userId = req.user!.userId;

      // Check if monitor exists and belongs to user
      const existingMonitor = await queryOne<Monitor>(
        'SELECT * FROM monitors WHERE id = ? AND owner_id = ?',
        [id, userId]
      );

      if (!existingMonitor) {
        notFound(res, '监控项不存在');
        return;
      }

      // Delete related records first
      await execute('DELETE FROM check_logs WHERE monitor_id = ?', [id]);
      await execute('DELETE FROM alerts WHERE monitor_id = ?', [id]);

      // Delete monitor
      await execute('DELETE FROM monitors WHERE id = ? AND owner_id = ?', [id, userId]);

      success(res, { message: '监控项已删除' });
    } catch (err) {
      console.error('Delete monitor error:', err);
      error(res, '删除监控项失败', 500);
    }
  }
);

// Pause monitor
router.post(
  '/:id/pause',
  authenticate,
  [
    param('id').isUUID()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { id } = req.params;
      const userId = req.user!.userId;

      const monitor = await queryOne<Monitor>(
        'SELECT * FROM monitors WHERE id = ? AND owner_id = ?',
        [id, userId]
      );

      if (!monitor) {
        notFound(res, '监控项不存在');
        return;
      }

      await execute(
        "UPDATE monitors SET status = 'paused', updated_at = NOW() WHERE id = ?",
        [id]
      );

      success(res, { message: '监控已暂停' });
    } catch (err) {
      console.error('Pause monitor error:', err);
      error(res, '暂停监控失败', 500);
    }
  }
);

// Resume monitor
router.post(
  '/:id/resume',
  authenticate,
  [
    param('id').isUUID()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const { id } = req.params;
      const userId = req.user!.userId;

      const monitor = await queryOne<Monitor>(
        'SELECT * FROM monitors WHERE id = ? AND owner_id = ?',
        [id, userId]
      );

      if (!monitor) {
        notFound(res, '监控项不存在');
        return;
      }

      await execute(
        "UPDATE monitors SET status = 'active', updated_at = NOW() WHERE id = ?",
        [id]
      );

      success(res, { message: '监控已恢复' });
    } catch (err) {
      console.error('Resume monitor error:', err);
      error(res, '恢复监控失败', 500);
    }
  }
);

export default router;

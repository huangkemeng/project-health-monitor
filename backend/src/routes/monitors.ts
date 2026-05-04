import { Router, Request, Response } from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { projectContext, checkProjectPermission, requireRole } from '../middleware/permission';
import { success, error, created, validationError, notFound, forbidden } from '../utils/api-response';
import { buildGroupFilter, canAccessMonitor } from '../utils/data-isolation';
import { isValidUrl, isValidHttpMethod, safeJsonParse, sanitizeString, sanitizeSearchKeyword } from '../utils/validators';
import type { Monitor, MonitorResponse, Webhook, CheckLog, MonitorStats, HttpMethod, Alert } from '../types';

const router = Router();

// Get all monitors for current user (all accessible projects)
router.get(
  '/',
  authenticate,
  [
    queryValidator('page').optional().isInt({ min: 1 }),
    queryValidator('page_size').optional().isInt({ min: 1, max: 100 }),
    queryValidator('status').optional().custom((value) => {
      if (value === '' || ['active', 'paused', 'archived'].includes(value)) {
        return true;
      }
      throw new Error('Invalid value');
    }),
    queryValidator('health_status').optional().custom((value) => {
      if (value === '' || ['normal', 'warning', 'critical'].includes(value)) {
        return true;
      }
      throw new Error('Invalid value');
    }),
    queryValidator('group_id').optional().trim(),
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
      const groupId = req.query.group_id as string;
      const keyword = req.query.keyword as string;

      const offset = (page - 1) * pageSize;

      const userId = req.user!.userId;
      const userEmail = req.user!.email;

      // Get all accessible projects
      const { getAccessibleProjects } = await import('../services/collaboration');
      const accessibleProjects = await getAccessibleProjects(userId, userEmail);

      // Collect monitors from all accessible projects
      const allMonitors: any[] = [];

      for (const project of accessibleProjects) {
        // Build query conditions for this project
        const conditions: string[] = ['m.owner_id = ?'];
        const values: (string | number)[] = [project.ownerId];

        // Apply group filter for collaborators
        if (!project.isOwner && project.accessibleGroupIds !== null) {
          if (project.accessibleGroupIds.length === 0) {
            conditions.push('m.group_id IS NULL');
          } else {
            const placeholders = project.accessibleGroupIds.map(() => '?').join(',');
            conditions.push(`(m.group_id IS NULL OR m.group_id IN (${placeholders}))`);
            values.push(...project.accessibleGroupIds);
          }
        }

        if (status) {
          conditions.push('m.status = ?');
          values.push(status);
        }

        if (healthStatus) {
          conditions.push('m.health_status = ?');
          values.push(healthStatus);
        }

        if (groupId) {
          // Check if collaborator has access to this group
          if (!project.isOwner && project.accessibleGroupIds !== null) {
            if (!project.accessibleGroupIds.includes(groupId)) {
              continue; // Skip this project
            }
          }
          conditions.push('m.group_id = ?');
          values.push(groupId);
        }

        if (keyword) {
          const sanitizedKeyword = sanitizeSearchKeyword(keyword);
          if (sanitizedKeyword) {
            conditions.push('(m.name LIKE ? OR m.url LIKE ?)');
            values.push(`%${sanitizedKeyword}%`, `%${sanitizedKeyword}%`);
          }
        }

        const whereClause = conditions.join(' AND ');

        // Get monitors for this project
        const monitors = await query<Monitor>(
          `SELECT m.*, w.name as webhook_name, g.name as group_name, g.color as group_color
           FROM monitors m
           LEFT JOIN webhooks w ON m.webhook_id = w.id
           LEFT JOIN monitor_groups g ON m.group_id = g.id
           WHERE ${whereClause}
           ORDER BY m.created_at DESC`,
          values
        );

        // Add permission info to each monitor
        allMonitors.push(...monitors.map(m => ({
          ...m,
          is_own_project: project.isOwner,
          role: project.role
        })));
      }

      // Apply pagination
      const total = allMonitors.length;
      const paginatedMonitors = allMonitors.slice(offset, offset + pageSize);

      success(res, {
        items: paginatedMonitors,
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
      const userEmail = req.user!.email;

      // First get monitor to check ownership
      const monitorBasic = await queryOne<{ owner_id: string }>(
        'SELECT owner_id FROM monitors WHERE id = ?',
        [id]
      );

      if (!monitorBasic) {
        notFound(res, '监控项不存在');
        return;
      }

      const ownerId = monitorBasic.owner_id;

      // Check permission
      const { checkProjectPermission: checkPermission } = await import('../services/collaboration');
      const permission = await checkPermission(userId, userEmail, ownerId);

      if (!permission.isOwner && !permission.isCollaborator) {
        return forbidden(res, '您没有权限访问此监控项');
      }

      // Check if collaborator has access to this monitor's group
      if (!permission.isOwner && permission.accessibleGroupIds !== null) {
        const hasAccess = await canAccessMonitor(id, ownerId, permission.accessibleGroupIds);
        if (!hasAccess) {
          return forbidden(res, '您没有权限访问此监控项');
        }
      }

      const monitor = await queryOne<Monitor & { webhook_name?: string; webhook_url?: string; at_users?: string | null; is_default?: boolean; webhook_created_at?: Date; webhook_updated_at?: Date }>(
        `SELECT m.*,
                w.name as webhook_name, w.webhook_url, w.at_users, w.is_default,
                w.created_at as webhook_created_at, w.updated_at as webhook_updated_at
         FROM monitors m
         LEFT JOIN webhooks w ON m.webhook_id = w.id
         WHERE m.id = ? AND m.owner_id = ?`,
        [id, ownerId]
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
        check_interval: monitor.check_interval,
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
        group_id: monitor.group_id,
        created_at: monitor.created_at,
        updated_at: monitor.updated_at,
        owner_id: ownerId,
        is_own_project: permission.isOwner,
        role: permission.role,
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

// Create monitor - only owner can create in their own project
router.post(
  '/',
  authenticate,
  [
    body('name').trim().isLength({ min: 1, max: 50 }),
    body('url').isURL(),
    body('method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE']),
    body('check_interval').optional().isInt({ min: 30, max: 300 }),
    body('timeout').optional().isInt({ min: 5, max: 60 }),
    body('expected_status').optional().isInt({ min: 100, max: 599 }),
    body('retry_times').optional().isInt({ min: 1, max: 10 }),
    body('warning_threshold').optional().isInt({ min: 1000, max: 30000 }),
    body('group_id').optional().trim()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const userId = req.user!.userId;

      const {
        name,
        url,
        method = 'GET',
        headers = {},
        body = null,
        check_interval = 60,
        timeout = 10,
        expected_status = 200,
        retry_times = 5,
        warning_threshold = 3000,
        webhook_id,
        group_id
      } = req.body;

      // Only owner can create monitor in their own project
      const ownerId = userId;

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
          [webhook_id, ownerId]
        );
        if (!webhook) {
          validationError(res, [{ field: 'webhook_id', message: 'Webhook 不存在' }]);
          return;
        }
      }

      // Validate group_id if provided
      let finalGroupId = group_id;
      if (group_id) {
        const group = await queryOne(
          'SELECT * FROM monitor_groups WHERE id = ? AND owner_id = ?',
          [group_id, ownerId]
        );
        if (!group) {
          validationError(res, [{ field: 'group_id', message: '分组不存在' }]);
          return;
        }
      } else {
        // Get or create default group
        const { getOrCreateDefaultGroup } = await import('./groups');
        const defaultGroup = await getOrCreateDefaultGroup(ownerId);
        finalGroupId = defaultGroup.id;
      }

      const monitorId = uuidv4();
      await execute(
        `INSERT INTO monitors (
          id, owner_id, group_id, name, url, method, headers, body,
          check_interval, timeout, expected_status, retry_times, warning_threshold,
          status, health_status, consecutive_failures, webhook_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'normal', 0, ?, NOW(), NOW())`,
        [
          monitorId,
          ownerId,
          finalGroupId,
          sanitizeString(name),
          url,
          method,
          JSON.stringify(headers),
          body,
          check_interval,
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
    body('check_interval').optional().isInt({ min: 30, max: 300 }),
    body('timeout').optional().isInt({ min: 5, max: 60 }),
    body('expected_status').optional().isInt({ min: 100, max: 599 }),
    body('retry_times').optional().isInt({ min: 1, max: 10 }),
    body('warning_threshold').optional().isInt({ min: 1000, max: 30000 }),
    body('group_id').optional().trim()
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
      const userEmail = req.user!.email;

      // First get monitor to check ownership
      const monitorBasic = await queryOne<{ owner_id: string }>(
        'SELECT owner_id FROM monitors WHERE id = ?',
        [id]
      );

      if (!monitorBasic) {
        notFound(res, '监控项不存在');
        return;
      }

      const ownerId = monitorBasic.owner_id;

      // Check permission
      const { checkProjectPermission: checkPermission } = await import('../services/collaboration');
      const permission = await checkPermission(userId, userEmail, ownerId);

      if (!permission.isOwner && !permission.isCollaborator) {
        return forbidden(res, '您没有权限更新此监控项');
      }

      // Only owner or editor can update
      if (!permission.isOwner && permission.role !== 'editor') {
        return forbidden(res, '您没有权限更新此监控项');
      }

      // Check if collaborator has access to this monitor's group
      if (!permission.isOwner && permission.accessibleGroupIds !== null) {
        const hasAccess = await canAccessMonitor(id, ownerId, permission.accessibleGroupIds);
        if (!hasAccess) {
          return forbidden(res, '您没有权限更新此监控项');
        }
      }

      const {
        name,
        url,
        method,
        headers,
        body,
        check_interval,
        timeout,
        expected_status,
        retry_times,
        warning_threshold,
        webhook_id,
        group_id
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

      // Validate webhook_id if provided (only owner can use webhooks)
      if (webhook_id) {
        if (!permission.isOwner) {
          return forbidden(res, '协作者不能使用 Webhook');
        }
        const webhook = await queryOne<Webhook>(
          'SELECT * FROM webhooks WHERE id = ? AND owner_id = ?',
          [webhook_id, ownerId]
        );
        if (!webhook) {
          validationError(res, [{ field: 'webhook_id', message: 'Webhook 不存在' }]);
          return;
        }
      }

      // Validate group_id if provided
      if (group_id) {
        // Check if collaborator has access to target group
        if (!permission.isOwner && permission.accessibleGroupIds !== null && !permission.accessibleGroupIds.includes(group_id)) {
          return forbidden(res, '您没有权限将监控项移动到此分组');
        }
        const group = await queryOne(
          'SELECT * FROM monitor_groups WHERE id = ? AND owner_id = ?',
          [group_id, ownerId]
        );
        if (!group) {
          validationError(res, [{ field: 'group_id', message: '分组不存在' }]);
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
      if (check_interval !== undefined) {
        updates.push('check_interval = ?');
        values.push(check_interval);
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
      if (group_id !== undefined) {
        updates.push('group_id = ?');
        values.push(group_id || null);
      }

      values.push(id);
      values.push(ownerId);

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
      const userEmail = req.user!.email;

      // First get monitor to check ownership
      const monitorBasic = await queryOne<{ owner_id: string }>(
        'SELECT owner_id FROM monitors WHERE id = ?',
        [id]
      );

      if (!monitorBasic) {
        notFound(res, '监控项不存在');
        return;
      }

      const ownerId = monitorBasic.owner_id;

      // Check permission
      const { checkProjectPermission: checkPermission } = await import('../services/collaboration');
      const permission = await checkPermission(userId, userEmail, ownerId);

      if (!permission.isOwner && !permission.isCollaborator) {
        return forbidden(res, '您没有权限删除此监控项');
      }

      // Only owner or editor can delete
      if (!permission.isOwner && permission.role !== 'editor') {
        return forbidden(res, '您没有权限删除此监控项');
      }

      // Check if collaborator has access to this monitor's group
      if (!permission.isOwner && permission.accessibleGroupIds !== null) {
        const hasAccess = await canAccessMonitor(id, ownerId, permission.accessibleGroupIds);
        if (!hasAccess) {
          return forbidden(res, '您没有权限删除此监控项');
        }
      }

      // Delete related records first
      await execute('DELETE FROM check_logs WHERE monitor_id = ?', [id]);
      await execute('DELETE FROM alerts WHERE monitor_id = ?', [id]);

      // Delete monitor
      await execute('DELETE FROM monitors WHERE id = ? AND owner_id = ?', [id, ownerId]);

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
      const userEmail = req.user!.email;

      // First get monitor to check ownership
      const monitorBasic = await queryOne<{ owner_id: string }>(
        'SELECT owner_id FROM monitors WHERE id = ?',
        [id]
      );

      if (!monitorBasic) {
        notFound(res, '监控项不存在');
        return;
      }

      const ownerId = monitorBasic.owner_id;

      // Check permission
      const { checkProjectPermission: checkPermission } = await import('../services/collaboration');
      const permission = await checkPermission(userId, userEmail, ownerId);

      if (!permission.isOwner && !permission.isCollaborator) {
        return forbidden(res, '您没有权限暂停此监控项');
      }

      // Only owner or editor can pause
      if (!permission.isOwner && permission.role !== 'editor') {
        return forbidden(res, '您没有权限暂停此监控项');
      }

      // Check if collaborator has access to this monitor's group
      if (!permission.isOwner && permission.accessibleGroupIds !== null) {
        const hasAccess = await canAccessMonitor(id, ownerId, permission.accessibleGroupIds);
        if (!hasAccess) {
          return forbidden(res, '您没有权限暂停此监控项');
        }
      }

      await execute(
        "UPDATE monitors SET status = 'paused', updated_at = NOW() WHERE id = ?",
        [id]
      );

      // Resolve any active alerts for this monitor with reason 'paused'
      await execute(
        `UPDATE alerts 
         SET status = 'resolved', resolved_reason = 'paused', ended_at = NOW() 
         WHERE monitor_id = ? AND status = 'firing'`,
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
      const userEmail = req.user!.email;

      // First get monitor to check ownership
      const monitorBasic = await queryOne<{ owner_id: string }>(
        'SELECT owner_id FROM monitors WHERE id = ?',
        [id]
      );

      if (!monitorBasic) {
        notFound(res, '监控项不存在');
        return;
      }

      const ownerId = monitorBasic.owner_id;

      // Check permission
      const { checkProjectPermission: checkPermission } = await import('../services/collaboration');
      const permission = await checkPermission(userId, userEmail, ownerId);

      if (!permission.isOwner && !permission.isCollaborator) {
        return forbidden(res, '您没有权限恢复此监控项');
      }

      // Only owner or editor can resume
      if (!permission.isOwner && permission.role !== 'editor') {
        return forbidden(res, '您没有权限恢复此监控项');
      }

      // Check if collaborator has access to this monitor's group
      if (!permission.isOwner && permission.accessibleGroupIds !== null) {
        const hasAccess = await canAccessMonitor(id, ownerId, permission.accessibleGroupIds);
        if (!hasAccess) {
          return forbidden(res, '您没有权限恢复此监控项');
        }
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

// Manual check monitor
router.post(
  '/:id/check',
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
      const userEmail = req.user!.email;

      // First get monitor to check ownership
      const monitorBasic = await queryOne<{ owner_id: string }>(
        'SELECT owner_id FROM monitors WHERE id = ?',
        [id]
      );

      if (!monitorBasic) {
        notFound(res, '监控项不存在');
        return;
      }

      const ownerId = monitorBasic.owner_id;

      // Check permission
      const { checkProjectPermission: checkPermission } = await import('../services/collaboration');
      const permission = await checkPermission(userId, userEmail, ownerId);

      if (!permission.isOwner && !permission.isCollaborator) {
        return forbidden(res, '您没有权限检查此监控项');
      }

      // Check if collaborator has access to this monitor's group
      if (!permission.isOwner && permission.accessibleGroupIds !== null) {
        const hasAccess = await canAccessMonitor(id, ownerId, permission.accessibleGroupIds);
        if (!hasAccess) {
          return forbidden(res, '您没有权限检查此监控项');
        }
      }

      // Check if monitor exists and belongs to user
      const monitor = await queryOne<Monitor>(
        'SELECT * FROM monitors WHERE id = ? AND owner_id = ?',
        [id, ownerId]
      );

      if (!monitor) {
        notFound(res, '监控项不存在');
        return;
      }

      // Perform manual check
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
            'User-Agent': 'ProjectHealthMonitor/1.0 (Manual Check)',
            ...safeJsonParse(monitor.headers as unknown as string, {})
          }
        };

        if (monitor.body && ['POST', 'PUT'].includes(monitor.method)) {
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
        `INSERT INTO check_logs (id, monitor_id, status, http_code, response_time, error_msg, checked_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, NOW())`,
        [monitor.id, status, httpCode, responseTime, errorMsg]
      );

      // Update monitor status
      const newConsecutiveFailures = status === 'success' ? 0 : monitor.consecutive_failures + 1;
      let healthStatus: 'normal' | 'warning' | 'critical' = monitor.health_status;

      if (status === 'success') {
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
             last_response_time = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [newConsecutiveFailures, healthStatus, responseTime, monitor.id]
      );

      success(res, {
        message: '手动检查完成',
        result: {
          status,
          http_code: httpCode,
          response_time: responseTime,
          error_msg: errorMsg,
          health_status: healthStatus
        }
      });
    } catch (err) {
      console.error('Manual check error:', err);
      error(res, '手动检查失败', 500);
    }
  }
);

export default router;

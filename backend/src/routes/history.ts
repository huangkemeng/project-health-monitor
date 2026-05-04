import { Router, Request, Response } from 'express';
import { query as queryValidator, validationResult } from 'express-validator';
import { query, queryOne } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { projectContext, checkProjectPermission } from '../middleware/permission';
import { success, error, validationError, forbidden } from '../utils/api-response';
import { canAccessMonitor } from '../utils/data-isolation';
import type { CheckLog, Alert, CheckLogResponse, AlertResponse } from '../types';

const router = Router();

// Get check logs
router.get(
  '/checks',
  authenticate,
  projectContext(),
  checkProjectPermission,
  [
    queryValidator('monitor_id').optional().isUUID(),
    queryValidator('status').optional().isIn(['success', 'failure']),
    queryValidator('start_time').optional().isISO8601(),
    queryValidator('end_time').optional().isISO8601(),
    queryValidator('page').optional().isInt({ min: 1 }),
    queryValidator('page_size').optional().isInt({ min: 1, max: 100 })
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 50;
      const monitorId = req.query.monitor_id as string;
      const status = req.query.status as string;
      const startTime = req.query.start_time as string;
      const endTime = req.query.end_time as string;

      const offset = (page - 1) * pageSize;

      const { ownerId, isOwner, accessibleGroupIds } = req.projectContext!;

      // If specific monitor requested, check access
      if (monitorId && !isOwner) {
        const hasAccess = await canAccessMonitor(monitorId, ownerId, accessibleGroupIds);
        if (!hasAccess) {
          return forbidden(res, '您没有权限查看此监控项的历史记录');
        }
      }

      // Build query conditions
      const conditions: string[] = ['m.owner_id = ?'];
      const values: (string | number)[] = [ownerId];

      // Apply group filter for collaborators
      if (!isOwner && accessibleGroupIds !== null) {
        if (accessibleGroupIds.length === 0) {
          conditions.push('m.group_id IS NULL');
        } else {
          const placeholders = accessibleGroupIds.map(() => '?').join(',');
          conditions.push(`(m.group_id IS NULL OR m.group_id IN (${placeholders}))`);
          values.push(...accessibleGroupIds);
        }
      }

      if (monitorId) {
        conditions.push('cl.monitor_id = ?');
        values.push(monitorId);
      }

      if (status) {
        conditions.push('cl.status = ?');
        values.push(status);
      }

      if (startTime) {
        conditions.push('cl.checked_at >= ?');
        values.push(startTime);
      }

      if (endTime) {
        conditions.push('cl.checked_at <= ?');
        values.push(endTime);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await queryOne<{ total: number }>(
        `SELECT COUNT(*) as total
         FROM check_logs cl
         JOIN monitors m ON cl.monitor_id = m.id
         WHERE ${whereClause}`,
        values
      );
      const total = countResult?.total || 0;

      // Get check logs with group info
      const logs = await query<CheckLog & { monitor_name: string; group_name: string | null }>(
        `SELECT cl.*, m.name as monitor_name, mg.name as group_name
         FROM check_logs cl
         JOIN monitors m ON cl.monitor_id = m.id
         LEFT JOIN monitor_groups mg ON m.group_id = mg.id
         WHERE ${whereClause}
         ORDER BY cl.checked_at DESC
         LIMIT ? OFFSET ?`,
        [...values, pageSize, offset]
      );

      const response: CheckLogResponse[] = logs.map((l: CheckLog & { monitor_name: string; group_name: string | null }) => ({
        id: l.id,
        monitor_id: l.monitor_id,
        monitor_name: l.monitor_name,
        group_name: l.group_name,
        status: l.status,
        http_code: l.http_code,
        response_time: l.response_time,
        error_msg: l.error_msg,
        checked_at: l.checked_at
      }));

      success(res, {
        items: response,
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: Math.ceil(total / pageSize)
        }
      });
    } catch (err) {
      console.error('Get check logs error:', err);
      error(res, '获取探测历史失败');
    }
  }
);

// Get alerts
router.get(
  '/alerts',
  authenticate,
  projectContext(),
  checkProjectPermission,
  [
    queryValidator('monitor_id').optional().isUUID(),
    queryValidator('status').optional().isIn(['firing', 'resolved']),
    queryValidator('start_time').optional().isISO8601(),
    queryValidator('end_time').optional().isISO8601(),
    queryValidator('page').optional().isInt({ min: 1 }),
    queryValidator('page_size').optional().isInt({ min: 1, max: 100 })
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
      const monitorId = req.query.monitor_id as string;
      const status = req.query.status as string;
      const startTime = req.query.start_time as string;
      const endTime = req.query.end_time as string;

      const offset = (page - 1) * pageSize;

      const { ownerId, isOwner, accessibleGroupIds } = req.projectContext!;

      // If specific monitor requested, check access
      if (monitorId && !isOwner) {
        const hasAccess = await canAccessMonitor(monitorId, ownerId, accessibleGroupIds);
        if (!hasAccess) {
          return forbidden(res, '您没有权限查看此监控项的告警');
        }
      }

      // Build query conditions
      const conditions: string[] = ['m.owner_id = ?'];
      const values: (string | number)[] = [ownerId];

      // Apply group filter for collaborators
      if (!isOwner && accessibleGroupIds !== null) {
        if (accessibleGroupIds.length === 0) {
          conditions.push('m.group_id IS NULL');
        } else {
          const placeholders = accessibleGroupIds.map(() => '?').join(',');
          conditions.push(`(m.group_id IS NULL OR m.group_id IN (${placeholders}))`);
          values.push(...accessibleGroupIds);
        }
      }

      if (monitorId) {
        conditions.push('a.monitor_id = ?');
        values.push(monitorId);
      }

      if (status) {
        conditions.push('a.status = ?');
        values.push(status);
      }

      if (startTime) {
        conditions.push('a.started_at >= ?');
        values.push(startTime);
      }

      if (endTime) {
        conditions.push('a.started_at <= ?');
        values.push(endTime);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await queryOne<{ total: number }>(
        `SELECT COUNT(*) as total
         FROM alerts a
         JOIN monitors m ON a.monitor_id = m.id
         WHERE ${whereClause}`,
        values
      );
      const total = countResult?.total || 0;

      // Get alerts with group info
      const alerts = await query<Alert & { monitor_name: string; group_name: string | null }>(
        `SELECT a.*, m.name as monitor_name, mg.name as group_name
         FROM alerts a
         JOIN monitors m ON a.monitor_id = m.id
         LEFT JOIN monitor_groups mg ON m.group_id = mg.id
         WHERE ${whereClause}
         ORDER BY a.started_at DESC
         LIMIT ? OFFSET ?`,
        [...values, pageSize, offset]
      );

      const response: AlertResponse[] = alerts.map((a: Alert & { monitor_name: string; group_name: string | null }) => ({
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
        created_at: a.created_at
      }));

      success(res, {
        items: response,
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: Math.ceil(total / pageSize)
        }
      });
    } catch (err) {
      console.error('Get alerts error:', err);
      error(res, '获取告警历史失败');
    }
  }
);

export default router;

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { success, created, error, validationError, notFound, forbidden } from '../utils/api-response';
import * as feedbackService from '../services/feedback';
import { queryOne } from '../lib/db';
import type { FeedbackStatus } from '../types';

const router = Router();

// POST /api/feedback - Submit feedback
router.post(
  '/',
  authenticate,
  [
    body('type').isIn(['bug', 'feature_request', 'other']).withMessage('反馈类型无效'),
    body('title').isString().isLength({ min: 5, max: 100 }).withMessage('标题长度需在5-100字符之间'),
    body('description').isString().isLength({ min: 10, max: 2000 }).withMessage('描述长度需在10-2000字符之间'),
    body('steps_to_reproduce').optional().isString().isLength({ max: 2000 }),
    body('expected_behavior').optional().isString().isLength({ max: 1000 }),
    body('actual_behavior').optional().isString().isLength({ max: 1000 }),
    body('contact').optional().isString().isLength({ max: 100 }),
    body('page_url').optional().isString().isLength({ max: 500 }),
    body('browser_info').optional().isString().isLength({ max: 500 }),
    body('browser_language').optional().isString().isLength({ max: 20 }),
    body('screen_resolution').optional().isString().isLength({ max: 20 }),
    body('operating_system').optional().isString().isLength({ max: 100 }),
    body('system_version').optional().isString().isLength({ max: 50 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({
          field: e.type === 'field' ? e.path : 'unknown',
          message: e.msg,
        })));
        return;
      }

      const userId = req.user?.userId || null;
      const userEmail = req.user?.email || null;
      const contact = req.body.contact || userEmail;

      const result = await feedbackService.createFeedback(userId, contact, req.body);
      created(res, result, '反馈提交成功');
    } catch (err) {
      if (err instanceof Error && err.message.includes('过于频繁')) {
        error(res, err.message, 429);
        return;
      }
      console.error('Create feedback error:', err);
      error(res, '提交反馈失败');
    }
  }
);

// GET /api/feedback - Get current user's feedback list
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;
      const status = req.query.status as string;
      const type = req.query.type as string;
      const keyword = req.query.keyword as string;
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      const result = await feedbackService.getUserFeedbacks(req.user!.userId, {
        page, page_size: pageSize, status, type, keyword, start_date: startDate, end_date: endDate,
      });

      success(res, result);
    } catch (err) {
      console.error('Get feedback list error:', err);
      error(res, '获取反馈列表失败');
    }
  }
);

// GET /api/feedback/notifications - Get user notifications
router.get(
  '/notifications',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;
      const { getUserNotifications } = await import('../services/notification');
      const result = await getUserNotifications(req.user!.userId, page, pageSize);
      success(res, result);
    } catch (err) {
      console.error('Get notifications error:', err);
      error(res, '获取通知列表失败');
    }
  }
);

// GET /api/feedback/notifications/unread-count - Get unread count
router.get(
  '/notifications/unread-count',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { getUnreadCount } = await import('../services/notification');
      const count = await getUnreadCount(req.user!.userId);
      success(res, { count });
    } catch (err) {
      console.error('Get unread count error:', err);
      error(res, '获取未读通知数失败');
    }
  }
);

// PUT /api/feedback/notifications/:id/read - Mark notification as read
router.put(
  '/notifications/:id/read',
  authenticate,
  [param('id').isUUID().withMessage('无效的通知ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({
          field: e.type === 'field' ? e.path : 'unknown',
          message: e.msg,
        })));
        return;
      }
      const { markAsRead } = await import('../services/notification');
      await markAsRead(req.params.id, req.user!.userId);
      success(res, null, '已标记为已读');
    } catch (err) {
      console.error('Mark notification read error:', err);
      error(res, '标记已读失败');
    }
  }
);

// PUT /api/feedback/notifications/read-all - Mark all as read
router.put(
  '/notifications/read-all',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { markAllAsRead } = await import('../services/notification');
      await markAllAsRead(req.user!.userId);
      success(res, null, '已全部标记为已读');
    } catch (err) {
      console.error('Mark all notifications read error:', err);
      error(res, '操作失败');
    }
  }
);

// GET /api/feedback/admin/all - Admin: get all feedbacks
router.get(
  '/admin/all',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;
      const status = req.query.status as string;
      const type = req.query.type as string;
      const keyword = req.query.keyword as string;

      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      const user = await queryOne<{ email: string }>('SELECT email FROM users WHERE id = ?', [req.user!.userId]);
      if (!user || !adminEmails.includes(user.email)) {
        forbidden(res, '无权访问管理功能');
        return;
      }

      const result = await feedbackService.getAllFeedbacksForAdmin({
        page, page_size: pageSize, status, type, keyword,
      });
      success(res, result);
    } catch (err) {
      console.error('Admin get feedbacks error:', err);
      error(res, '获取反馈列表失败');
    }
  }
);

// GET /api/feedback/admin/stats - Admin: get stats
router.get(
  '/admin/stats',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      const user = await queryOne<{ email: string }>('SELECT email FROM users WHERE id = ?', [req.user!.userId]);
      if (!user || !adminEmails.includes(user.email)) {
        forbidden(res, '无权访问管理功能');
        return;
      }

      const stats = await feedbackService.getFeedbackStats();
      success(res, stats);
    } catch (err) {
      console.error('Admin get stats error:', err);
      error(res, '获取统计信息失败');
    }
  }
);

// PUT /api/feedback/admin/:id/assign - Admin: assign handler
router.put(
  '/admin/:id/assign',
  authenticate,
  [
    param('id').isUUID().withMessage('无效的反馈ID'),
    body('assigned_to').isString().withMessage('请指定处理人'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({
          field: e.type === 'field' ? e.path : 'unknown',
          message: e.msg,
        })));
        return;
      }

      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      const user = await queryOne<{ email: string }>('SELECT email FROM users WHERE id = ?', [req.user!.userId]);
      if (!user || !adminEmails.includes(user.email)) {
        forbidden(res, '无权访问管理功能');
        return;
      }

      await feedbackService.assignFeedback(req.params.id, req.body.assigned_to, req.user!.userId);
      success(res, null, '分配成功');
    } catch (err) {
      if (err instanceof Error && err.message === '反馈不存在') {
        notFound(res, '反馈不存在');
        return;
      }
      console.error('Assign feedback error:', err);
      error(res, '分配处理人失败');
    }
  }
);

// POST /api/feedback/admin/batch - Admin: batch operations
router.post(
  '/admin/batch',
  authenticate,
  [
    body('ids').isArray({ min: 1 }).withMessage('请选择要操作的反馈'),
    body('ids.*').isString(),
    body('action').isIn(['mark_processing', 'mark_fixed', 'close']).withMessage('无效的操作类型'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({
          field: e.type === 'field' ? e.path : 'unknown',
          message: e.msg,
        })));
        return;
      }

      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      const user = await queryOne<{ email: string }>('SELECT email FROM users WHERE id = ?', [req.user!.userId]);
      if (!user || !adminEmails.includes(user.email)) {
        forbidden(res, '无权访问管理功能');
        return;
      }

      const { ids, action } = req.body;
      const statusMap: Record<string, FeedbackStatus> = {
        mark_processing: 'processing',
        mark_fixed: 'fixed',
        close: 'closed',
      };

      await feedbackService.batchUpdateStatus(ids, statusMap[action], req.user!.userId);
      success(res, null, '批量操作成功');
    } catch (err) {
      console.error('Batch operation error:', err);
      error(res, '批量操作失败');
    }
  }
);

// GET /api/feedback/:id - Get feedback detail
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID().withMessage('无效的反馈ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({
          field: e.type === 'field' ? e.path : 'unknown',
          message: e.msg,
        })));
        return;
      }

      const result = await feedbackService.getFeedbackById(req.params.id, req.user!.userId);
      success(res, result);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === '反馈不存在') {
          notFound(res, '反馈不存在');
          return;
        }
        if (err.message === '无权访问该反馈') {
          forbidden(res, '无权访问该反馈');
          return;
        }
      }
      console.error('Get feedback detail error:', err);
      error(res, '获取反馈详情失败');
    }
  }
);

// POST /api/feedback/:id/reply - Add reply
router.post(
  '/:id/reply',
  authenticate,
  [
    param('id').isUUID().withMessage('无效的反馈ID'),
    body('content').isString().isLength({ min: 1, max: 2000 }).withMessage('回复内容长度需在1-2000字符之间'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({
          field: e.type === 'field' ? e.path : 'unknown',
          message: e.msg,
        })));
        return;
      }

      const result = await feedbackService.addReply(
        req.params.id,
        req.user!.userId,
        req.body.content
      );
      created(res, result, '回复成功');
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === '反馈不存在') {
          notFound(res, '反馈不存在');
          return;
        }
        if (err.message === '无权回复该反馈') {
          forbidden(res, '无权回复该反馈');
          return;
        }
      }
      console.error('Add reply error:', err);
      error(res, '回复失败');
    }
  }
);

// PUT /api/feedback/:id/status - Update feedback status
router.put(
  '/:id/status',
  authenticate,
  [
    param('id').isUUID().withMessage('无效的反馈ID'),
    body('status').isIn(['pending', 'processing', 'fixed', 'closed', 'duplicate']).withMessage('无效的状态值'),
    body('reason').isString().isLength({ min: 1, max: 500 }).withMessage('变更原因长度需在1-500字符之间'),
    body('duplicate_of').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({
          field: e.type === 'field' ? e.path : 'unknown',
          message: e.msg,
        })));
        return;
      }

      await feedbackService.updateFeedbackStatus(
        req.params.id,
        req.user!.userId,
        req.body.status as FeedbackStatus,
        req.body.reason,
        req.body.duplicate_of
      );
      success(res, null, '状态更新成功');
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === '反馈不存在') {
          notFound(res, '反馈不存在');
          return;
        }
        if (err.message.includes('无法从')) {
          error(res, err.message, 400);
          return;
        }
        if (err.message.includes('必须指定原反馈编号')) {
          error(res, err.message, 400);
          return;
        }
      }
      console.error('Update status error:', err);
      error(res, '状态更新失败');
    }
  }
);

// POST /api/feedback/:id/close - Close feedback
router.post(
  '/:id/close',
  authenticate,
  [param('id').isUUID().withMessage('无效的反馈ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({
          field: e.type === 'field' ? e.path : 'unknown',
          message: e.msg,
        })));
        return;
      }

      await feedbackService.closeFeedback(req.params.id, req.user!.userId);
      success(res, null, '反馈已关闭');
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === '反馈不存在') {
          notFound(res, '反馈不存在');
          return;
        }
        if (err.message === '无权关闭该反馈') {
          forbidden(res, '无权关闭该反馈');
          return;
        }
      }
      console.error('Close feedback error:', err);
      error(res, '关闭反馈失败');
    }
  }
);

// POST /api/feedback/:id/reopen - Reopen feedback
router.post(
  '/:id/reopen',
  authenticate,
  [param('id').isUUID().withMessage('无效的反馈ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        validationError(res, errors.array().map(e => ({
          field: e.type === 'field' ? e.path : 'unknown',
          message: e.msg,
        })));
        return;
      }

      await feedbackService.reopenFeedback(req.params.id, req.user!.userId);
      success(res, null, '反馈已重新开启');
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === '反馈不存在') {
          notFound(res, '反馈不存在');
          return;
        }
        if (err.message === '无权重新开启该反馈') {
          forbidden(res, '无权重新开启该反馈');
          return;
        }
        if (err.message.includes('超过7天') || err.message.includes('只有已关闭')) {
          error(res, err.message, 400);
          return;
        }
      }
      console.error('Reopen feedback error:', err);
      error(res, '重新开启反馈失败');
    }
  }
);

export default router;

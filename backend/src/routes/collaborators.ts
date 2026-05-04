import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as collaborationService from '../services/collaboration';
import { success, error, created } from '../utils/api-response';
import { queryOne } from '../lib/db';
import type { User } from '../types';

const router = Router();

// 所有路由需要认证
router.use(authenticate);

/**
 * GET /api/collaborators
 * 获取当前用户的协作者列表
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const ownerId = req.user!.userId;
    const collaborators = await collaborationService.getCollaborators(ownerId);
    success(res, collaborators);
  } catch (err) {
    error(res, '获取协作者列表失败', 500);
  }
});

/**
 * POST /api/collaborators
 * 邀请协作者
 * Body: { email: string, role: 'viewer' | 'editor', groupIds?: string[] | null }
 */
router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail().withMessage('请输入有效的邮箱地址'),
    body('role').isIn(['viewer', 'editor']).withMessage('权限级别必须是 viewer 或 editor'),
    body('groupIds').optional({ nullable: true }).isArray().withMessage('分组ID必须是数组'),
    validate,
  ],
  async (req: Request, res: Response) => {
    try {
      const { email, role, groupIds } = req.body;
      const ownerId = req.user!.userId;

      // 检查是否邀请自己
      const ownerUser = await queryOne<User>('SELECT email FROM users WHERE id = ?', [ownerId]);

      if (ownerUser && ownerUser.email === email) {
        return error(res, '不能邀请自己', 400);
      }

      const collaborator = await collaborationService.inviteCollaborator(
        ownerId,
        email,
        role,
        groupIds || null
      );

      created(res, collaborator, '邀请成功');
    } catch (err: any) {
      if (err.message === '该用户已被邀请') {
        return error(res, err.message, 409);
      }
      if (err.message === '不能邀请自己') {
        return error(res, err.message, 400);
      }
      error(res, '邀请失败', 500);
    }
  }
);

/**
 * PUT /api/collaborators/:id
 * 修改协作者权限
 * Body: { role?: 'viewer' | 'editor', groupIds?: string[] | null }
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('无效的协作者ID'),
    body('role').optional().isIn(['viewer', 'editor']).withMessage('权限级别必须是 viewer 或 editor'),
    body('groupIds').optional({ nullable: true }).isArray().withMessage('分组ID必须是数组'),
    validate,
  ],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role, groupIds } = req.body;
      const ownerId = req.user!.userId;

      await collaborationService.updateCollaborator(id, ownerId, { role, groupIds });
      success(res, null, '修改成功');
    } catch (err: any) {
      if (err.message === '协作者不存在') {
        return error(res, err.message, 404);
      }
      error(res, '修改失败', 500);
    }
  }
);

/**
 * DELETE /api/collaborators/:id
 * 移除协作者
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('无效的协作者ID'),
    validate,
  ],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ownerId = req.user!.userId;

      await collaborationService.removeCollaborator(id, ownerId);
      success(res, null, '移除成功');
    } catch (err: any) {
      if (err.message === '协作者不存在') {
        return error(res, err.message, 404);
      }
      error(res, '移除失败', 500);
    }
  }
);

export default router;

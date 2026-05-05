import { Router, Request, Response } from 'express';
import { param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { success, error } from '../utils/api-response';
import * as collaborationService from '../services/collaboration';

const router = Router();

/**
 * GET /api/shared-projects
 * 获取与我共享的项目列表
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    const projects = await collaborationService.getSharedProjects(userId, userEmail);
    success(res, projects);
  } catch (err) {
    console.error('Get shared projects error:', err);
    error(res, '获取共享项目失败', 500);
  }
});

/**
 * POST /api/shared-projects/:ownerId/reject
 * 拒绝共享项目
 */
router.post(
  '/:ownerId/reject',
  authenticate,
  [
    param('ownerId').isUUID().withMessage('无效的项目所有者ID'),
    validate
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { ownerId } = req.params;

      await collaborationService.rejectProject(userId, ownerId);
      success(res, { message: '项目已拒绝' });
    } catch (err) {
      console.error('Reject project error:', err);
      error(res, '拒绝项目失败', 500);
    }
  }
);

/**
 * POST /api/shared-projects/:ownerId/accept
 * 接受/重新加入共享项目
 */
router.post(
  '/:ownerId/accept',
  authenticate,
  [
    param('ownerId').isUUID().withMessage('无效的项目所有者ID'),
    validate
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const userEmail = req.user!.email;
      const { ownerId } = req.params;

      await collaborationService.acceptProject(userId, userEmail, ownerId);
      success(res, { message: '已重新加入项目' });
    } catch (err: any) {
      console.error('Accept project error:', err);
      error(res, err.message || '接受项目失败', 500);
    }
  }
);

export default router;

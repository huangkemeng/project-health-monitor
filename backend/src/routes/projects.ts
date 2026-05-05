import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { success, error } from '../utils/api-response';
import { query, queryOne } from '../lib/db';
import * as collaborationService from '../services/collaboration';
import type { SharedProject } from '../types';

const router = Router();

/**
 * GET /api/projects
 * 获取当前用户可访问的所有项目列表
 * 包括：自己的项目 + 他人共享给我的项目
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    // 1. 获取用户自己的项目（作为所有者）
    const [ownProjects] = await query(
      `SELECT
        u.id as owner_id,
        u.username as owner_username,
        u.email as owner_email,
        'owner' as role,
        NULL as group_id,
        NULL as group_name,
        u.created_at as joined_at
      FROM users u
      WHERE u.id = ?`,
      [userId]
    );

    // 2. 获取他人共享给我的项目
    const sharedProjects = await collaborationService.getSharedProjects(userId, userEmail);

    // 3. 合并结果
    const allProjects: (SharedProject & { is_own_project: boolean })[] = [];

    if (ownProjects && (ownProjects as any[]).length > 0) {
      const ownProject = (ownProjects as any[])[0];
      allProjects.push({
        owner_id: ownProject.owner_id,
        owner_username: ownProject.owner_username,
        owner_email: ownProject.owner_email,
        role: 'owner',
        groups: [],
        joined_at: ownProject.joined_at,
        status: 'active',
        is_own_project: true,
      });
    }

    sharedProjects.forEach((project) => {
      allProjects.push({
        ...project,
        is_own_project: false,
      });
    });

    success(res, {
      projects: allProjects,
      current_project: {
        owner_id: userId,
        owner_email: userEmail,
        is_own: true,
      },
    });
  } catch (err) {
    console.error('Get projects error:', err);
    error(res, '获取项目列表失败', 500);
  }
});

/**
 * POST /api/projects/switch
 * 切换当前项目上下文
 */
router.post('/switch', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email;
    const { owner_id } = req.body;

    if (!owner_id) {
      return error(res, '缺少项目所有者ID', 400);
    }

    // 1. 检查是否是切换到自己的项目
    if (owner_id === userId) {
      const user = await queryOne(
        'SELECT id, username, email FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        return error(res, '用户不存在', 404);
      }

      return success(res, {
        project: {
          owner_id: userId,
          owner_username: (user as any).username,
          owner_email: (user as any).email,
          role: 'owner',
          group_id: null,
          group_name: null,
          is_own_project: true,
        },
        message: '已切换到您的项目',
      });
    }

    // 2. 检查是否有权限访问该项目
    const permission = await collaborationService.checkProjectPermission(
      userId,
      userEmail,
      owner_id
    );

    if (!permission.isCollaborator) {
      return error(res, '您没有权限访问此项目', 403);
    }

    // 3. 获取项目信息
    const owner = await queryOne(
      'SELECT id, username, email FROM users WHERE id = ?',
      [owner_id]
    );

    if (!owner) {
      return error(res, '项目所有者不存在', 404);
    }

    // 4. 获取可访问的分组信息
    let accessibleGroups: { id: string; name: string }[] = [];
    if (permission.accessibleGroupIds === null) {
      // 可以访问所有分组
      const groups = await query(
        'SELECT id, name FROM monitor_groups WHERE owner_id = ?',
        [owner_id]
      );
      accessibleGroups = (groups as any[]).map((g) => ({ id: g.id, name: g.name }));
    } else if (permission.accessibleGroupIds.length > 0) {
      const placeholders = permission.accessibleGroupIds.map(() => '?').join(',');
      const groups = await query(
        `SELECT id, name FROM monitor_groups WHERE owner_id = ? AND id IN (${placeholders})`,
        [owner_id, ...permission.accessibleGroupIds]
      );
      accessibleGroups = (groups as any[]).map((g) => ({ id: g.id, name: g.name }));
    }

    success(res, {
      project: {
        owner_id: owner_id,
        owner_username: (owner as any).username,
        owner_email: (owner as any).email,
        role: permission.role,
        accessible_groups: accessibleGroups,
        is_own_project: false,
      },
      message: `已切换到 ${(owner as any).username} 的项目`,
    });
  } catch (err) {
    console.error('Switch project error:', err);
    error(res, '切换项目失败', 500);
  }
});

/**
 * GET /api/projects/current
 * 获取当前项目上下文信息
 */
router.get('/current', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    // 默认返回用户自己的项目信息
    const user = await queryOne(
      'SELECT id, username, email FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return error(res, '用户不存在', 404);
    }

    success(res, {
      project: {
        owner_id: userId,
        owner_username: (user as any).username,
        owner_email: (user as any).email,
        role: 'owner',
        group_id: null,
        group_name: null,
        is_own_project: true,
      },
    });
  } catch (err) {
    console.error('Get current project error:', err);
    error(res, '获取当前项目信息失败', 500);
  }
});

export default router;

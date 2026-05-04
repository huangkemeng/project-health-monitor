import type { Request, Response, NextFunction } from 'express';
import { checkProjectPermission as checkPermission } from '../services/collaboration';
import { unauthorized, forbidden } from '../utils/api-response';
import type { CollaboratorRole } from '../types';

// 扩展Express Request类型
declare global {
  namespace Express {
    interface Request {
      projectContext?: {
        ownerId: string;
        isOwner: boolean;
        isCollaborator: boolean;
        role: CollaboratorRole | null;
        accessibleGroupIds: string[] | null;
      };
    }
  }
}

const PROJECT_CONTEXT_HEADER = 'x-project-owner-id';

/**
 * 项目上下文中间件
 * 优先从请求头获取项目上下文，如果没有则从URL参数或查询参数获取
 * 默认使用当前登录用户作为所有者
 */
export function projectContext(
  paramName: string = 'ownerId'
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    // 优先从请求头获取，然后是URL参数、查询参数，最后是当前用户
    const headerOwnerId = req.headers[PROJECT_CONTEXT_HEADER] as string | undefined;
    const targetOwnerId = headerOwnerId ||
                          req.params[paramName] ||
                          req.query.ownerId ||
                          req.user?.userId;

    if (!targetOwnerId) {
      return unauthorized(res, '无法确定项目所有者');
    }

    req.projectContext = {
      ownerId: targetOwnerId as string,
      isOwner: false,
      isCollaborator: false,
      role: null,
      accessibleGroupIds: null,
    };

    next();
  };
}

/**
 * 检查项目权限
 * 验证当前用户对目标项目的访问权限
 */
export async function checkProjectPermission(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user || !req.projectContext) {
    return unauthorized(res, '未认证或缺少项目上下文');
  }

  const currentUserId = req.user.userId;
  const currentUserEmail = req.user.email;
  const targetOwnerId = req.projectContext.ownerId;

  // 1. 检查是否是项目所有者
  if (currentUserId === targetOwnerId) {
    req.projectContext.isOwner = true;
    req.projectContext.accessibleGroupIds = null; // null表示所有分组
    return next();
  }

  // 2. 检查是否是协作者
  const permission = await checkPermission(currentUserId, currentUserEmail, targetOwnerId);

  if (!permission.isCollaborator) {
    return forbidden(res, '您没有权限访问此项目');
  }

  req.projectContext.isCollaborator = true;
  req.projectContext.role = permission.role;
  req.projectContext.accessibleGroupIds = permission.accessibleGroupIds;

  next();
}

/**
 * 要求特定权限级别
 * @param requiredRole 最低要求的权限级别
 */
export function requireRole(
  requiredRole: 'viewer' | 'editor' | 'owner'
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.projectContext) {
      return unauthorized(res, '缺少项目上下文');
    }

    const { isOwner, role } = req.projectContext;

    // owner拥有所有权限
    if (isOwner) {
      return next();
    }

    // 检查权限级别
    if (requiredRole === 'owner') {
      return forbidden(res, '此操作需要项目所有者权限');
    }

    if (requiredRole === 'editor' && role !== 'editor') {
      return forbidden(res, '此操作需要编辑权限');
    }

    // viewer可以访问只读资源
    next();
  };
}

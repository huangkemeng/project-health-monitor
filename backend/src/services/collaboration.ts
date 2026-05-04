import pool from '../lib/db';
import type {
  ProjectCollaborator,
  ProjectCollaboratorResponse,
  ProjectRejection,
  SharedProject,
  PermissionCheckResult,
  CollaboratorRole,
} from '../types';

// Simple in-memory cache for permission checks
const permissionCache = new Map<string, { result: PermissionCheckResult; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(userId: string, ownerId: string): string {
  return `${userId}:${ownerId}`;
}

function getFromCache(userId: string, ownerId: string): PermissionCheckResult | null {
  const cached = permissionCache.get(getCacheKey(userId, ownerId));
  if (cached && cached.expiry > Date.now()) {
    return cached.result;
  }
  return null;
}

function setCache(userId: string, ownerId: string, result: PermissionCheckResult): void {
  permissionCache.set(getCacheKey(userId, ownerId), {
    result,
    expiry: Date.now() + CACHE_TTL,
  });
}

export function clearPermissionCache(userId: string, ownerId: string): void {
  permissionCache.delete(getCacheKey(userId, ownerId));
}

/**
 * 邀请协作者
 * @param ownerId 项目所有者ID
 * @param email 被邀请者邮箱
 * @param role 权限级别
 * @param groupId 可访问分组ID (null=全部分组, 'ungrouped'=仅未分组)
 * @returns 创建的协作者记录
 */
export async function inviteCollaborator(
  ownerId: string,
  email: string,
  role: CollaboratorRole,
  groupId: string | null
): Promise<ProjectCollaboratorResponse> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 转换 'ungrouped' 为特殊标识
    const dbGroupId = groupId === 'ungrouped' ? '__UNGROUPED__' : groupId;

    // 检查是否已存在相同记录（同一邮箱+同一分组）
    const [existing] = await connection.execute(
      `SELECT id, status FROM project_collaborators
       WHERE project_owner_id = ? AND collaborator_email = ? AND group_id <=> ?`,
      [ownerId, email, dbGroupId]
    );

    const existingRecord = (existing as any[])[0];

    if (existingRecord) {
      if (existingRecord.status === 'active') {
        throw new Error('该用户已被邀请到此分组');
      }

      // 如果是 rejected 或 removed 状态，重新激活
      if (existingRecord.status === 'rejected' || existingRecord.status === 'removed') {
        // 如果邮箱已注册，自动关联user_id
        const [existingUser] = await connection.execute(
          'SELECT id FROM users WHERE email = ?',
          [email]
        );

        const collaboratorUserId = (existingUser as any[]).length > 0 ? (existingUser as any[])[0].id : null;

        // 更新现有记录
        await connection.execute(
          `UPDATE project_collaborators
           SET status = 'active',
               role = ?,
               collaborator_user_id = ?,
               created_at = NOW()
           WHERE id = ?`,
          [role, collaboratorUserId, existingRecord.id]
        );

        // 获取更新后的记录
        const [rows] = await connection.execute(
          `SELECT
            pc.id,
            pc.collaborator_email,
            u.username as collaborator_username,
            CASE
              WHEN pc.group_id = '__UNGROUPED__' THEN 'ungrouped'
              ELSE pc.group_id
            END as group_id,
            CASE
              WHEN pc.group_id = '__UNGROUPED__' THEN '未分组'
              ELSE mg.name
            END as group_name,
            pc.role,
            pc.status,
            pc.created_at
           FROM project_collaborators pc
           LEFT JOIN users u ON pc.collaborator_user_id = u.id
           LEFT JOIN monitor_groups mg ON pc.group_id = mg.id
           WHERE pc.id = ?`,
          [existingRecord.id]
        );

        await connection.commit();
        return (rows as ProjectCollaboratorResponse[])[0];
      }
    }

    // 检查被邀请者是否为自己
    const [ownerUser] = await connection.execute(
      'SELECT email FROM users WHERE id = ?',
      [ownerId]
    );

    if ((ownerUser as any[]).length > 0 && (ownerUser as any[])[0].email === email) {
      throw new Error('不能邀请自己');
    }

    // 如果邮箱已注册，自动关联user_id
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    const collaboratorUserId = (existingUser as any[]).length > 0 ? (existingUser as any[])[0].id : null;

    // 创建协作记录
    const [result] = await connection.execute(
      `INSERT INTO project_collaborators
       (id, project_owner_id, collaborator_email, collaborator_user_id, group_id, role, status)
       VALUES (UUID(), ?, ?, ?, ?, ?, 'active')`,
      [ownerId, email, collaboratorUserId, dbGroupId, role]
    );

    // 获取创建的记录
    const [rows] = await connection.execute(
      `SELECT
        pc.id,
        pc.collaborator_email,
        u.username as collaborator_username,
        CASE
          WHEN pc.group_id = '__UNGROUPED__' THEN 'ungrouped'
          ELSE pc.group_id
        END as group_id,
        CASE
          WHEN pc.group_id = '__UNGROUPED__' THEN '未分组'
          ELSE mg.name
        END as group_name,
        pc.role,
        pc.status,
        pc.created_at
       FROM project_collaborators pc
       LEFT JOIN users u ON pc.collaborator_user_id = u.id
       LEFT JOIN monitor_groups mg ON pc.group_id = mg.id
       WHERE pc.project_owner_id = ? AND pc.collaborator_email = ? AND pc.group_id <=> ?`,
      [ownerId, email, dbGroupId]
    );

    await connection.commit();

    return (rows as ProjectCollaboratorResponse[])[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 获取项目的协作者列表
 * @param ownerId 项目所有者ID
 * @returns 协作者列表（包含用户信息）
 */
export async function getCollaborators(
  ownerId: string
): Promise<ProjectCollaboratorResponse[]> {
  const [rows] = await pool.execute(
    `SELECT
      pc.id,
      pc.collaborator_email,
      u.username as collaborator_username,
      CASE
        WHEN pc.group_id = '__UNGROUPED__' THEN 'ungrouped'
        ELSE pc.group_id
      END as group_id,
      CASE
        WHEN pc.group_id = '__UNGROUPED__' THEN '未分组'
        ELSE mg.name
      END as group_name,
      pc.role,
      pc.status,
      pc.created_at
     FROM project_collaborators pc
     LEFT JOIN users u ON pc.collaborator_user_id = u.id
     LEFT JOIN monitor_groups mg ON pc.group_id = mg.id
     WHERE pc.project_owner_id = ?
     ORDER BY pc.created_at DESC`,
    [ownerId]
  );

  return rows as ProjectCollaboratorResponse[];
}

/**
 * 修改协作者权限
 * @param collaboratorId 协作者记录ID
 * @param ownerId 项目所有者ID（用于权限校验）
 * @param updates 更新的字段
 */
export async function updateCollaborator(
  collaboratorId: string,
  ownerId: string,
  updates: {
    role?: CollaboratorRole;
    groupId?: string | null;
  }
): Promise<void> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 验证协作者是否存在且属于该所有者
    const [existing] = await connection.execute(
      'SELECT id FROM project_collaborators WHERE id = ? AND project_owner_id = ?',
      [collaboratorId, ownerId]
    );

    if ((existing as any[]).length === 0) {
      throw new Error('协作者不存在');
    }

    // 构建更新语句
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.role !== undefined) {
      setClauses.push('role = ?');
      values.push(updates.role);
    }

    if (updates.groupId !== undefined) {
      setClauses.push('group_id = ?');
      // 转换 'ungrouped' 为特殊标识
      const dbGroupId = updates.groupId === 'ungrouped' ? '__UNGROUPED__' : updates.groupId;
      values.push(dbGroupId);
    }

    if (setClauses.length === 0) {
      throw new Error('没有要更新的字段');
    }

    values.push(collaboratorId);
    values.push(ownerId);

    await connection.execute(
      `UPDATE project_collaborators SET ${setClauses.join(', ')} WHERE id = ? AND project_owner_id = ?`,
      values
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 移除协作者
 * @param collaboratorId 协作者记录ID
 * @param ownerId 项目所有者ID（用于权限校验）
 */
export async function removeCollaborator(
  collaboratorId: string,
  ownerId: string
): Promise<void> {
  const [result] = await pool.execute(
    'DELETE FROM project_collaborators WHERE id = ? AND project_owner_id = ?',
    [collaboratorId, ownerId]
  );

  if ((result as any).affectedRows === 0) {
    throw new Error('协作者不存在');
  }
}

/**
 * 获取当前用户有权限访问的共享项目
 * @param userId 当前用户ID
 * @param userEmail 当前用户邮箱
 * @returns 共享项目列表
 */
export async function getSharedProjects(
  userId: string,
  userEmail: string
): Promise<SharedProject[]> {
  // 首先更新以email关联但user_id为NULL的协作记录
  await pool.execute(
    `UPDATE project_collaborators
     SET collaborator_user_id = ?
     WHERE collaborator_email = ? AND collaborator_user_id IS NULL`,
    [userId, userEmail]
  );

  // 查询用户有权限访问的共享项目（排除已拒绝的）
  // 使用子查询获取每个项目的最高权限和最早加入时间
  const [rows] = await pool.execute(
    `SELECT
      u.id as owner_id,
      u.username as owner_username,
      u.email as owner_email,
      pc_agg.role,
      pc_agg.group_id,
      mg.name as group_name,
      pc_agg.joined_at
     FROM (
       SELECT
         project_owner_id,
         MAX(CASE WHEN role = 'editor' THEN 'editor' ELSE 'viewer' END) as role,
         group_id,
         MIN(created_at) as joined_at
       FROM project_collaborators
       WHERE (collaborator_user_id = ? OR collaborator_email = ?)
         AND status = 'active'
       GROUP BY project_owner_id, group_id
     ) pc_agg
     JOIN users u ON pc_agg.project_owner_id = u.id
     LEFT JOIN monitor_groups mg ON pc_agg.group_id = mg.id
     LEFT JOIN project_rejections pr ON pr.user_id = ? AND pr.project_owner_id = pc_agg.project_owner_id
     WHERE pr.id IS NULL
     ORDER BY pc_agg.joined_at DESC`,
    [userId, userEmail, userId]
  );

  return rows as SharedProject[];
}

/**
 * 用户拒绝共享项目
 * @param userId 当前用户ID
 * @param ownerId 项目所有者ID
 */
export async function rejectProject(
  userId: string,
  ownerId: string
): Promise<void> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 创建拒绝记录
    await connection.execute(
      `INSERT INTO project_rejections (id, user_id, project_owner_id)
       VALUES (UUID(), ?, ?)
       ON DUPLICATE KEY UPDATE rejected_at = CURRENT_TIMESTAMP`,
      [userId, ownerId]
    );

    // 更新所有相关协作记录的status为'rejected'
    await connection.execute(
      `UPDATE project_collaborators
       SET status = 'rejected'
       WHERE project_owner_id = ?
         AND (collaborator_user_id = ? OR collaborator_email = (
           SELECT email FROM users WHERE id = ?
         ))`,
      [ownerId, userId, userId]
    );

    await connection.commit();

    // 清除权限缓存
    clearPermissionCache(userId, ownerId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 检查用户对项目的权限
 * @param userId 当前用户ID
 * @param userEmail 当前用户邮箱
 * @param ownerId 项目所有者ID
 * @returns 权限检查结果
 */
export async function checkProjectPermission(
  userId: string,
  userEmail: string,
  ownerId: string
): Promise<PermissionCheckResult> {
  // 检查缓存
  const cached = getFromCache(userId, ownerId);
  if (cached) {
    return cached;
  }

  // 1. 检查是否是项目所有者
  if (userId === ownerId) {
    const result: PermissionCheckResult = {
      isOwner: true,
      isCollaborator: false,
      role: null,
      accessibleGroupIds: null, // null表示所有分组
    };
    setCache(userId, ownerId, result);
    return result;
  }

  // 2. 检查是否是协作者
  const [collaborations] = await pool.execute(
    `SELECT id, group_id, role
     FROM project_collaborators
     WHERE project_owner_id = ?
       AND status = 'active'
       AND (collaborator_user_id = ? OR collaborator_email = ?)`,
    [ownerId, userId, userEmail]
  );

  const collabRows = collaborations as any[];

  if (collabRows.length === 0) {
    const result: PermissionCheckResult = {
      isOwner: false,
      isCollaborator: false,
      role: null,
      accessibleGroupIds: null,
    };
    return result;
  }

  // 3. 收集可访问的分组
  const accessibleGroups: (string | null)[] = [];
  let role: CollaboratorRole = 'viewer';

  for (const collab of collabRows) {
    // 转换 '__UNGROUPED__' 为 'ungrouped'
    const groupId = collab.group_id === '__UNGROUPED__' ? 'ungrouped' : collab.group_id;
    accessibleGroups.push(groupId);
    // 如果有任何一个协作记录是editor，则赋予editor权限
    if (collab.role === 'editor') {
      role = 'editor';
    }
  }

  // 如果包含null（全部分组权限），则设为null
  // 如果包含 'ungrouped'，表示只能访问未分组的监控项
  // 否则转换为字符串数组
  let accessibleGroupIds: string[] | null;
  if (accessibleGroups.includes(null)) {
    accessibleGroupIds = null; // 全部分组
  } else if (accessibleGroups.includes('ungrouped')) {
    accessibleGroupIds = ['ungrouped']; // 仅未分组
  } else {
    accessibleGroupIds = accessibleGroups.filter((g): g is string => g !== null && g !== 'ungrouped');
  }

  const result: PermissionCheckResult = {
    isOwner: false,
    isCollaborator: true,
    role,
    accessibleGroupIds,
  };

  setCache(userId, ownerId, result);
  return result;
}

/**
 * 检查用户是否有权限访问特定监控项
 * @param monitorId 监控项ID
 * @param ownerId 项目所有者ID
 * @param accessibleGroupIds 可访问分组列表
 * @returns 是否有权限
 */
export async function canAccessMonitor(
  monitorId: string,
  ownerId: string,
  accessibleGroupIds: string[] | null
): Promise<boolean> {
  // 可以访问所有分组
  if (accessibleGroupIds === null) {
    return true;
  }

  const [rows] = await pool.execute(
    'SELECT group_id FROM monitors WHERE id = ? AND owner_id = ?',
    [monitorId, ownerId]
  );

  if ((rows as any[]).length === 0) {
    return false;
  }

  const monitorGroupId = (rows as any[])[0].group_id;

  // 未分组监控项 - 所有协作者都可以访问
  if (monitorGroupId === null) {
    return true;
  }

  // 检查是否在可访问分组列表中
  return accessibleGroupIds.includes(monitorGroupId);
}

/**
 * 用户注册时自动匹配协作关系
 * @param userId 新注册用户ID
 * @param email 用户邮箱
 */
export async function linkCollaborationsOnRegistration(
  userId: string,
  email: string
): Promise<void> {
  // 更新以该邮箱关联的协作记录，填充 user_id
  await pool.execute(
    `UPDATE project_collaborators
     SET collaborator_user_id = ?
     WHERE collaborator_email = ?
       AND collaborator_user_id IS NULL
       AND status = 'active'`,
    [userId, email]
  );
}

import type { Request } from 'express';
import pool from '../lib/db';

/**
 * 构建监控项查询的分组过滤条件
 * @param req Express请求对象
 * @returns SQL条件字符串和参数
 */
export function buildGroupFilter(req: Request): { condition: string; params: any[] } {
  const { isOwner, accessibleGroupIds } = req.projectContext || {};

  // 所有者可以查看所有监控项
  if (isOwner) {
    return { condition: '', params: [] };
  }

  // 协作者根据分组权限过滤
  if (accessibleGroupIds === null) {
    // 可以访问所有分组
    return { condition: '', params: [] };
  }

  if (!accessibleGroupIds || accessibleGroupIds.length === 0) {
    // 只能访问未分组的监控项
    return { condition: 'AND m.group_id IS NULL', params: [] };
  }

  // 检查是否仅访问未分组 ('ungrouped')
  if (accessibleGroupIds.length === 1 && accessibleGroupIds[0] === 'ungrouped') {
    return { condition: 'AND m.group_id IS NULL', params: [] };
  }

  // 可以访问指定分组 + 未分组
  const placeholders = accessibleGroupIds.map(() => '?').join(',');
  return {
    condition: `AND (m.group_id IS NULL OR m.group_id IN (${placeholders}))`,
    params: accessibleGroupIds,
  };
}

/**
 * 构建分组查询的过滤条件
 * @param req Express请求对象
 * @returns SQL条件字符串和参数
 */
export function buildGroupQueryFilter(req: Request): { condition: string; params: any[] } {
  const { isOwner, accessibleGroupIds } = req.projectContext || {};

  if (isOwner || accessibleGroupIds === null) {
    return { condition: '', params: [] };
  }

  if (!accessibleGroupIds || accessibleGroupIds.length === 0) {
    // 无分组权限，返回空结果
    return { condition: 'AND 1=0', params: [] };
  }

  // 检查是否仅访问未分组 ('ungrouped')
  if (accessibleGroupIds.length === 1 && accessibleGroupIds[0] === 'ungrouped') {
    // 仅未分组权限，不返回任何分组
    return { condition: 'AND 1=0', params: [] };
  }

  const placeholders = accessibleGroupIds.map(() => '?').join(',');
  return {
    condition: `AND id IN (${placeholders})`,
    params: accessibleGroupIds,
  };
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
 * 构建监控项查询的完整WHERE条件
 * @param req Express请求对象
 * @param ownerId 项目所有者ID
 * @returns 查询条件和参数
 */
export function buildMonitorQueryConditions(
  req: Request,
  ownerId: string
): { whereClause: string; params: any[] } {
  const baseWhere = 'WHERE m.owner_id = ?';
  const baseParams: any[] = [ownerId];

  const { condition, params } = buildGroupFilter(req);

  return {
    whereClause: `${baseWhere} ${condition}`,
    params: [...baseParams, ...params],
  };
}

/**
 * 构建分组查询的完整WHERE条件
 * @param req Express请求对象
 * @param ownerId 项目所有者ID
 * @returns 查询条件和参数
 */
export function buildGroupQueryConditions(
  req: Request,
  ownerId: string
): { whereClause: string; params: any[] } {
  const baseWhere = 'WHERE owner_id = ?';
  const baseParams: any[] = [ownerId];

  const { condition, params } = buildGroupQueryFilter(req);

  return {
    whereClause: `${baseWhere} ${condition}`,
    params: [...baseParams, ...params],
  };
}

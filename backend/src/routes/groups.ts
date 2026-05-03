import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { execute, query } from '../lib/db';
import { success, created } from '../utils/api-response';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors';

const router = Router();

// Group interface
interface Group {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  color: string;
  is_default: boolean;
  sort_order: number;
  monitor_count?: number;
  health_summary?: {
    normal: number;
    warning: number;
    critical: number;
  };
}

// Default group colors
const DEFAULT_GROUP_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6B7280', // gray
];

// Get or create default group for user
export async function getOrCreateDefaultGroup(userId: string): Promise<Group> {
  const existing = await query(
    'SELECT * FROM monitor_groups WHERE owner_id = ? AND is_default = TRUE',
    [userId]
  );

  if (existing && existing.length > 0) {
    return existing[0] as Group;
  }

  // Create default group
  const id = uuidv4();
  await execute(
    `INSERT INTO monitor_groups (id, owner_id, name, description, color, is_default, sort_order)
     VALUES (?, ?, ?, ?, ?, TRUE, 0)`,
    [id, userId, '未分组', '默认分组，未分类的监控项', '#6B7280']
  );

  return {
    id,
    owner_id: userId,
    name: '未分组',
    description: '默认分组，未分类的监控项',
    color: '#6B7280',
    is_default: true,
    sort_order: 0,
    monitor_count: 0,
    health_summary: { normal: 0, warning: 0, critical: 0 }
  };
}

// Get all groups for current user
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    // Ensure default group exists
    await getOrCreateDefaultGroup(userId);

    // Get all groups with monitor counts and health summary
    const groups = await query(
      `SELECT
        g.id,
        g.name,
        g.description,
        g.color,
        g.is_default,
        g.sort_order,
        g.created_at,
        g.updated_at,
        COUNT(m.id) as monitor_count,
        SUM(CASE WHEN m.health_status = 'normal' THEN 1 ELSE 0 END) as normal_count,
        SUM(CASE WHEN m.health_status = 'warning' THEN 1 ELSE 0 END) as warning_count,
        SUM(CASE WHEN m.health_status = 'critical' THEN 1 ELSE 0 END) as critical_count
      FROM monitor_groups g
      LEFT JOIN monitors m ON m.group_id = g.id AND m.status = 'active'
      WHERE g.owner_id = ?
      GROUP BY g.id
      ORDER BY g.is_default DESC, g.sort_order ASC, g.updated_at DESC`,
      [userId]
    );

    const formattedGroups = groups.map((g: any) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      color: g.color,
      is_default: g.is_default === 1,
      sort_order: g.sort_order,
      monitor_count: parseInt(g.monitor_count) || 0,
      health_summary: {
        normal: parseInt(g.normal_count) || 0,
        warning: parseInt(g.warning_count) || 0,
        critical: parseInt(g.critical_count) || 0
      },
      created_at: g.created_at,
      updated_at: g.updated_at
    }));

    success(res, { items: formattedGroups, total: formattedGroups.length });
  } catch (error) {
    next(error);
  }
});

// Get single group by ID
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const groups = await query(
      `SELECT
        g.*,
        COUNT(m.id) as monitor_count,
        SUM(CASE WHEN m.health_status = 'normal' THEN 1 ELSE 0 END) as normal_count,
        SUM(CASE WHEN m.health_status = 'warning' THEN 1 ELSE 0 END) as warning_count,
        SUM(CASE WHEN m.health_status = 'critical' THEN 1 ELSE 0 END) as critical_count
      FROM monitor_groups g
      LEFT JOIN monitors m ON m.group_id = g.id AND m.status = 'active'
      WHERE g.id = ? AND g.owner_id = ?
      GROUP BY g.id`,
      [id, userId]
    );

    if (!groups || groups.length === 0) {
      throw new NotFoundError('分组不存在');
    }

    const group = groups[0] as any;
    success(res, {
      id: group.id,
      name: group.name,
      description: group.description,
      color: group.color,
      is_default: group.is_default === 1,
      sort_order: group.sort_order,
      monitor_count: parseInt(group.monitor_count) || 0,
      health_summary: {
        normal: parseInt(group.normal_count) || 0,
        warning: parseInt(group.warning_count) || 0,
        critical: parseInt(group.critical_count) || 0
      },
      created_at: group.created_at,
      updated_at: group.updated_at
    });
  } catch (error) {
    next(error);
  }
});

// Create new group
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { name, description, color } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      throw new ValidationError('分组名称不能为空');
    }

    if (name.length > 50) {
      throw new ValidationError('分组名称最多50个字符');
    }

    if (description && description.length > 200) {
      throw new ValidationError('分组描述最多200个字符');
    }

    // Check group count limit
    const countResult = await query(
      'SELECT COUNT(*) as count FROM monitor_groups WHERE owner_id = ?',
      [userId]
    );

    if ((countResult[0] as any).count >= 50) {
      throw new ValidationError('最多只能创建50个分组');
    }

    // Check name uniqueness
    const existing = await query(
      'SELECT id FROM monitor_groups WHERE owner_id = ? AND name = ?',
      [userId, name.trim()]
    );

    if (existing && existing.length > 0) {
      throw new ConflictError('分组名称已存在');
    }

    // Get max sort_order
    const maxSortResult = await query(
      'SELECT MAX(sort_order) as max_sort FROM monitor_groups WHERE owner_id = ?',
      [userId]
    );
    const sortOrder = ((maxSortResult[0] as any).max_sort || 0) + 1;

    // Use provided color or random from defaults
    const groupColor = color && DEFAULT_GROUP_COLORS.includes(color)
      ? color
      : DEFAULT_GROUP_COLORS[Math.floor(Math.random() * DEFAULT_GROUP_COLORS.length)];

    const id = uuidv4();
    await execute(
      `INSERT INTO monitor_groups (id, owner_id, name, description, color, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, name.trim(), description || null, groupColor, sortOrder]
    );

    const newGroup = await query(
      'SELECT * FROM monitor_groups WHERE id = ?',
      [id]
    );

    const groupData = newGroup[0] as any;
    created(res, {
      id: groupData.id,
      name: groupData.name,
      description: groupData.description,
      color: groupData.color,
      is_default: false,
      sort_order: groupData.sort_order,
      monitor_count: 0,
      health_summary: { normal: 0, warning: 0, critical: 0 },
      created_at: groupData.created_at,
      updated_at: groupData.updated_at
    }, '分组创建成功');
  } catch (error) {
    next(error);
  }
});

// Update group
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { name, description, color } = req.body;

    // Check if group exists and belongs to user
    const existing = await query(
      'SELECT * FROM monitor_groups WHERE id = ? AND owner_id = ?',
      [id, userId]
    );

    if (!existing || existing.length === 0) {
      throw new NotFoundError('分组不存在');
    }

    const existingGroup = existing[0] as any;

    // Cannot modify default group
    if (existingGroup.is_default) {
      throw new ValidationError('默认分组不能修改');
    }

    // Validation
    if (name !== undefined) {
      if (name.trim().length === 0) {
        throw new ValidationError('分组名称不能为空');
      }

      if (name.length > 50) {
        throw new ValidationError('分组名称最多50个字符');
      }

      // Check name uniqueness (excluding current group)
      const nameCheck = await query(
        'SELECT id FROM monitor_groups WHERE owner_id = ? AND name = ? AND id != ?',
        [userId, name.trim(), id]
      );

      if (nameCheck && nameCheck.length > 0) {
        throw new ConflictError('分组名称已存在');
      }
    }

    if (description !== undefined && description.length > 200) {
      throw new ValidationError('分组描述最多200个字符');
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (color !== undefined) {
      const groupColor = DEFAULT_GROUP_COLORS.includes(color) ? color : existingGroup.color;
      updates.push('color = ?');
      values.push(groupColor);
    }

    if (updates.length === 0) {
      throw new ValidationError('没有要更新的字段');
    }

    values.push(id);

    await execute(
      `UPDATE monitor_groups SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updatedGroup = await query(
      `SELECT
        g.*,
        COUNT(m.id) as monitor_count,
        SUM(CASE WHEN m.health_status = 'normal' THEN 1 ELSE 0 END) as normal_count,
        SUM(CASE WHEN m.health_status = 'warning' THEN 1 ELSE 0 END) as warning_count,
        SUM(CASE WHEN m.health_status = 'critical' THEN 1 ELSE 0 END) as critical_count
      FROM monitor_groups g
      LEFT JOIN monitors m ON m.group_id = g.id AND m.status = 'active'
      WHERE g.id = ?
      GROUP BY g.id`,
      [id]
    );

    const groupData = updatedGroup[0] as any;
    success(res, {
      id: groupData.id,
      name: groupData.name,
      description: groupData.description,
      color: groupData.color,
      is_default: groupData.is_default === 1,
      sort_order: groupData.sort_order,
      monitor_count: parseInt(groupData.monitor_count) || 0,
      health_summary: {
        normal: parseInt(groupData.normal_count) || 0,
        warning: parseInt(groupData.warning_count) || 0,
        critical: parseInt(groupData.critical_count) || 0
      },
      created_at: groupData.created_at,
      updated_at: groupData.updated_at
    }, '分组更新成功');
  } catch (error) {
    next(error);
  }
});

// Delete group
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Check if group exists and belongs to user
    const existing = await query(
      'SELECT * FROM monitor_groups WHERE id = ? AND owner_id = ?',
      [id, userId]
    );

    if (!existing || existing.length === 0) {
      throw new NotFoundError('分组不存在');
    }

    // Cannot delete default group
    if ((existing[0] as any).is_default) {
      throw new ValidationError('默认分组不能删除');
    }

    // Get default group ID
    const defaultGroup = await getOrCreateDefaultGroup(userId);

    // Move monitors to default group
    await execute(
      'UPDATE monitors SET group_id = ? WHERE group_id = ?',
      [defaultGroup.id, id]
    );

    // Delete group
    await execute('DELETE FROM monitor_groups WHERE id = ?', [id]);

    success(res, null, '分组删除成功，相关监控项已移动到未分组');
  } catch (error) {
    next(error);
  }
});

// Move monitors to group
router.post('/:id/monitors', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { monitor_ids } = req.body;

    if (!monitor_ids || !Array.isArray(monitor_ids) || monitor_ids.length === 0) {
      throw new ValidationError('请选择要移动的监控项');
    }

    if (monitor_ids.length > 100) {
      throw new ValidationError('一次最多移动100个监控项');
    }

    // Check if group exists and belongs to user
    const group = await query(
      'SELECT id FROM monitor_groups WHERE id = ? AND owner_id = ?',
      [id, userId]
    );

    if (!group || group.length === 0) {
      throw new NotFoundError('分组不存在');
    }

    // Check if monitors belong to user
    const placeholders = monitor_ids.map(() => '?').join(',');
    const monitors = await query(
      `SELECT id FROM monitors WHERE id IN (${placeholders}) AND owner_id = ?`,
      [...monitor_ids, userId]
    );

    if (monitors.length !== monitor_ids.length) {
      throw new ValidationError('部分监控项不存在或无权限');
    }

    // Update monitors
    await execute(
      `UPDATE monitors SET group_id = ? WHERE id IN (${placeholders})`,
      [id, ...monitor_ids]
    );

    success(res, { moved_count: monitor_ids.length }, '监控项移动成功');
  } catch (error) {
    next(error);
  }
});

// Get monitors in group
router.get('/:id/monitors', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Check if group exists and belongs to user
    const group = await query(
      'SELECT id FROM monitor_groups WHERE id = ? AND owner_id = ?',
      [id, userId]
    );

    if (!group || group.length === 0) {
      throw new NotFoundError('分组不存在');
    }

    // Get monitors in group
    const monitors = await query(
      `SELECT
        m.*,
        w.name as webhook_name
      FROM monitors m
      LEFT JOIN webhooks w ON m.webhook_id = w.id
      WHERE m.group_id = ? AND m.owner_id = ?
      ORDER BY m.updated_at DESC
      LIMIT ? OFFSET ?`,
      [id, userId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM monitors WHERE group_id = ? AND owner_id = ?',
      [id, userId]
    );

    const total = (countResult[0] as any).total;

    success(res, {
      items: monitors.map((m: any) => ({
        ...m,
        headers: m.headers ? JSON.parse(m.headers) : {},
        group_id: id
      })),
      total,
      page,
      limit
    });
  } catch (error) {
    next(error);
  }
});

export default router;

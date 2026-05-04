# Plan-12: 多人协作功能 - Phase 3: 权限中间件与数据隔离

> **计划版本**: v1.0  
> **创建日期**: 2026-05-04  
> **对应PRD**: [多人协作管理项目监测 - 增强需求文档](../multi-user-collaboration-prd.md)  
> **前置计划**: [Plan-11: 后端API开发](./plan-11-multi-user-collaboration-phase2.md)

---

## 1. 阶段目标

本阶段实现权限检查中间件和数据隔离机制，确保协作者只能访问被授权的资源。

### 1.1 核心交付物

| 交付物 | 说明 |
|-------|------|
| `permission.ts` 中间件 | 权限检查中间件 |
| `project-context.ts` 中间件 | 项目上下文中间件 |
| 监控项路由改造 | 支持按项目所有者访问 |
| 分组路由改造 | 支持分组权限控制 |
| 历史记录路由改造 | 支持数据隔离 |

### 1.2 权限控制流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         权限控制流程图                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   用户请求                                                                  │
│       │                                                                     │
│       ▼                                                                     │
│   ┌─────────────┐                                                           │
│   │  认证中间件  │  验证Token，获取userId, username, email                   │
│   └─────────────┘                                                           │
│       │                                                                     │
│       ▼                                                                     │
│   ┌─────────────┐                                                           │
│   │ 项目上下文   │  从URL参数获取ownerId，确定访问的项目                      │
│   │ 中间件      │  默认使用当前用户作为owner                                  │
│   └─────────────┘                                                           │
│       │                                                                     │
│       ▼                                                                     │
│   ┌─────────────┐                                                           │
│   │  权限检查    │  检查用户是owner/collaborator/none                         │
│   │  中间件      │  如果是collaborator，获取role和accessibleGroupIds         │
│   └─────────────┘                                                           │
│       │                                                                     │
│       ├── 无权限 ──────▶ 返回403                                             │
│       │                                                                     │
│       ├── 是Owner ─────▶ 允许访问所有数据                                    │
│       │                                                                     │
│       └── 是Collaborator ──▶ 应用数据隔离                                    │
│                              • 只读/编辑权限检查                             │
│                              • 分组范围过滤                                  │
│                              • 监控项列表过滤                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 实现任务清单

### 任务 1: 创建权限检查中间件

**文件**: `backend/src/middleware/permission.ts` (新建)

#### 2.1.1 中间件基础结构
```typescript
import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../lib/db';
import { forbidden, unauthorized } from '../utils/api-response';
import type { PermissionCheckResult, CollaboratorRole } from '../types';

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
```

#### 2.1.2 项目上下文中间件
```typescript
/**
 * 项目上下文中间件
 * 从URL参数或查询参数中获取要访问的项目所有者ID
 * 默认使用当前登录用户作为所有者
 */
export function projectContext(
  paramName: string = 'ownerId'
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const targetOwnerId = req.params[paramName] || req.query.ownerId || req.user?.userId;
    
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
```

#### 2.1.3 权限检查中间件
```typescript
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
  const pool = getPool();
  
  // 查询协作记录（通过user_id或email）
  const [collaborations] = await pool.execute(
    `SELECT id, group_id, role 
     FROM project_collaborators 
     WHERE project_owner_id = ? 
       AND status = 'active'
       AND (collaborator_user_id = ? OR collaborator_email = ?)`,
    [targetOwnerId, currentUserId, currentUserEmail]
  );
  
  if ((collaborations as any[]).length === 0) {
    return forbidden(res, '您没有权限访问此项目');
  }
  
  // 3. 收集可访问的分组
  const accessibleGroups: (string | null)[] = [];
  let role: CollaboratorRole = 'viewer';
  
  for (const collab of collaborations as any[]) {
    accessibleGroups.push(collab.group_id);
    // 如果有任何一个协作记录是editor，则赋予editor权限
    if (collab.role === 'editor') {
      role = 'editor';
    }
  }
  
  req.projectContext.isCollaborator = true;
  req.projectContext.role = role;
  
  // 如果包含null（全部分组权限），则设为null
  // 否则转换为字符串数组
  if (accessibleGroups.includes(null)) {
    req.projectContext.accessibleGroupIds = null;
  } else {
    req.projectContext.accessibleGroupIds = accessibleGroups.filter((g): g is string => g !== null);
  }
  
  next();
}
```

#### 2.1.4 权限级别检查中间件
```typescript
/**
 * 要求特定权限级别
 * @param requiredRole 最低要求的权限级别
 */
export function requireRole(
  requiredRole: 'viewer' | 'editor' | 'owner'
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
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
```

**验收标准**:
- [ ] 中间件能正确识别owner/collaborator
- [ ] 能正确计算可访问分组范围
- [ ] 权限不足时返回403
- [ ] 未认证时返回401

---

### 任务 2: 创建数据隔离工具函数

**文件**: `backend/src/utils/data-isolation.ts` (新建)

#### 2.2.1 构建分组过滤条件
```typescript
import type { Request } from 'express';

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
  
  if (accessibleGroupIds.length === 0) {
    // 只能访问未分组的监控项
    return { condition: 'AND m.group_id IS NULL', params: [] };
  }
  
  // 可以访问指定分组 + 未分组
  const placeholders = accessibleGroupIds.map(() => '?').join(',');
  return {
    condition: `AND (m.group_id IS NULL OR m.group_id IN (${placeholders}))`,
    params: accessibleGroupIds,
  };
}
```

#### 2.2.2 构建分组查询条件
```typescript
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
  
  if (accessibleGroupIds.length === 0) {
    // 无分组权限，返回空结果
    return { condition: 'AND 1=0', params: [] };
  }
  
  const placeholders = accessibleGroupIds.map(() => '?').join(',');
  return {
    condition: `AND id IN (${placeholders})`,
    params: accessibleGroupIds,
  };
}
```

#### 2.2.3 检查监控项访问权限
```typescript
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
  
  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT group_id FROM monitors WHERE id = ? AND owner_id = ?',
    [monitorId, ownerId]
  );
  
  if ((rows as any[]).length === 0) {
    return false;
  }
  
  const monitorGroupId = (rows as any[])[0].group_id;
  
  // 未分组监控项
  if (monitorGroupId === null) {
    return true; // 所有协作者都可以访问未分组监控项
  }
  
  // 检查是否在可访问分组列表中
  return accessibleGroupIds.includes(monitorGroupId);
}
```

**验收标准**:
- [ ] 工具函数能正确构建过滤条件
- [ ] 支持各种分组权限场景
- [ ] 单元测试覆盖

---

### 任务 3: 改造监控项路由

**文件**: `backend/src/routes/monitors.ts` (修改)

#### 2.3.1 添加项目上下文支持
```typescript
import { projectContext, checkProjectPermission, requireRole } from '../middleware/permission';
import { buildGroupFilter } from '../utils/data-isolation';

// 获取监控项列表 - 支持查看其他用户的监控项（如果是协作者）
router.get('/', 
  optionalAuth,
  projectContext('ownerId'),
  checkProjectPermission,
  async (req, res) => {
    try {
      const { ownerId } = req.projectContext!;
      const { condition: groupFilter, params: groupParams } = buildGroupFilter(req);
      
      const pool = getPool();
      const [monitors] = await pool.execute(
        `SELECT m.*, w.name as webhook_name, w.webhook_url 
         FROM monitors m
         LEFT JOIN webhooks w ON m.webhook_id = w.id
         WHERE m.owner_id = ? ${groupFilter}
         ORDER BY m.created_at DESC`,
        [ownerId, ...groupParams]
      );
      
      success(res, monitors);
    } catch (err) {
      errorResponse(res, '获取监控项失败', 500);
    }
  }
);
```

#### 2.3.2 创建监控项权限控制
```typescript
// 创建监控项 - 需要编辑权限
router.post('/', 
  authenticate,
  projectContext(),
  checkProjectPermission,
  requireRole('editor'),
  [...validationRules, validate],
  async (req, res) => {
    // ... 原有创建逻辑
    // 注意：如果协作者创建监控项，owner_id应该是项目所有者，而不是当前用户
    const ownerId = req.projectContext!.ownerId;
    // ...
  }
);
```

#### 2.3.3 更新/删除监控项权限控制
```typescript
// 更新监控项 - 需要编辑权限
router.put('/:id',
  authenticate,
  projectContext(),
  checkProjectPermission,
  requireRole('editor'),
  [param('id').isUUID(), ...validationRules, validate],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { ownerId, accessibleGroupIds } = req.projectContext!;
      
      // 检查是否有权限访问此监控项
      const canAccess = await canAccessMonitor(id, ownerId, accessibleGroupIds);
      if (!canAccess) {
        return forbidden(res, '您没有权限修改此监控项');
      }
      
      // ... 原有更新逻辑
    } catch (err) {
      errorResponse(res, '更新监控项失败', 500);
    }
  }
);
```

**验收标准**:
- [ ] 监控项列表按分组权限过滤
- [ ] 创建监控项需要编辑权限
- [ ] 修改监控项需要编辑权限且在该分组范围内
- [ ] 只读用户无法修改监控项

---

### 任务 4: 改造分组路由

**文件**: `backend/src/routes/groups.ts` (修改)

```typescript
import { projectContext, checkProjectPermission } from '../middleware/permission';
import { buildGroupQueryFilter } from '../utils/data-isolation';

// 获取分组列表
router.get('/',
  authenticate,
  projectContext(),
  checkProjectPermission,
  async (req, res) => {
    try {
      const { ownerId, isOwner } = req.projectContext!;
      const { condition: groupFilter, params: groupParams } = buildGroupQueryFilter(req);
      
      const pool = getPool();
      
      // 所有者可以看到所有分组，协作者只能看到授权的分组
      const [groups] = await pool.execute(
        `SELECT * FROM monitor_groups 
         WHERE owner_id = ? ${groupFilter}
         ORDER BY sort_order ASC, created_at ASC`,
        [ownerId, ...groupParams]
      );
      
      success(res, groups);
    } catch (err) {
      errorResponse(res, '获取分组列表失败', 500);
    }
  }
);

// 创建/编辑/删除分组 - 仅所有者可用
router.post('/',
  authenticate,
  projectContext(),
  checkProjectPermission,
  requireRole('owner'),  // 只有所有者可以管理分组
  [...validationRules, validate],
  async (req, res) => {
    // ... 原有逻辑
  }
);
```

**验收标准**:
- [ ] 协作者只能看到授权的分组
- [ ] 只有所有者可以创建/编辑/删除分组

---

### 任务 5: 改造历史记录路由

**文件**: `backend/src/routes/history.ts` (修改)

```typescript
import { projectContext, checkProjectPermission } from '../middleware/permission';
import { buildGroupFilter } from '../utils/data-isolation';

// 获取探测历史
router.get('/checks',
  authenticate,
  projectContext(),
  checkProjectPermission,
  async (req, res) => {
    try {
      const { ownerId } = req.projectContext!;
      const { condition: groupFilter, params: groupParams } = buildGroupFilter(req);
      const { monitorId, page = 1, pageSize = 20 } = req.query;
      
      const pool = getPool();
      let query = `
        SELECT cl.*, m.name as monitor_name, m.group_id
        FROM check_logs cl
        JOIN monitors m ON cl.monitor_id = m.id
        WHERE m.owner_id = ? ${groupFilter}
      `;
      const params: any[] = [ownerId, ...groupParams];
      
      if (monitorId) {
        query += ' AND cl.monitor_id = ?';
        params.push(monitorId);
      }
      
      query += ' ORDER BY cl.checked_at DESC LIMIT ? OFFSET ?';
      params.push(Number(pageSize), (Number(page) - 1) * Number(pageSize));
      
      const [logs] = await pool.execute(query, params);
      success(res, logs);
    } catch (err) {
      errorResponse(res, '获取历史记录失败', 500);
    }
  }
);

// 获取告警历史
router.get('/alerts',
  authenticate,
  projectContext(),
  checkProjectPermission,
  async (req, res) => {
    // 类似实现，添加分组过滤
  }
);
```

**验收标准**:
- [ ] 历史记录按分组权限过滤
- [ ] 协作者只能看到授权监控项的历史

---

### 任务 6: 创建项目切换API

**文件**: `backend/src/routes/projects.ts` (新建)

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { projectContext, checkProjectPermission, requireRole } from '../middleware/permission';
import { success, error as errorResponse } from '../utils/api-response';
import { getPool } from '../lib/db';
import { buildGroupFilter } from '../utils/data-isolation';

const router = Router();
router.use(authenticate);

// 获取指定项目的监控项（用于协作者切换项目）
router.get('/:ownerId/monitors',
  projectContext('ownerId'),
  checkProjectPermission,
  async (req, res) => {
    try {
      const { ownerId } = req.projectContext!;
      const { condition: groupFilter, params: groupParams } = buildGroupFilter(req);
      
      const pool = getPool();
      const [monitors] = await pool.execute(
        `SELECT m.*, g.name as group_name
         FROM monitors m
         LEFT JOIN monitor_groups g ON m.group_id = g.id
         WHERE m.owner_id = ? ${groupFilter}
         ORDER BY m.created_at DESC`,
        [ownerId, ...groupParams]
      );
      
      success(res, monitors);
    } catch (err) {
      errorResponse(res, '获取监控项失败', 500);
    }
  }
);

// 获取指定项目的分组
router.get('/:ownerId/groups',
  projectContext('ownerId'),
  checkProjectPermission,
  async (req, res) => {
    try {
      const { ownerId } = req.projectContext!;
      const { condition: groupFilter, params: groupParams } = buildGroupQueryFilter(req);
      
      const pool = getPool();
      const [groups] = await pool.execute(
        `SELECT * FROM monitor_groups 
         WHERE owner_id = ? ${groupFilter}
         ORDER BY sort_order ASC`,
        [ownerId, ...groupParams]
      );
      
      success(res, groups);
    } catch (err) {
      errorResponse(res, '获取分组失败', 500);
    }
  }
);

export default router;
```

在 `backend/src/index.ts` 注册:
```typescript
import projectsRouter from './routes/projects';
app.use('/api/projects', projectsRouter);
```

**验收标准**:
- [ ] 项目切换API正常工作
- [ ] 返回的数据按权限过滤

---

## 3. 验证方式

### 3.1 权限测试场景

| 场景 | 预期结果 |
|-----|---------|
| 所有者访问自己的监控项 | 可以看到所有监控项 |
| 协作者(group_id=null)访问 | 可以看到所有监控项 |
| 协作者(group_id=具体ID)访问 | 只能看到该分组的监控项 |
| 协作者尝试创建监控项 | 需要editor权限，且只能创建在授权分组 |
| 只读协作者尝试修改监控项 | 返回403 |
| 协作者尝试删除分组 | 返回403 |
| 未授权用户访问 | 返回403 |

### 3.2 测试用例

创建测试文件: `backend/src/__tests__/unit/middleware/permission.test.ts`

```typescript
describe('Permission Middleware', () => {
  describe('checkProjectPermission', () => {
    it('should allow owner to access all resources', async () => {
      // 测试所有者访问
    });
    
    it('should allow collaborator with full access', async () => {
      // 测试group_id=null的协作者
    });
    
    it('should restrict collaborator to specific groups', async () => {
      // 测试指定分组的协作者
    });
    
    it('should deny access to unauthorized users', async () => {
      // 测试无权限用户
    });
  });
  
  describe('requireRole', () => {
    it('should allow owner for owner-only actions', async () => {
      // 测试所有者权限
    });
    
    it('should deny editor for owner-only actions', async () => {
      // 测试编辑者无法执行所有者操作
    });
    
    it('should deny viewer for editor actions', async () => {
      // 测试只读者无法执行编辑操作
    });
  });
});
```

---

## 4. 依赖与前置条件

| 依赖项 | 状态 | 说明 |
|-------|:----:|------|
| Plan-11完成 | ⏳ | API服务层已完成 |
| 认证中间件 | ✅ | 已存在 |
| 监控项路由 | ✅ | 已存在 |
| 分组路由 | ✅ | 已存在 |

---

## 5. 注意事项

1. **性能优化**: 权限检查涉及数据库查询，考虑添加缓存
2. **SQL注入防护**: 所有动态查询使用参数化查询
3. **边界情况**: 处理协作者记录存在但用户未注册的情况
4. **并发安全**: 权限变更时的并发访问处理

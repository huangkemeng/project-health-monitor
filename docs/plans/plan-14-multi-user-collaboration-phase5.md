# Plan-14: 多人协作功能 - Phase 5: 集成测试与优化

> **计划版本**: v1.0  
> **创建日期**: 2026-05-04  
> **对应PRD**: [多人协作管理项目监测 - 增强需求文档](../multi-user-collaboration-prd.md)  
> **前置计划**: [Plan-13: 前端UI开发](./plan-13-multi-user-collaboration-phase4.md)

---

## 1. 阶段目标

本阶段完成多人协作功能的集成测试、性能优化和问题修复，确保功能稳定可靠。

### 1.1 核心交付物

| 交付物 | 说明 |
|-------|------|
| 单元测试套件 | 服务层、中间件单元测试 |
| 集成测试套件 | API端到端测试 |
| 性能优化 | 查询优化、缓存策略 |
| 安全加固 | 权限边界检查、SQL注入防护 |
| 文档更新 | API文档、部署说明 |

---

## 2. 实现任务清单

### 任务 1: 编写单元测试 - 服务层

**文件**: `backend/src/__tests__/unit/services/collaboration.test.ts` (新建)

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as collaborationService from '../../../services/collaboration';
import { getPool } from '../../../lib/db';

jest.mock('../../../lib/db');

describe('Collaboration Service', () => {
  let mockPool: any;
  let mockConnection: any;

  beforeEach(() => {
    mockConnection = {
      execute: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };
    mockPool = {
      execute: jest.fn(),
      getConnection: jest.fn().mockResolvedValue(mockConnection),
    };
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  describe('inviteCollaborator', () => {
    it('should create collaboration record successfully', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[]]) // No existing collaboration
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([[{ id: 'collab-1', ... }]]);

      const result = await collaborationService.inviteCollaborator(
        'owner-1',
        'test@example.com',
        'viewer',
        null
      );

      expect(result).toBeDefined();
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should throw error if collaboration already exists', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ id: 'existing' }]]);

      await expect(
        collaborationService.inviteCollaborator('owner-1', 'test@example.com', 'viewer', null)
      ).rejects.toThrow('该用户已被邀请到此分组');
    });

    it('should not allow inviting self', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ id: 'owner-1' }]]);

      await expect(
        collaborationService.inviteCollaborator('owner-1', 'owner@example.com', 'viewer', null)
      ).rejects.toThrow('不能邀请自己');
    });
  });

  describe('getCollaborators', () => {
    it('should return list of collaborators', async () => {
      const mockCollaborators = [
        { id: '1', collaborator_email: 'user1@example.com', role: 'viewer', group_id: null },
        { id: '2', collaborator_email: 'user2@example.com', role: 'editor', group_id: 'group-1' },
      ];
      mockPool.execute.mockResolvedValueOnce([mockCollaborators]);

      const result = await collaborationService.getCollaborators('owner-1');

      expect(result).toHaveLength(2);
      expect(result[0].collaborator_email).toBe('user1@example.com');
    });
  });

  describe('checkProjectPermission', () => {
    it('should return owner permissions for project owner', async () => {
      const result = await collaborationService.checkProjectPermission(
        'owner-1',
        'owner@example.com',
        'owner-1'
      );

      expect(result.isOwner).toBe(true);
      expect(result.accessibleGroupIds).toBeNull();
    });

    it('should return collaborator permissions', async () => {
      mockPool.execute.mockResolvedValueOnce([
        [{ group_id: 'group-1', role: 'editor' }],
      ]);

      const result = await collaborationService.checkProjectPermission(
        'user-1',
        'user@example.com',
        'owner-1'
      );

      expect(result.isCollaborator).toBe(true);
      expect(result.role).toBe('editor');
      expect(result.accessibleGroupIds).toEqual(['group-1']);
    });

    it('should return no permissions for unauthorized user', async () => {
      mockPool.execute.mockResolvedValueOnce([[]]);

      const result = await collaborationService.checkProjectPermission(
        'user-1',
        'user@example.com',
        'owner-1'
      );

      expect(result.isOwner).toBe(false);
      expect(result.isCollaborator).toBe(false);
    });
  });

  describe('rejectProject', () => {
    it('should create rejection record and update collaborations', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Insert rejection
        .mockResolvedValueOnce([{ affectedRows: 2 }]); // Update collaborations

      await collaborationService.rejectProject('user-1', 'owner-1');

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
    });
  });
});
```

**验收标准**:
- [ ] 邀请协作者测试覆盖
- [ ] 权限检查测试覆盖
- [ ] 项目拒绝测试覆盖
- [ ] 所有测试通过

---

### 任务 2: 编写单元测试 - 权限中间件

**文件**: `backend/src/__tests__/unit/middleware/permission.test.ts` (新建)

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { checkProjectPermission, requireRole } from '../../../middleware/permission';
import { getPool } from '../../../lib/db';

jest.mock('../../../lib/db');

describe('Permission Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;
  let mockPool: any;

  beforeEach(() => {
    mockReq = {
      user: { userId: 'user-1', email: 'user@example.com' },
      projectContext: { ownerId: 'owner-1' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    mockPool = { execute: jest.fn() };
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  describe('checkProjectPermission', () => {
    it('should set isOwner=true when user is owner', async () => {
      mockReq.user.userId = 'owner-1';
      mockReq.projectContext.ownerId = 'owner-1';

      await checkProjectPermission(mockReq, mockRes, mockNext);

      expect(mockReq.projectContext.isOwner).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set collaborator permissions correctly', async () => {
      mockPool.execute.mockResolvedValue([
        [{ group_id: 'group-1', role: 'viewer' }],
      ]);

      await checkProjectPermission(mockReq, mockRes, mockNext);

      expect(mockReq.projectContext.isCollaborator).toBe(true);
      expect(mockReq.projectContext.role).toBe('viewer');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for unauthorized access', async () => {
      mockPool.execute.mockResolvedValue([[]]);

      await checkProjectPermission(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should aggregate group permissions correctly', async () => {
      mockPool.execute.mockResolvedValue([
        [
          { group_id: 'group-1', role: 'viewer' },
          { group_id: 'group-2', role: 'editor' },
          { group_id: null, role: 'viewer' }, // Full access
        ],
      ]);

      await checkProjectPermission(mockReq, mockRes, mockNext);

      expect(mockReq.projectContext.accessibleGroupIds).toBeNull(); // Full access
      expect(mockReq.projectContext.role).toBe('editor'); // Highest role
    });
  });

  describe('requireRole', () => {
    it('should allow owner for owner-only actions', () => {
      mockReq.projectContext = { isOwner: true, role: null };
      const middleware = requireRole('owner');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny editor for owner-only actions', () => {
      mockReq.projectContext = { isOwner: false, role: 'editor' };
      const middleware = requireRole('owner');

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should allow editor for editor actions', () => {
      mockReq.projectContext = { isOwner: false, role: 'editor' };
      const middleware = requireRole('editor');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny viewer for editor actions', () => {
      mockReq.projectContext = { isOwner: false, role: 'viewer' };
      const middleware = requireRole('editor');

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});
```

**验收标准**:
- [ ] 权限检查中间件测试覆盖
- [ ] 角色要求中间件测试覆盖
- [ ] 边界情况测试覆盖
- [ ] 所有测试通过

---

### 任务 3: 编写集成测试 - API端点

**文件**: `backend/src/__tests__/integration/collaboration.test.ts` (新建)

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../index';
import { getPool } from '../../lib/db';
import { generateToken } from '../../lib/auth';

describe('Collaboration API Integration Tests', () => {
  let ownerToken: string;
  let collaboratorToken: string;
  let ownerId: string;
  let collaboratorId: string;
  let groupId: string;
  let pool: any;

  beforeAll(async () => {
    pool = getPool();
    
    // Create test users
    const [ownerResult] = await pool.execute(
      "INSERT INTO users (id, username, email, password_hash) VALUES (UUID(), 'owner', 'owner@test.com', 'hash')"
    );
    ownerId = ownerResult.insertId;
    
    const [collabResult] = await pool.execute(
      "INSERT INTO users (id, username, email, password_hash) VALUES (UUID(), 'collab', 'collab@test.com', 'hash')"
    );
    collaboratorId = collabResult.insertId;
    
    // Create test group
    const [groupResult] = await pool.execute(
      'INSERT INTO monitor_groups (id, owner_id, name) VALUES (UUID(), ?, ?)',
      [ownerId, 'Test Group']
    );
    groupId = groupResult.insertId;
    
    // Generate tokens
    ownerToken = await generateToken({ id: ownerId, username: 'owner', email: 'owner@test.com' } as any);
    collaboratorToken = await generateToken({ id: collaboratorId, username: 'collab', email: 'collab@test.com' } as any);
  });

  afterAll(async () => {
    // Cleanup
    await pool.execute('DELETE FROM project_collaborators WHERE project_owner_id = ?', [ownerId]);
    await pool.execute('DELETE FROM project_rejections WHERE project_owner_id = ?', [ownerId]);
    await pool.execute('DELETE FROM monitor_groups WHERE owner_id = ?', [ownerId]);
    await pool.execute('DELETE FROM users WHERE id IN (?, ?)', [ownerId, collaboratorId]);
  });

  describe('POST /api/collaborators', () => {
    it('should invite a collaborator successfully', async () => {
      const response = await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'collab@test.com',
          role: 'viewer',
          groupId: null,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.collaborator_email).toBe('collab@test.com');
    });

    it('should prevent duplicate invitation', async () => {
      const response = await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'collab@test.com',
          role: 'viewer',
          groupId: null,
        });

      expect(response.status).toBe(409);
    });

    it('should prevent self-invitation', async () => {
      const response = await request(app)
        .post('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'owner@test.com',
          role: 'viewer',
          groupId: null,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/collaborators', () => {
    it('should return list of collaborators', async () => {
      const response = await request(app)
        .get('/api/collaborators')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/shared-projects', () => {
    it('should return shared projects for collaborator', async () => {
      const response = await request(app)
        .get('/api/shared-projects')
        .set('Authorization', `Bearer ${collaboratorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Data Isolation', () => {
    it('should filter monitors by group permission', async () => {
      // Create monitor in group
      await pool.execute(
        'INSERT INTO monitors (id, owner_id, group_id, name, url) VALUES (UUID(), ?, ?, ?, ?)',
        [ownerId, groupId, 'Group Monitor', 'http://test.com']
      );
      
      // Create monitor without group
      await pool.execute(
        'INSERT INTO monitors (id, owner_id, name, url) VALUES (UUID(), ?, ?, ?)',
        [ownerId, 'Ungrouped Monitor', 'http://test2.com']
      );

      // Invite collaborator to specific group only
      await pool.execute(
        `INSERT INTO project_collaborators 
         (id, project_owner_id, collaborator_email, collaborator_user_id, group_id, role)
         VALUES (UUID(), ?, ?, ?, ?, 'viewer')`,
        [ownerId, 'collab2@test.com', collaboratorId, groupId]
      );

      const response = await request(app)
        .get(`/api/projects/${ownerId}/monitors`)
        .set('Authorization', `Bearer ${collaboratorToken}`);

      expect(response.status).toBe(200);
      // Should only see monitors in authorized group
      expect(response.body.data.every((m: any) => m.group_id === groupId)).toBe(true);
    });
  });
});
```

**验收标准**:
- [ ] API端点测试覆盖
- [ ] 数据隔离测试覆盖
- [ ] 权限控制测试覆盖
- [ ] 所有测试通过

---

### 任务 4: 性能优化

#### 4.1 添加数据库索引

**文件**: `backend/src/lib/db/migrate-collaboration-optimize.ts` (新建)

```typescript
export const addOptimizationIndexesSQL = `
-- 优化协作者查询的复合索引
CREATE INDEX idx_collaborators_lookup 
ON project_collaborators(project_owner_id, status, collaborator_user_id, collaborator_email);

-- 优化共享项目查询的索引
CREATE INDEX idx_collaborators_user_lookup 
ON project_collaborators(collaborator_user_id, status);

CREATE INDEX idx_collaborators_email_lookup 
ON project_collaborators(collaborator_email, status);

-- 优化拒绝记录查询
CREATE INDEX idx_rejections_user_lookup 
ON project_rejections(user_id, project_owner_id);
`;
```

#### 4.2 添加查询缓存

**文件**: `backend/src/services/collaboration.ts` (修改)

```typescript
// 简单的内存缓存（生产环境建议使用Redis）
const permissionCache = new Map<string, { result: PermissionCheckResult; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

export async function checkProjectPermission(
  userId: string,
  userEmail: string,
  ownerId: string
): Promise<PermissionCheckResult> {
  const cacheKey = `${userId}:${ownerId}`;
  const cached = permissionCache.get(cacheKey);
  
  if (cached && cached.expiry > Date.now()) {
    return cached.result;
  }

  // ... 原有查询逻辑

  const result = { /* ... */ };
  
  // 缓存结果
  permissionCache.set(cacheKey, {
    result,
    expiry: Date.now() + CACHE_TTL,
  });
  
  return result;
}

// 清除缓存的辅助函数
export function clearPermissionCache(userId: string, ownerId: string): void {
  const cacheKey = `${userId}:${ownerId}`;
  permissionCache.delete(cacheKey);
}
```

#### 4.3 优化监控项查询

**文件**: `backend/src/utils/data-isolation.ts` (修改)

```typescript
/**
 * 优化的监控项查询 - 使用JOIN替代子查询
 */
export async function getMonitorsWithPermission(
  ownerId: string,
  accessibleGroupIds: string[] | null,
  userId: string
): Promise<any[]> {
  const pool = getPool();
  
  let query = `
    SELECT m.*, g.name as group_name, g.color as group_color
    FROM monitors m
    LEFT JOIN monitor_groups g ON m.group_id = g.id
    WHERE m.owner_id = ?
  `;
  const params: any[] = [ownerId];
  
  if (accessibleGroupIds !== null) {
    if (accessibleGroupIds.length === 0) {
      query += ' AND m.group_id IS NULL';
    } else {
      const placeholders = accessibleGroupIds.map(() => '?').join(',');
      query += ` AND (m.group_id IS NULL OR m.group_id IN (${placeholders}))`;
      params.push(...accessibleGroupIds);
    }
  }
  
  query += ' ORDER BY m.created_at DESC';
  
  const [rows] = await pool.execute(query, params);
  return rows as any[];
}
```

**验收标准**:
- [ ] 索引添加完成
- [ ] 缓存机制实现
- [ ] 查询性能优化
- [ ] 性能测试通过

---

### 任务 5: 安全加固

#### 5.1 输入验证增强

**文件**: `backend/src/routes/collaborators.ts` (修改)

```typescript
import { body, param } from 'express-validator';

const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .isLength({ max: 100 })
  .withMessage('请输入有效的邮箱地址，长度不超过100字符');

const roleValidation = body('role')
  .isIn(['viewer', 'editor'])
  .withMessage('权限级别必须是 viewer 或 editor');

const groupIdValidation = body('groupId')
  .optional({ nullable: true })
  .custom((value) => {
    if (value === null || value === undefined) return true;
    if (typeof value !== 'string') throw new Error('分组ID必须是字符串');
    if (value.length !== 36) throw new Error('分组ID格式无效');
    return true;
  });

router.post('/', [
  emailValidation,
  roleValidation,
  groupIdValidation,
  validate,
], async (req, res) => { /* ... */ });
```

#### 5.2 添加速率限制

**文件**: `backend/src/index.ts` (修改)

```typescript
import rateLimit from 'express-rate-limit';

// 邀请协作者速率限制
const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 最多10次邀请
  message: { code: 429, message: '邀请过于频繁，请稍后再试' },
});

app.use('/api/collaborators', inviteLimiter, collaboratorsRouter);
```

**验收标准**:
- [ ] 输入验证增强
- [ ] 速率限制配置
- [ ] SQL注入防护确认
- [ ] XSS防护确认

---

### 任务 6: 更新API文档

**文件**: `backend/API.md` (新建或更新)

```markdown
# 多人协作API文档

## 协作者管理

### GET /api/collaborators
获取当前用户的协作者列表。

**响应示例**:
```json
{
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "collaborator_email": "user@example.com",
      "collaborator_username": "username",
      "group_id": null,
      "group_name": null,
      "role": "viewer",
      "status": "active",
      "created_at": "2026-05-04T10:00:00Z"
    }
  ]
}
```

### POST /api/collaborators
邀请协作者。

**请求体**:
```json
{
  "email": "user@example.com",
  "role": "viewer",
  "groupId": null
}
```

**说明**:
- `role`: `viewer` (只读) 或 `editor` (编辑)
- `groupId`: `null` (全部分组), 具体分组ID, 或不传

## 共享项目

### GET /api/shared-projects
获取与我共享的项目列表。

### POST /api/shared-projects/:ownerId/reject
拒绝共享项目。

## 项目切换

### GET /api/projects/:ownerId/monitors
获取指定项目的监控项（需有权限）。

### GET /api/projects/:ownerId/groups
获取指定项目的分组（需有权限）。
```

**验收标准**:
- [ ] API文档完整
- [ ] 请求/响应示例清晰
- [ ] 错误码说明完整

---

## 3. 验证方式

### 3.1 测试运行命令

```bash
# 运行单元测试
cd backend
npm test -- --testPathPattern=collaboration

# 运行集成测试
npm test -- --testPathPattern=integration

# 运行所有测试
npm test

# 生成覆盖率报告
npm run test:coverage
```

### 3.2 性能测试

```bash
# 使用Apache Bench测试API性能
ab -n 1000 -c 10 -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/collaborators

# 使用Artillery进行负载测试
artillery quick --count 100 --num 10 \
  --header "Authorization: Bearer <token>" \
  http://localhost:3001/api/shared-projects
```

### 3.3 预期指标

| 指标 | 目标值 |
|-----|-------|
| 单元测试覆盖率 | > 80% |
| 集成测试通过率 | 100% |
| API响应时间 (P95) | < 200ms |
| 并发用户支持 | > 100 |

---

## 4. 依赖与前置条件

| 依赖项 | 状态 | 说明 |
|-------|:----:|------|
| Plan-13完成 | ⏳ | 前端UI已完成 |
| Jest | ✅ | 已安装 |
| Supertest | ✅ | 已安装 |

---

## 5. 部署检查清单

- [ ] 数据库迁移已执行
- [ ] 索引已创建
- [ ] 环境变量已配置
- [ ] 测试全部通过
- [ ] API文档已更新
- [ ] 性能测试通过
- [ ] 安全扫描通过

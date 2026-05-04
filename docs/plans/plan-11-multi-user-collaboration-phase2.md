# Plan-11: 多人协作功能 - Phase 2: 后端API开发

> **计划版本**: v1.0  
> **创建日期**: 2026-05-04  
> **对应PRD**: [多人协作管理项目监测 - 增强需求文档](../multi-user-collaboration-prd.md)  
> **前置计划**: [Plan-10: 数据库设计与迁移](./plan-10-multi-user-collaboration-phase1.md)

---

## 1. 阶段目标

本阶段实现多人协作功能的核心后端API，包括协作者管理、项目拒绝、共享项目列表等功能。

### 1.1 核心交付物

| 交付物 | 说明 |
|-------|------|
| `collaborators.ts` 路由模块 | 协作者管理API（CRUD） |
| `shared-projects.ts` 路由模块 | 共享项目相关API |
| 协作服务层 | 业务逻辑封装 |
| 权限检查工具 | 可复用的权限验证函数 |

### 1.2 API端点概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         协作功能API端点                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  协作者管理 (需要项目所有者权限)                                              │
│  ├── GET    /api/collaborators                    获取协作者列表             │
│  ├── POST   /api/collaborators                    邀请协作者                 │
│  ├── PUT    /api/collaborators/:id                修改协作者权限             │
│  └── DELETE /api/collaborators/:id                移除协作者                 │
│                                                                              │
│  共享项目 (普通用户可用)                                                      │
│  ├── GET    /api/shared-projects                  获取与我共享的项目         │
│  └── POST   /api/shared-projects/:ownerId/reject  拒绝项目                   │
│                                                                              │
│  项目切换 (需要协作权限)                                                      │
│  ├── GET    /api/projects/:ownerId/monitors       查看所有者监控项           │
│  └── GET    /api/projects/:ownerId/groups         查看所有者可访问分组       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 实现任务清单

### 任务 1: 创建协作服务层

**文件**: `backend/src/services/collaboration.ts` (新建)

**功能**: 封装协作相关的数据库操作和业务逻辑。

**实现要点**:

#### 2.1.1 邀请协作者
```typescript
/**
 * 邀请协作者
 * @param ownerId 项目所有者ID
 * @param email 被邀请者邮箱
 * @param role 权限级别
 * @param groupId 可访问分组ID (null=全部分组)
 * @returns 创建的协作者记录
 */
export async function inviteCollaborator(
  ownerId: string,
  email: string,
  role: 'viewer' | 'editor',
  groupId: string | null
): Promise<ProjectCollaborator>
```

**业务规则**:
1. 校验邮箱格式
2. 检查是否已存在相同记录（同一邮箱+同一分组）
3. 检查被邀请者是否为自己
4. 如果邮箱已注册，自动关联user_id
5. 创建协作记录

#### 2.1.2 获取协作者列表
```typescript
/**
 * 获取项目的协作者列表
 * @param ownerId 项目所有者ID
 * @returns 协作者列表（包含用户信息）
 */
export async function getCollaborators(
  ownerId: string
): Promise<ProjectCollaboratorResponse[]>
```

**返回字段**:
- id, collaborator_email, collaborator_username
- group_id, group_name, role, status, created_at

#### 2.1.3 修改协作者权限
```typescript
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
    role?: 'viewer' | 'editor';
    groupId?: string | null;
  }
): Promise<void>
```

#### 2.1.4 移除协作者
```typescript
/**
 * 移除协作者
 * @param collaboratorId 协作者记录ID
 * @param ownerId 项目所有者ID（用于权限校验）
 */
export async function removeCollaborator(
  collaboratorId: string,
  ownerId: string
): Promise<void>
```

#### 2.1.5 获取与我共享的项目
```typescript
/**
 * 获取当前用户有权限访问的共享项目
 * @param userId 当前用户ID
 * @param userEmail 当前用户邮箱
 * @returns 共享项目列表
 */
export async function getSharedProjects(
  userId: string,
  userEmail: string
): Promise<SharedProject[]>
```

**业务逻辑**:
1. 查询以user_id关联的协作记录
2. 查询以email关联但user_id为NULL的协作记录（更新user_id）
3. 排除用户已拒绝的项目
4. 按所有者分组聚合

#### 2.1.6 拒绝项目
```typescript
/**
 * 用户拒绝共享项目
 * @param userId 当前用户ID
 * @param ownerId 项目所有者ID
 */
export async function rejectProject(
  userId: string,
  ownerId: string
): Promise<void>
```

**业务逻辑**:
1. 创建拒绝记录
2. 更新所有相关协作记录的status为'rejected'

#### 2.1.7 权限检查
```typescript
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
): Promise<PermissionCheckResult>
```

**返回结构**:
```typescript
{
  isOwner: boolean;           // 是否是项目所有者
  isCollaborator: boolean;    // 是否是协作者
  role: 'viewer' | 'editor' | null;
  accessibleGroupIds: string[] | null;  // null=所有分组, []=无权限, [...]=指定分组
}
```

**验收标准**:
- [ ] 所有服务函数实现完成
- [ ] 包含完整的错误处理
- [ ] 数据库操作使用参数化查询防注入
- [ ] 有清晰的JSDoc注释

---

### 任务 2: 创建协作者管理路由

**文件**: `backend/src/routes/collaborators.ts` (新建)

**基础结构**:
```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { body, param } from 'express-validator';
import * as collaborationService from '../services/collaboration';
import { success, error as errorResponse } from '../utils/api-response';

const router = Router();

// 所有路由需要认证
router.use(authenticate);

export default router;
```

#### 2.2.1 获取协作者列表
```typescript
/**
 * GET /api/collaborators
 * 获取当前用户的协作者列表
 */
router.get('/', async (req, res) => {
  try {
    const collaborators = await collaborationService.getCollaborators(req.user!.userId);
    success(res, collaborators);
  } catch (err) {
    errorResponse(res, '获取协作者列表失败', 500);
  }
});
```

#### 2.2.2 邀请协作者
```typescript
/**
 * POST /api/collaborators
 * 邀请协作者
 * Body: { email: string, role: 'viewer' | 'editor', groupId?: string | null }
 */
router.post('/', [
  body('email').isEmail().normalizeEmail().withMessage('请输入有效的邮箱地址'),
  body('role').isIn(['viewer', 'editor']).withMessage('权限级别必须是 viewer 或 editor'),
  body('groupId').optional({ nullable: true }).isString().withMessage('分组ID必须是字符串'),
  validate
], async (req, res) => {
  try {
    const { email, role, groupId } = req.body;
    const ownerId = req.user!.userId;
    
    // 检查是否邀请自己
    const pool = getPool();
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length > 0 && users[0].id === ownerId) {
      return errorResponse(res, '不能邀请自己', 400);
    }
    
    const collaborator = await collaborationService.inviteCollaborator(
      ownerId,
      email,
      role,
      groupId || null
    );
    
    success(res, collaborator, '邀请成功');
  } catch (err: any) {
    if (err.message === '该用户已被邀请到此分组') {
      return errorResponse(res, err.message, 409);
    }
    errorResponse(res, '邀请失败', 500);
  }
});
```

#### 2.2.3 修改协作者权限
```typescript
/**
 * PUT /api/collaborators/:id
 * 修改协作者权限
 * Body: { role?: 'viewer' | 'editor', groupId?: string | null }
 */
router.put('/:id', [
  param('id').isUUID().withMessage('无效的协作者ID'),
  body('role').optional().isIn(['viewer', 'editor']).withMessage('权限级别必须是 viewer 或 editor'),
  body('groupId').optional({ nullable: true }).isString().withMessage('分组ID必须是字符串'),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;
    const { role, groupId } = req.body;
    const ownerId = req.user!.userId;
    
    await collaborationService.updateCollaborator(id, ownerId, { role, groupId });
    success(res, null, '修改成功');
  } catch (err: any) {
    if (err.message === '协作者不存在') {
      return errorResponse(res, err.message, 404);
    }
    errorResponse(res, '修改失败', 500);
  }
});
```

#### 2.2.4 移除协作者
```typescript
/**
 * DELETE /api/collaborators/:id
 * 移除协作者
 */
router.delete('/:id', [
  param('id').isUUID().withMessage('无效的协作者ID'),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user!.userId;
    
    await collaborationService.removeCollaborator(id, ownerId);
    success(res, null, '移除成功');
  } catch (err: any) {
    if (err.message === '协作者不存在') {
      return errorResponse(res, err.message, 404);
    }
    errorResponse(res, '移除失败', 500);
  }
});
```

**验收标准**:
- [ ] 所有端点实现完成
- [ ] 输入验证完整
- [ ] 错误处理恰当（404, 409, 500等）
- [ ] 返回格式符合API规范

---

### 任务 3: 创建共享项目路由

**文件**: `backend/src/routes/shared-projects.ts` (新建)

#### 2.3.1 获取与我共享的项目
```typescript
/**
 * GET /api/shared-projects
 * 获取与我共享的项目列表
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email; // 需要从token中获取email
    
    const projects = await collaborationService.getSharedProjects(userId, userEmail);
    success(res, projects);
  } catch (err) {
    errorResponse(res, '获取共享项目失败', 500);
  }
});
```

#### 2.3.2 拒绝项目
```typescript
/**
 * POST /api/shared-projects/:ownerId/reject
 * 拒绝共享项目
 */
router.post('/:ownerId/reject', [
  param('ownerId').isUUID().withMessage('无效的项目所有者ID'),
  validate
], async (req, res) => {
  try {
    const { ownerId } = req.params;
    const userId = req.user!.userId;
    
    await collaborationService.rejectProject(userId, ownerId);
    success(res, null, '已拒绝该项目');
  } catch (err) {
    errorResponse(res, '操作失败', 500);
  }
});
```

**验收标准**:
- [ ] 共享项目列表API正常工作
- [ ] 拒绝项目API正常工作
- [ ] 拒绝后项目不再出现在列表中

---

### 任务 4: 更新JWT Payload包含Email

**文件**: `backend/src/lib/auth.ts`

**修改内容**:
```typescript
// 在生成Token时包含email
export async function generateToken(user: User): Promise<string> {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,  // 添加email
  };
  // ...
}

// 更新JwtPayload类型
export interface JwtPayload {
  userId: string;
  username: string;
  email: string;  // 添加email
  iat: number;
  exp: number;
}
```

**验收标准**:
- [ ] JWT Token包含email字段
- [ ] 类型定义已更新
- [ ] 现有功能不受影响

---

### 任务 5: 注册新路由

**文件**: `backend/src/index.ts`

**修改内容**:
```typescript
import collaboratorsRouter from './routes/collaborators';
import sharedProjectsRouter from './routes/shared-projects';

// ... 其他路由注册

app.use('/api/collaborators', collaboratorsRouter);
app.use('/api/shared-projects', sharedProjectsRouter);
```

**验收标准**:
- [ ] 路由已注册
- [ ] API端点可访问
- [ ] 返回正确的CORS头

---

## 3. API详细规范

### 3.1 请求/响应格式

#### 邀请协作者
```http
POST /api/collaborators
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "collaborator@example.com",
  "role": "editor",
  "groupId": "group-uuid"  // null表示全部分组
}
```

**成功响应 (201)**:
```json
{
  "code": 201,
  "message": "邀请成功",
  "data": {
    "id": "collab-uuid",
    "collaborator_email": "collaborator@example.com",
    "collaborator_username": null,
    "group_id": "group-uuid",
    "group_name": "API服务",
    "role": "editor",
    "status": "active",
    "created_at": "2026-05-04T10:00:00Z"
  }
}
```

**错误响应 (409)**:
```json
{
  "code": 409,
  "message": "该用户已被邀请到此分组"
}
```

#### 获取协作者列表
```http
GET /api/collaborators
Authorization: Bearer <token>
```

**成功响应 (200)**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "collab-uuid",
      "collaborator_email": "user1@example.com",
      "collaborator_username": "user1",
      "group_id": null,
      "group_name": null,
      "role": "viewer",
      "status": "active",
      "created_at": "2026-05-04T10:00:00Z"
    }
  ]
}
```

#### 获取共享项目
```http
GET /api/shared-projects
Authorization: Bearer <token>
```

**成功响应 (200)**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "owner_id": "owner-uuid",
      "owner_username": "project_owner",
      "owner_email": "owner@example.com",
      "role": "editor",
      "group_id": null,
      "group_name": null,
      "joined_at": "2026-05-04T10:00:00Z"
    }
  ]
}
```

---

## 4. 验证方式

### 4.1 单元测试

创建测试文件: `backend/src/__tests__/unit/services/collaboration.test.ts`

**测试用例**:
1. 邀请协作者 - 成功场景
2. 邀请协作者 - 重复邀请应失败
3. 邀请协作者 - 不能邀请自己
4. 获取协作者列表
5. 修改协作者权限
6. 移除协作者
7. 获取共享项目列表
8. 拒绝项目

### 4.2 API测试

使用curl或Postman测试：

```bash
# 1. 登录获取Token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password"}'

# 2. 邀请协作者
curl -X POST http://localhost:3001/api/collaborators \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"email":"test@example.com","role":"viewer","groupId":null}'

# 3. 获取协作者列表
curl http://localhost:3001/api/collaborators \
  -H "Authorization: Bearer <token>"

# 4. 获取共享项目
curl http://localhost:3001/api/shared-projects \
  -H "Authorization: Bearer <token>"
```

---

## 5. 依赖与前置条件

| 依赖项 | 状态 | 说明 |
|-------|:----:|------|
| Plan-10完成 | ⏳ | 数据库表已创建 |
| 认证中间件 | ✅ | 已存在 |
| 验证中间件 | ✅ | 已存在 |
| API响应工具 | ✅ | 已存在 |

---

## 6. 后续阶段衔接

本阶段完成后，API已准备好支持：

1. **Phase 3**: 权限中间件将使用`checkProjectPermission`函数
2. **Phase 4**: 前端UI将调用这些API
3. **Phase 5**: 集成测试将验证完整流程

---

## 7. 注意事项

1. **事务处理**: 涉及多表操作时（如拒绝项目），使用数据库事务保证数据一致性
2. **并发控制**: 邀请协作者时的唯一约束检查，处理并发情况下的重复邀请
3. **性能考虑**: 共享项目列表查询涉及多个表JOIN，确保索引正确使用
4. **安全性**: 所有操作必须验证用户身份，防止越权访问

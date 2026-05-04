# Plan-10: 多人协作功能 - Phase 1: 数据库设计与迁移

> **计划版本**: v1.0  
> **创建日期**: 2026-05-04  
> **对应PRD**: [多人协作管理项目监测 - 增强需求文档](../multi-user-collaboration-prd.md)

---

## 1. 阶段目标

本阶段完成多人协作功能所需的数据库表结构设计和迁移脚本，为后续API开发和权限控制奠定基础。

### 1.1 核心交付物

| 交付物 | 说明 |
|-------|------|
| `project_collaborators` 表 | 存储项目协作者关系 |
| `project_rejections` 表 | 存储用户拒绝的项目记录 |
| 数据库迁移脚本 | 自动创建新表和索引 |
| 类型定义更新 | TypeScript类型定义 |

### 1.2 数据模型关系

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         多人协作数据模型关系                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐         ┌─────────────────────────┐                      │
│   │    users     │◀────────┤  project_collaborators  │                      │
│   ├──────────────┤   N     ├─────────────────────────┤                      │
│   │ id (PK)      │         │ id (PK)                 │                      │
│   │ email (UK)   │◀────────│ project_owner_id (FK)   │                      │
│   │ ...          │         │ collaborator_email      │                      │
│   └──────────────┘         │ collaborator_user_id(FK)│◀──┐                  │
│        1                   │ group_id (FK)           │   │                  │
│                            │ role (viewer/editor)    │   │                  │
│                            │ status (active/rejected)│   │                  │
│                            │ created_at              │   │                  │
│                            │ updated_at              │   │                  │
│                            └─────────────────────────┘   │                  │
│                                     N                    │                  │
│                                                          │                  │
│   ┌──────────────┐         ┌─────────────────────────┐   │                  │
│   │    users     │◀────────┤   project_rejections    │   │                  │
│   ├──────────────┤   N     ├─────────────────────────┤   │                  │
│   │ id (PK)      │         │ id (PK)                 │   │                  │
│   │ ...          │◀────────│ user_id (FK)            │───┘                  │
│   └──────────────┘         │ project_owner_id (FK)   │                      │
│                            │ rejected_at             │                      │
│                            └─────────────────────────┘                      │
│                                                                              │
│   ┌──────────────┐                                                          │
│   │monitor_groups│◀────────────────────────────────────────┐                │
│   ├──────────────┤                                         │                │
│   │ id (PK)      │                                         │                │
│   │ owner_id(FK) │                                         │                │
│   └──────────────┘                                         │                │
│                                                            │                │
│   关系说明:                                                 │                │
│   • users 1:N project_collaborators (作为项目所有者)        │                │
│   • users 1:N project_collaborators (作为协作者)            │                │
│   • users 1:N project_rejections                           │                │
│   • monitor_groups 1:N project_collaborators (可选分组权限) │                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 数据库表结构设计

### 2.1 project_collaborators 表

存储项目协作者关系，支持按分组授权。

```sql
CREATE TABLE IF NOT EXISTS project_collaborators (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_owner_id CHAR(36) NOT NULL,
  collaborator_email VARCHAR(100) NOT NULL,
  collaborator_user_id CHAR(36),
  group_id CHAR(36),
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 外键约束
  FOREIGN KEY (project_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (collaborator_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (group_id) REFERENCES monitor_groups(id) ON DELETE SET NULL,
  
  -- 唯一约束：同一项目的同一邮箱同一分组只能有一个有效协作关系
  UNIQUE KEY uk_collaborator_project_group (
    project_owner_id, 
    collaborator_email, 
    group_id
  ),
  
  -- 索引
  INDEX idx_collaborators_owner (project_owner_id),
  INDEX idx_collaborators_email (collaborator_email),
  INDEX idx_collaborators_user (collaborator_user_id),
  INDEX idx_collaborators_status (status),
  INDEX idx_collaborators_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**字段说明：**

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|-------|------|------|:------:|------|
| id | CHAR(36) | PK | UUID() | 唯一标识 |
| project_owner_id | CHAR(36) | FK, NOT NULL | - | 项目所有者ID |
| collaborator_email | VARCHAR(100) | NOT NULL | - | 协作者邮箱（邀请时可能未注册） |
| collaborator_user_id | CHAR(36) | FK | NULL | 协作者用户ID（注册后关联） |
| group_id | CHAR(36) | FK | NULL | 可访问分组ID：NULL=全部分组，具体ID=指定分组 |
| role | VARCHAR(20) | CHECK | 'viewer' | 权限级别：viewer/editor |
| status | VARCHAR(20) | CHECK | 'active' | 状态：active/rejected |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | - | ON UPDATE | 更新时间 |

**约束说明：**
- `role` 取值范围：'viewer' | 'editor'
- `status` 取值范围：'active' | 'rejected'
- 唯一约束确保同一邮箱在同一项目中同一分组只能有一个记录

### 2.2 project_rejections 表

存储用户拒绝的项目记录，用于过滤"与我共享的项目"列表。

```sql
CREATE TABLE IF NOT EXISTS project_rejections (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  project_owner_id CHAR(36) NOT NULL,
  rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键约束
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- 唯一约束：同一用户只能拒绝同一项目一次
  UNIQUE KEY uk_rejection_user_project (user_id, project_owner_id),
  
  -- 索引
  INDEX idx_rejections_user (user_id),
  INDEX idx_rejections_project (project_owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**字段说明：**

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|-------|------|------|:------:|------|
| id | CHAR(36) | PK | UUID() | 唯一标识 |
| user_id | CHAR(36) | FK, NOT NULL | - | 拒绝者用户ID |
| project_owner_id | CHAR(36) | FK, NOT NULL | - | 被拒绝的项目所有者ID |
| rejected_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 拒绝时间 |

---

## 3. 实现任务清单

### 任务 1: 更新数据库Schema文件

**文件**: `backend/src/lib/db/schema.ts`

**操作**: 在 `createTablesSQL` 末尾添加两个新表的创建语句。

**代码位置**: 在 `cron_job_logs` 表创建语句之后添加。

**关键代码片段**:
```typescript
// Project collaborators table (for multi-user collaboration)
CREATE TABLE IF NOT EXISTS project_collaborators (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_owner_id CHAR(36) NOT NULL,
  collaborator_email VARCHAR(100) NOT NULL,
  collaborator_user_id CHAR(36),
  group_id CHAR(36),
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (collaborator_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (group_id) REFERENCES monitor_groups(id) ON DELETE SET NULL,
  UNIQUE KEY uk_collaborator_project_group (project_owner_id, collaborator_email, group_id),
  INDEX idx_collaborators_owner (project_owner_id),
  INDEX idx_collaborators_email (collaborator_email),
  INDEX idx_collaborators_user (collaborator_user_id),
  INDEX idx_collaborators_status (status),
  INDEX idx_collaborators_group (group_id),
  CONSTRAINT chk_collaborator_role CHECK (role IN ('viewer', 'editor')),
  CONSTRAINT chk_collaborator_status CHECK (status IN ('active', 'rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project rejections table (for "not my project" feature)
CREATE TABLE IF NOT EXISTS project_rejections (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  project_owner_id CHAR(36) NOT NULL,
  rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_rejection_user_project (user_id, project_owner_id),
  INDEX idx_rejections_user (user_id),
  INDEX idx_rejections_project (project_owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**验收标准**:
- [ ] Schema文件包含两个新表的完整SQL
- [ ] 包含正确的CHECK约束
- [ ] 包含必要的索引
- [ ] 外键关系正确

---

### 任务 2: 创建数据库迁移脚本

**文件**: `backend/src/lib/db/migrate-collaboration.ts` (新建)

**功能**: 执行多人协作相关表的迁移。

**实现要点**:
1. 检查表是否已存在
2. 创建 `project_collaborators` 表
3. 创建 `project_rejections` 表
4. 输出迁移结果

**代码结构**:
```typescript
import { getPool } from '../db';

const createCollaborationTablesSQL = `
  -- project_collaborators 表创建语句
  -- project_rejections 表创建语句
`;

export async function migrateCollaborationTables(): Promise<void> {
  const pool = getPool();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 执行迁移
    await connection.query(createCollaborationTablesSQL);
    
    await connection.commit();
    console.log('Collaboration tables migrated successfully');
  } catch (error) {
    await connection.rollback();
    console.error('Migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  migrateCollaborationTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
```

**验收标准**:
- [ ] 迁移脚本可独立运行
- [ ] 支持事务，失败可回滚
- [ ] 重复运行不会报错（IF NOT EXISTS）
- [ ] 有清晰的日志输出

---

### 任务 3: 更新TypeScript类型定义

**文件**: `backend/src/types/index.ts`

**操作**: 添加多人协作相关的类型定义。

**添加内容**:
```typescript
// ============================================
// Collaboration Types
// ============================================

export type CollaboratorRole = 'viewer' | 'editor';
export type CollaboratorStatus = 'active' | 'rejected';

export interface ProjectCollaborator {
  id: string;
  project_owner_id: string;
  collaborator_email: string;
  collaborator_user_id: string | null;
  group_id: string | null;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectCollaboratorResponse {
  id: string;
  collaborator_email: string;
  collaborator_username?: string;
  group_id: string | null;
  group_name?: string | null;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  created_at: Date;
}

export interface ProjectRejection {
  id: string;
  user_id: string;
  project_owner_id: string;
  rejected_at: Date;
}

export interface SharedProject {
  owner_id: string;
  owner_username: string;
  owner_email: string;
  role: CollaboratorRole;
  group_id: string | null;
  group_name: string | null;
  joined_at: Date;
}

// Permission check result
export interface PermissionCheckResult {
  isOwner: boolean;
  isCollaborator: boolean;
  role: CollaboratorRole | null;
  accessibleGroupIds: string[] | null; // null means all groups
}
```

**验收标准**:
- [ ] 所有协作相关类型已定义
- [ ] 类型与数据库字段对应
- [ ] 导出类型可在其他模块使用

---

### 任务 4: 更新数据库清理脚本

**文件**: `backend/src/lib/db/schema.ts`

**操作**: 在 `dropTablesSQL` 中添加新表的删除语句。

**顺序要求**: 先删除有外键依赖的表，按以下顺序：
1. `project_rejections`
2. `project_collaborators`
3. 其他现有表...

**代码片段**:
```typescript
export const dropTablesSQL = `
DROP TABLE IF EXISTS project_rejections;
DROP TABLE IF EXISTS project_collaborators;
DROP TABLE IF EXISTS cron_job_logs;
-- ... 其他现有表
`;
```

**验收标准**:
- [ ] dropTablesSQL包含新表
- [ ] 删除顺序正确（先依赖后主体）

---

## 4. 验证方式

### 4.1 本地验证步骤

1. **运行迁移脚本**:
   ```bash
   cd backend
   npx tsx src/lib/db/migrate-collaboration.ts
   ```

2. **检查表结构**:
   ```sql
   -- 查看表是否创建成功
   SHOW TABLES LIKE 'project_%';
   
   -- 查看表结构
   DESCRIBE project_collaborators;
   DESCRIBE project_rejections;
   
   -- 查看索引
   SHOW INDEX FROM project_collaborators;
   SHOW INDEX FROM project_rejections;
   ```

3. **验证约束**:
   ```sql
   -- 测试唯一约束
   INSERT INTO project_collaborators (project_owner_id, collaborator_email, group_id, role) 
   VALUES ('owner-uuid', 'test@example.com', NULL, 'viewer');
   
   -- 重复插入应该失败
   INSERT INTO project_collaborators (project_owner_id, collaborator_email, group_id, role) 
   VALUES ('owner-uuid', 'test@example.com', NULL, 'viewer'); -- 应该报错
   ```

### 4.2 预期结果

- [ ] 两个新表成功创建
- [ ] 所有索引创建成功
- [ ] 外键约束正常工作
- [ ] CHECK约束限制role和status取值
- [ ] 唯一约束防止重复数据

---

## 5. 依赖与前置条件

| 依赖项 | 状态 | 说明 |
|-------|:----:|------|
| users表 | ✅ | 已存在 |
| monitor_groups表 | ✅ | 已存在 |
| MySQL 8.4 | ✅ | 已配置 |
| mysql2库 | ✅ | 已安装 |

---

## 6. 后续阶段衔接

本阶段完成后，数据库已准备好支持：

1. **Phase 2**: 协作API开发（邀请、列表、修改、移除）
2. **Phase 3**: 权限中间件与数据隔离
3. **Phase 4**: 前端协作管理UI

---

## 7. 风险与注意事项

1. **数据一致性**: `collaborator_user_id` 可能为NULL（邀请时用户未注册），需要在用户注册后更新
2. **级联删除**: 删除用户时会级联删除其作为所有者的协作记录，但作为协作者的记录会保留（SET NULL）
3. **分组删除**: 删除分组时，关联的协作记录会保留但group_id设为NULL（视为全部分组权限）

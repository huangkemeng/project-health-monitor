# 多人协作功能 - 代码生成计划总览

> **计划版本**: v1.0  
> **创建日期**: 2026-05-04  
> **对应PRD**: [多人协作管理项目监测 - 增强需求文档](../multi-user-collaboration-prd.md)

---

## 1. 项目概述

本计划详细描述了为项目健康监控系统实现多人协作功能的完整开发路线图。功能允许项目所有者通过邮箱邀请其他用户共同管理监测项目，并根据业务需要分配不同的权限级别（只读/编辑）和分组访问范围。

### 1.1 核心功能

| 功能模块 | 描述 |
|---------|------|
| **成员邀请** | 通过邮箱邀请协作者，指定权限和分组范围 |
| **权限管理** | 支持只读(viewer)和编辑(editor)两种权限级别 |
| **分组权限** | 支持全部分组、指定分组、未分组三种访问范围 |
| **协作者管理** | 查看、修改、移除协作者 |
| **项目拒绝** | "这不是我的项目"功能，拒绝不需要的协作 |
| **项目切换** | 在多个项目间快速切换查看 |

### 1.2 技术栈

| 层级 | 技术 |
|-----|------|
| 后端 | Node.js + Express + TypeScript + MySQL 8.4 |
| 前端 | Next.js 14 + React + TypeScript + Tailwind CSS + shadcn/ui |
| 状态管理 | Zustand |
| 认证 | JWT (jose库) |

---

## 2. 计划结构

整个功能实现分为5个阶段，每个阶段都有明确的目标和可验证的交付物。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        多人协作功能开发路线图                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Phase 1: 数据库设计与迁移                                                   │
│  ├── 创建 project_collaborators 表                                          │
│  ├── 创建 project_rejections 表                                             │
│  ├── 编写数据库迁移脚本                                                      │
│  └── 更新TypeScript类型定义                                                  │
│                                                                              │
│  Phase 2: 后端API开发                                                        │
│  ├── 创建协作服务层 (services/collaboration.ts)                              │
│  ├── 创建协作者管理路由 (routes/collaborators.ts)                            │
│  ├── 创建共享项目路由 (routes/shared-projects.ts)                            │
│  └── 更新JWT Payload包含email                                                │
│                                                                              │
│  Phase 3: 权限中间件与数据隔离                                               │
│  ├── 创建权限检查中间件 (middleware/permission.ts)                           │
│  ├── 创建数据隔离工具函数 (utils/data-isolation.ts)                          │
│  ├── 改造监控项路由支持权限控制                                              │
│  ├── 改造分组路由支持权限控制                                                │
│  └── 创建项目切换API (routes/projects.ts)                                    │
│                                                                              │
│  Phase 4: 前端UI开发                                                         │
│  ├── 更新API客户端 (lib/api.ts)                                              │
│  ├── 创建项目上下文Store (store/project-context.ts)                          │
│  ├── 创建协作者管理页面 (settings/CollaboratorsTab.tsx)                      │
│  ├── 创建共享项目页面 (shared-projects/page.tsx)                             │
│  ├── 更新Header支持项目切换                                                  │
│  └── 更新监控项页面权限控制                                                  │
│                                                                              │
│  Phase 5: 集成测试与优化                                                     │
│  ├── 编写服务层单元测试                                                      │
│  ├── 编写权限中间件单元测试                                                  │
│  ├── 编写API集成测试                                                         │
│  ├── 性能优化（索引、缓存）                                                  │
│  ├── 安全加固（验证、速率限制）                                              │
│  └── 更新API文档                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 详细计划文档

| 计划文件 | 描述 | 依赖 |
|---------|------|------|
| [Plan-10: 数据库设计与迁移](./plan-10-multi-user-collaboration-phase1.md) | 数据库表结构设计和迁移脚本 | 无 |
| [Plan-11: 后端API开发](./plan-11-multi-user-collaboration-phase2.md) | 协作相关API开发 | Plan-10 |
| [Plan-12: 权限中间件与数据隔离](./plan-12-multi-user-collaboration-phase3.md) | 权限控制和数据隔离实现 | Plan-11 |
| [Plan-13: 前端UI开发](./plan-13-multi-user-collaboration-phase4.md) | 协作管理界面开发 | Plan-12 |
| [Plan-14: 集成测试与优化](./plan-14-multi-user-collaboration-phase5.md) | 测试和性能优化 | Plan-13 |

---

## 4. 数据模型

### 4.1 核心表结构

```sql
-- 项目协作者表
CREATE TABLE project_collaborators (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_owner_id CHAR(36) NOT NULL,      -- 项目所有者ID
  collaborator_email VARCHAR(100) NOT NULL, -- 协作者邮箱
  collaborator_user_id CHAR(36),            -- 协作者用户ID（注册后关联）
  group_id CHAR(36),                        -- 可访问分组ID（NULL=全部分组）
  role VARCHAR(20) NOT NULL,                -- 权限：viewer/editor
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 状态：active/rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_collaborator (project_owner_id, collaborator_email, group_id),
  FOREIGN KEY (project_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (collaborator_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (group_id) REFERENCES monitor_groups(id) ON DELETE SET NULL
);

-- 项目拒绝表
CREATE TABLE project_rejections (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,           -- 拒绝者ID
  project_owner_id CHAR(36) NOT NULL,  -- 被拒绝的项目所有者ID
  rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_rejection (user_id, project_owner_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_owner_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 4.2 权限矩阵

| 功能 | 所有者 | 编辑(editor) | 只读(viewer) |
|-----|:------:|:------------:|:------------:|
| 查看监控项 | ✅ | ✅ (授权分组) | ✅ (授权分组) |
| 创建监控项 | ✅ | ✅ (授权分组) | ❌ |
| 编辑监控项 | ✅ | ✅ (授权分组) | ❌ |
| 删除监控项 | ✅ | ✅ (授权分组) | ❌ |
| 查看Webhook | ✅ | ✅ | ✅ |
| 配置Webhook | ✅ | ✅ | ❌ |
| 查看分组 | ✅ | ✅ (授权分组) | ✅ (授权分组) |
| 管理分组 | ✅ | ❌ | ❌ |
| 邀请协作者 | ✅ | ❌ | ❌ |
| 修改权限 | ✅ | ❌ | ❌ |

---

## 5. API端点汇总

### 5.1 协作者管理

| 方法 | 端点 | 描述 | 权限 |
|-----|------|------|------|
| GET | /api/collaborators | 获取协作者列表 | 所有者 |
| POST | /api/collaborators | 邀请协作者 | 所有者 |
| PUT | /api/collaborators/:id | 修改协作者权限 | 所有者 |
| DELETE | /api/collaborators/:id | 移除协作者 | 所有者 |

### 5.2 共享项目

| 方法 | 端点 | 描述 | 权限 |
|-----|------|------|------|
| GET | /api/shared-projects | 获取共享项目列表 | 认证用户 |
| POST | /api/shared-projects/:ownerId/reject | 拒绝项目 | 认证用户 |

### 5.3 项目切换

| 方法 | 端点 | 描述 | 权限 |
|-----|------|------|------|
| GET | /api/projects/:ownerId/monitors | 获取项目监控项 | 协作者+ |
| GET | /api/projects/:ownerId/groups | 获取项目分组 | 协作者+ |

---

## 6. 前端页面结构

```
frontend/src/
├── app/
│   ├── settings/
│   │   ├── page.tsx              # 设置页面（添加成员管理标签）
│   │   ├── CollaboratorsTab.tsx  # 协作者管理标签页
│   │   ├── InviteCollaboratorDialog.tsx  # 邀请弹窗
│   │   └── EditCollaboratorDialog.tsx    # 编辑权限弹窗
│   ├── shared-projects/
│   │   └── page.tsx              # 共享项目列表页
│   └── monitors/
│       └── page.tsx              # 监控项页面（添加权限控制）
├── components/
│   └── layout/
│       └── Header.tsx            # 顶部导航（添加项目切换）
├── store/
│   └── project-context.ts        # 项目上下文状态管理
└── lib/
    └── api.ts                    # API客户端（添加协作API）
```

---

## 7. 执行顺序

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
   ↓         ↓         ↓         ↓         ↓
数据库    后端API   权限控制   前端UI    测试优化
```

**重要提示**:
- 每个Phase完成后应进行验证
- 每个Phase的输出是下一个Phase的输入
- 建议按顺序执行，不要跳过Phase

---

## 8. 验收标准

### 8.1 功能验收

- [ ] 项目所有者可以邀请协作者
- [ ] 协作者可以按权限访问监控数据
- [ ] 分组权限控制正常工作
- [ ] 协作者可以拒绝项目
- [ ] 项目切换功能正常
- [ ] 权限控制UI正确显示/隐藏操作

### 8.2 技术验收

- [ ] 单元测试覆盖率 > 80%
- [ ] 所有API测试通过
- [ ] 性能测试通过（P95 < 200ms）
- [ ] 安全扫描通过
- [ ] TypeScript类型检查通过
- [ ] ESLint检查通过

---

## 9. 风险与注意事项

| 风险 | 缓解措施 |
|-----|---------|
| 权限绕过 | 全面的单元测试和代码审查 |
| 性能问题 | 添加索引和缓存机制 |
| 数据不一致 | 使用数据库事务 |
| 并发冲突 | 唯一约束和乐观锁 |
| XSS/SQL注入 | 参数化查询和输入验证 |

---

## 10. 参考文档

- [多人协作PRD](../multi-user-collaboration-prd.md)
- [数据模型设计](../requirements/05-data-model.md)
- [API规范](../requirements/06-api-specification.md)

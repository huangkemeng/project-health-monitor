# 用户问题反馈模块 — 总体代码生成计划

> **基于 PRD**: `docs/feedback-prd.md`
> **生成日期**: 2026-05-05
> **总计阶段**: 5 个

---

## 架构总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         反馈功能模块架构                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         前端 (Next.js)                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│  │  │  反馈提交     │  │  反馈列表    │  │  反馈详情    │  │  管理后台  │  │   │
│  │  │  (Phase 2)  │  │  (Phase 3)  │  │  (Phase 3)  │  │ (Phase 4) │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │   │
│  │         │                │                │               │         │   │
│  │  ┌──────┴────────────────┴────────────────┴───────────────┴──────┐  │   │
│  │  │                    API 客户端 (api.ts)                          │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │ HTTP/JSON                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       后端 (Express)                                   │   │
│  │  ┌──────────────────────────────────────────────────────────────┐    │   │
│  │  │                    routes/feedback.ts                         │    │   │
│  │  │  提交 | 列表 | 详情 | 回复 | 状态管理 | 上传 | 管理 | 通知     │    │   │
│  │  └──────────────────────┬───────────────────────────────────────┘    │   │
│  │                         │                                            │   │
│  │  ┌──────────────────────┴───────────────────────────────────────┐    │   │
│  │  │                    services/feedback.ts                        │    │   │
│  │  │  业务逻辑 | 状态流转 | 防刷 | 编号生成 | 文件管理               │    │   │
│  │  └──────────────────────┬───────────────────────────────────────┘    │   │
│  │                         │                                            │   │
│  │  ┌──────────────────────┴───────────────────────────────────────┐    │   │
│  │  │                lib/db/schema.ts (4张新表)                     │    │   │
│  │  └──────────────────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 阶段划分总览

| 阶段 | 名称 | 核心内容 | 前置依赖 |
|:----:|------|---------|:--------:|
| 1 | 数据库Schema与后端API | 4张数据表、类型定义、文件上传、CRUD API、状态管理API | Plan-14 |
| 2 | 前端反馈提交 | 浮动按钮、表单、文件上传、隐私说明、提交成功 | Phase 1 |
| 3 | 前端反馈列表与详情 | 列表页、详情页、时间线、回复、状态操作 | Phase 2 |
| 4 | 后台管理面板 | 统计概览、管理表格、批量操作、分配处理人 | Phase 3 |
| 5 | 通知机制与功能打磨 | 通知表与API、铃铛UI、边缘状态、性能优化 | Phase 4 |

---

## 各阶段说明

### Phase 1: 数据库Schema与后端API
- **文件**: `docs/plans/plan-15-feedback-module-phase1.md`
- **核心交付**: 4张数据库表 (`feedback`, `feedback_replies`, `feedback_attachments`, `feedback_timeline`) + 后端类型 + 文件上传工具 + 反馈CRUD API + 状态管理API + 管理API
- **验证方式**: 使用 curl/Postman 测试所有API端点
- **产出物**: 完整后端服务，无前端UI

### Phase 2: 前端反馈提交
- **文件**: `docs/plans/plan-16-feedback-module-phase2.md`
- **核心交付**: 浮动反馈按钮 + 表单弹窗 + 文件上传组件 + 隐私说明 + 提交成功提示 + 全局集成
- **验证方式**: 手动操作提交反馈流程
- **产出物**: 用户可通过浮动按钮提交反馈

### Phase 3: 前端反馈列表与详情
- **文件**: `docs/plans/plan-17-feedback-module-phase3.md`
- **核心交付**: "我的反馈"列表页（筛选+搜索+分页） + 反馈详情页（时间线+回复+状态操作） + 导航入口
- **验证方式**: 手动浏览列表、查看详情、回复、变更状态
- **产出物**: 完整的用户侧反馈功能

### Phase 4: 后台管理面板
- **文件**: `docs/plans/plan-18-feedback-module-phase4.md`
- **核心交付**: 管理员统计概览 + 全部反馈表格 + 批量操作 + 分配处理人 + 标记重复
- **验证方式**: 管理员账户操作完整管理流程
- **产出物**: 完整的管理员后台

### Phase 5: 通知机制与功能打磨
- **文件**: `docs/plans/plan-19-feedback-module-phase5.md`
- **核心交付**: 通知表与API + 前端铃铛通知UI + 轮询机制 + 所有边缘状态处理 + 性能优化
- **验证方式**: 触发状态变更和回复，确认通知送达
- **产出物**: 带完整通知系统的反馈功能

---

## 数据库表总览

| 表名 | 用途 | 所属阶段 |
|------|------|:--------:|
| `feedback` | 反馈主表，存储所有反馈信息 | Phase 1 |
| `feedback_replies` | 回复表，存储用户和管理员的回复 | Phase 1 |
| `feedback_attachments` | 附件表，存储上传的文件信息 | Phase 1 |
| `feedback_timeline` | 时间线表，记录所有操作日志 | Phase 1 |
| `feedback_notifications` | 通知表，存储反馈相关的站内通知 | Phase 5 |

---

## API 端点总览

| 方法 | 路径 | 权限 | 阶段 |
|------|------|------|:----:|
| POST | `/api/feedback` | optionalAuth | Phase 1 |
| GET | `/api/feedback` | authenticate | Phase 1 |
| GET | `/api/feedback/:id` | authenticate | Phase 1 |
| POST | `/api/feedback/:id/reply` | authenticate | Phase 1 |
| PUT | `/api/feedback/:id/status` | authenticate | Phase 1 |
| POST | `/api/feedback/:id/close` | authenticate | Phase 1 |
| POST | `/api/feedback/:id/reopen` | authenticate | Phase 1 |
| POST | `/api/feedback/upload` | optionalAuth | Phase 1 |
| GET | `/api/feedback/admin/all` | admin | Phase 1 |
| GET | `/api/feedback/admin/stats` | admin | Phase 1 |
| PUT | `/api/feedback/admin/:id/assign` | admin | Phase 1 |
| POST | `/api/feedback/admin/batch` | admin | Phase 1 |
| GET | `/api/feedback/notifications` | authenticate | Phase 5 |
| GET | `/api/feedback/notifications/unread-count` | authenticate | Phase 5 |
| PUT | `/api/feedback/notifications/:id/read` | authenticate | Phase 5 |
| PUT | `/api/feedback/notifications/read-all` | authenticate | Phase 5 |

---

## 前端路由总览

| 路径 | 页面 | 权限 | 阶段 |
|------|------|------|:----:|
| (全局浮动按钮) | FeedbackDialog | 所有用户 | Phase 2 |
| `/feedback` | 我的反馈列表 | 登录用户 | Phase 3 |
| `/feedback/:id` | 反馈详情 | 登录用户（提交人或管理员） | Phase 3 |
| `/feedback/admin` | 反馈管理后台 | 管理员 | Phase 4 |

---

## 关键业务规则实现对照

| PRD 规则 | 描述 | 实现位置 | 阶段 |
|:--------:|------|---------|:----:|
| R001 | 已登录自动关联用户ID | `services/feedback.ts` createFeedback | Phase 1 |
| R002 | 未登录可填写邮箱 | `routes/feedback.ts` POST / (optionalAuth) | Phase 1 |
| R003 | 5分钟内最多5次 | `services/feedback.ts` 防刷检查 | Phase 1 |
| R004 | 创建追踪记录 | `services/feedback.ts` 创建时间线 | Phase 1 |
| R005 | 隐私声明 | `PrivacyInfo.tsx` 折叠面板 | Phase 2 |
| R006 | 仅提交人和管理员可查看 | `services/feedback.ts` 权限验证 | Phase 1 |
| R007 | 7天内可重新开启 | `services/feedback.ts` reopenFeedback | Phase 1 |
| R008 | 每次操作生成时间线 | `services/feedback.ts` 所有操作写时间线 | Phase 1 |
| R009 | 管理员回复显示 | `services/feedback.ts` addReply is_admin_reply | Phase 1 |
| R010 | 状态变更需备注 | 前端 StatusChangeDialog | Phase 4 |
| R011 | 重复反馈需关联原反馈 | `services/feedback.ts` DuplicateDialog | Phase 4 |
| R012 | 已修复备注版本号 | `StatusChangeDialog.tsx` 备注字段 | Phase 4 |
| R013 | 状态变更自动通知 | `services/notification.ts` | Phase 5 |

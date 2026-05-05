# Plan-15: 用户问题反馈模块 — Phase 1：数据库Schema与后端API

## 目标

实现用户反馈功能的后端基础设施，包括数据库表创建、类型定义、文件上传基础设施、反馈CRUD API、以及状态管理API。

## 涉及文件清单

### 后端新建文件
- `backend/src/routes/feedback.ts` — 反馈相关所有路由
- `backend/src/services/feedback.ts` — 反馈业务逻辑层
- `backend/src/utils/file-upload.ts` — 文件上传工具（Multer配置、文件类型校验、压缩）

### 后端修改文件
- `backend/src/lib/db/schema.ts` — 添加 feedback 系列表
- `backend/src/lib/db/auto-migrate.ts` — 添加新表迁移逻辑
- `backend/src/types/index.ts` — 添加 Feedback 相关类型
- `backend/src/index.ts` — 注册 `/api/feedback` 路由
- `backend/src/middleware/auth.ts` — 添加 `optionalAuth`（已存在，确认即可）
- `backend/package.json` — 添加 `multer` 依赖

### 前端新建文件
- 无（Phase 2 实现）

### 前端修改文件
- 无（Phase 2 实现）

## 依赖项
- Plan-1 到 Plan-14 全部完成

---

## 实现要点

### 1. 数据库表设计

在 `backend/src/lib/db/schema.ts` 的 `createTablesSQL` 中添加以下表：

#### feedback 表

```sql
CREATE TABLE IF NOT EXISTS feedback (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  guest_email VARCHAR(100),
  type ENUM('bug', 'feature_request', 'other') NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  contact VARCHAR(100),
  status ENUM('pending', 'processing', 'fixed', 'closed', 'duplicate') NOT NULL DEFAULT 'pending',
  duplicate_of CHAR(36),
  page_url VARCHAR(500),
  browser_info VARCHAR(500),
  browser_language VARCHAR(20),
  screen_resolution VARCHAR(20),
  operating_system VARCHAR(100),
  system_version VARCHAR(50),
  assigned_to CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (duplicate_of) REFERENCES feedback(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_feedback_user (user_id),
  INDEX idx_feedback_status (status),
  INDEX idx_feedback_type (type),
  INDEX idx_feedback_created_at (created_at),
  INDEX idx_feedback_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### feedback_replies 表

```sql
CREATE TABLE IF NOT EXISTS feedback_replies (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  feedback_id CHAR(36) NOT NULL,
  user_id CHAR(36),
  content TEXT NOT NULL,
  is_admin_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_replies_feedback (feedback_id),
  INDEX idx_replies_created (feedback_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### feedback_attachments 表

```sql
CREATE TABLE IF NOT EXISTS feedback_attachments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  feedback_id CHAR(36),
  reply_id CHAR(36),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
  FOREIGN KEY (reply_id) REFERENCES feedback_replies(id) ON DELETE CASCADE,
  INDEX idx_attachments_feedback (feedback_id),
  INDEX idx_attachments_reply (reply_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### feedback_timeline 表

```sql
CREATE TABLE IF NOT EXISTS feedback_timeline (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  feedback_id CHAR(36) NOT NULL,
  action_type VARCHAR(30) NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  content TEXT,
  operator_id CHAR(36),
  reply_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reply_id) REFERENCES feedback_replies(id) ON DELETE SET NULL,
  INDEX idx_timeline_feedback (feedback_id),
  INDEX idx_timeline_created (feedback_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. 自动迁移

在 `backend/src/lib/db/auto-migrate.ts` 中，确保 `createTablesSQL` 被执行即可——因为使用了 `CREATE TABLE IF NOT EXISTS`，迁移是幂等的。

### 3. 后端类型定义

在 `backend/src/types/index.ts` 中添加：

```typescript
// Feedback Types
export type FeedbackType = 'bug' | 'feature_request' | 'other';
export type FeedbackStatus = 'pending' | 'processing' | 'fixed' | 'closed' | 'duplicate';
export type TimelineActionType = 'created' | 'status_changed' | 'replied' | 'reopened';

export interface Feedback {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  type: FeedbackType;
  title: string;
  description: string;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  contact: string | null;
  status: FeedbackStatus;
  duplicate_of: string | null;
  page_url: string | null;
  browser_info: string | null;
  browser_language: string | null;
  screen_resolution: string | null;
  operating_system: string | null;
  system_version: string | null;
  assigned_to: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface FeedbackResponse {
  id: string;
  feedback_no: string;
  type: FeedbackType;
  title: string;
  description: string;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  contact: string | null;
  status: FeedbackStatus;
  duplicate_of: string | null;
  duplicate_title?: string | null;
  page_url: string | null;
  browser_info: string | null;
  browser_language: string | null;
  screen_resolution: string | null;
  operating_system: string | null;
  system_version: string | null;
  submitter_name?: string;
  attachments?: FeedbackAttachment[];
  timeline?: FeedbackTimelineResponse[];
  replies?: FeedbackReplyResponse[];
  created_at: Date;
  updated_at: Date;
  // Permission fields
  is_own_project?: boolean;
  role?: CollaboratorRole | null;
}

export interface FeedbackListItem {
  id: string;
  feedback_no: string;
  type: FeedbackType;
  title: string;
  status: FeedbackStatus;
  submitter_name?: string;
  reply_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateFeedbackData {
  type: FeedbackType;
  title: string;
  description: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  contact?: string;
  page_url?: string;
  browser_info?: string;
  browser_language?: string;
  screen_resolution?: string;
  operating_system?: string;
  system_version?: string;
  attachment_ids?: string[];
}

export interface FeedbackAttachment {
  id: string;
  feedback_id: string | null;
  reply_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: Date;
}

export interface FeedbackReply {
  id: string;
  feedback_id: string;
  user_id: string | null;
  content: string;
  is_admin_reply: boolean;
  created_at: Date;
}

export interface FeedbackReplyResponse {
  id: string;
  content: string;
  is_admin_reply: boolean;
  author_name?: string;
  attachments?: FeedbackAttachment[];
  created_at: Date;
}

export interface FeedbackTimeline {
  id: string;
  feedback_id: string;
  action_type: TimelineActionType;
  old_status: string | null;
  new_status: string | null;
  content: string | null;
  operator_id: string | null;
  reply_id: string | null;
  created_at: Date;
}

export interface FeedbackTimelineResponse {
  id: string;
  action_type: TimelineActionType;
  old_status: string | null;
  new_status: string | null;
  content: string | null;
  operator_name?: string;
  created_at: Date;
}
```

### 4. 文件上传工具

新建 `backend/src/utils/file-upload.ts`：

- 使用 `multer` 处理文件上传
- 配置文件存储目录：`uploads/feedback/`
- 文件类型白名单：`jpg`, `png`, `gif`, `webp`, `log`, `txt`
- 单文件大小限制：5MB
- 单次上传文件数量限制：5个
- 文件名生成：`UUID + 原始扩展名`
- 图片压缩：超过2MB的图片自动压缩到2MB以内（使用 `sharp` 或 `imagemagick`，考虑到项目简洁性，可用 `sharp`）

上传流程：
1. 用户选择文件后立即上传（独立的上传接口 `POST /api/feedback/upload`）
2. 上传成功返回文件ID和URL
3. 表单提交时只保存文件ID列表

新增依赖到 `backend/package.json`：
- `multer` — 文件上传中间件
- `sharp` — 图片压缩

### 5. 反馈业务逻辑服务

新建 `backend/src/services/feedback.ts`，实现以下方法：

| 方法 | 说明 |
|------|------|
| `createFeedback(userId, email, data)` | 创建反馈，生成反馈编号，创建时间线记录 |
| `getFeedbackById(feedbackId, userId)` | 获取反馈详情（含附件、回复、时间线） |
| `getUserFeedbacks(userId, filters)` | 获取用户反馈列表（支持分页、筛选、搜索） |
| `getAllFeedbacksForAdmin(filters)` | 管理员获取全部反馈列表 |
| `updateFeedbackStatus(feedbackId, userId, newStatus, reason)` | 更新反馈状态（含验证逻辑） |
| `addReply(feedbackId, userId, content, attachmentIds)` | 添加回复（创建时间线记录） |
| `closeFeedback(feedbackId, userId)` | 用户关闭反馈 |
| `reopenFeedback(feedbackId, userId)` | 用户7天内重新开启反馈 |
| `getFeedbackStats()` | 获取管理员统计概览数据 |
| `searchFeedbacks(keyword)` | 按标题/编号模糊搜索 |
| `generateFeedbackNo()` | 生成反馈编号（格式：FB-YYYYMMDD-NNNN） |

**反馈编号生成规则**：`FB-YYYYMMDD-NNNN`，其中NNNN为当天提交的序号，从0001开始自增。

**状态流转验证规则**（对应PRD R010-R013）：
- `pending` → `processing`：管理员确认
- `pending` → `duplicate`：需指定 `duplicate_of`
- `pending` → `closed`：管理员判定非问题
- `processing` → `fixed`：开发完成修复
- `fixed` → `closed`：用户验证通过
- `fixed` → `processing`：用户验证未通过
- 任意状态 → `closed`：用户或管理员主动关闭（需备注原因）
- `closed` → `pending`：用户7天内重新开启

**防刷机制**（PRD R003）：
- 同一用户5分钟内最多提交5次反馈
- 在 `createFeedback` 中检查

### 6. 反馈路由

新建 `backend/src/routes/feedback.ts`，注册以下路由：

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| `POST` | `/api/feedback` | 登录或未登录 | 提交反馈（已登录自动关联用户，未登录可填邮箱） |
| `GET` | `/api/feedback` | 登录 | 获取当前用户的反馈列表（支持筛选、搜索、分页） |
| `GET` | `/api/feedback/:id` | 登录或提交人 | 获取反馈详情（含时间线、附件、回复） |
| `POST` | `/api/feedback/:id/reply` | 登录或提交人 | 添加回复 |
| `PUT` | `/api/feedback/:id/status` | 登录 | 更新反馈状态 |
| `POST` | `/api/feedback/:id/close` | 登录或提交人 | 关闭反馈 |
| `POST` | `/api/feedback/:id/reopen` | 登录或提交人 | 重新开启反馈（7天内） |
| `POST` | `/api/feedback/upload` | 登录或未登录 | 上传附件（独立接口，返回文件ID） |
| `GET` | `/api/feedback/admin/all` | 管理员 | 管理员获取全部反馈列表 |
| `GET` | `/api/feedback/admin/stats` | 管理员 | 管理员获取统计概览 |
| `PUT` | `/api/feedback/admin/:id/assign` | 管理员 | 分配处理人 |
| `POST` | `/api/feedback/admin/batch` | 管理员 | 批量操作（批量标记状态、批量关闭） |

**路由权限说明**：
- 提交反馈 (`POST /api/feedback`)：使用 `optionalAuth`，未登录用户也可提交
- 查看反馈列表 (`GET /api/feedback`)：使用 `authenticate`，需要登录
- 查看反馈详情 (`GET /api/feedback/:id`)：使用 `authenticate`，但需要验证是提交人或管理员
- 管理员接口：使用 `authenticate` + 管理员权限检查

**管理员权限检查**：暂时使用简单方案——检查用户ID是否在环境变量 `ADMIN_USER_IDS` 中配置，或通过 `users` 表 `is_admin` 字段判断。建议在 `users` 表添加 `is_admin` 字段，或者为简单起见，添加一个 `admins` 表。为保持最小改动，可以先在环境变量中配置管理员邮箱列表。

**校验规则**（使用 express-validator）：

| 接口 | 字段 | 校验规则 |
|------|------|---------|
| POST /api/feedback | type | 必填，enum: bug/feature_request/other |
| | title | 必填，5-100字符 |
| | description | 必填，10-2000字符 |
| POST /api/feedback/:id/reply | content | 必填，1-2000字符 |
| PUT /api/feedback/:id/status | status | 必填，有效的状态值 |
| | reason | 必填（状态变更原因） |

### 7. 注册路由

在 `backend/src/index.ts` 中添加：

```typescript
import feedbackRoutes from './routes/feedback';
app.use('/api/feedback', feedbackRoutes);
```

### 8. 文件上传存储目录

- 在项目根目录创建 `uploads/feedback/` 目录
- 在 `backend/.gitignore` 中添加 `uploads/`（确保不上传用户文件）
- Express 静态文件服务：`app.use('/uploads', express.static('uploads'))`

---

## 预期验证方式

1. 启动后端：`npm run dev`
2. 检查数据库表是否自动创建成功（feedback, feedback_replies, feedback_attachments, feedback_timeline）
3. 使用 curl 或 Postman 测试以下接口：
   - `POST /api/feedback/upload` — 上传测试文件（图片、txt、log）
   - `POST /api/feedback` — 提交反馈（带附件ID）
   - `GET /api/feedback` — 获取反馈列表
   - `GET /api/feedback/:id` — 获取反馈详情
   - `POST /api/feedback/:id/reply` — 添加回复
   - `PUT /api/feedback/:id/status` — 更新状态
   - `POST /api/feedback/:id/close` — 关闭反馈
   - `POST /api/feedback/:id/reopen` — 重新开启
4. 测试未登录用户提交反馈（有邮箱字段）
5. 测试5分钟内超过5次提交的防刷限制
6. 测试无效状态流转被拒绝
7. 编译无错误

## 交付物清单

- [ ] feedback、feedback_replies、feedback_attachments、feedback_timeline 表创建
- [ ] 后端 Feedback 相关类型定义
- [ ] 文件上传工具（multer + sharp 压缩）
- [ ] 反馈业务逻辑服务（含状态流转验证、防刷机制、编号生成）
- [ ] 反馈 CRUD API 路由（含校验）
- [ ] 管理员反馈管理 API
- [ ] 路由注册到 Express
- [ ] 文件上传存储目录创建
- [ ] 编译无错误

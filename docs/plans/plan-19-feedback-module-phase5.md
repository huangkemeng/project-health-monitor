# Plan-19: 用户问题反馈模块 — Phase 5：通知机制与功能打磨

## 目标

实现反馈状态变更和回复的通知机制，完善加载、空、错误等边缘状态处理，修复潜在问题，确保整体功能流畅稳定。

## 涉及文件清单

### 前端新建文件
- `frontend/src/components/feedback/notification/FeedbackNotificationProvider.tsx` — 反馈通知上下文提供者
- `frontend/src/components/feedback/notification/FeedbackNotificationBadge.tsx` — 通知徽标组件
- `frontend/src/components/feedback/notification/FeedbackNotificationList.tsx` — 通知列表弹窗
- `frontend/src/components/feedback/notification/index.ts` — barrel export
- `frontend/src/hooks/useFeedbackNotifications.ts` — 反馈通知 Hook

### 后端新建文件
- `backend/src/services/notification.ts` — 通知服务（创建通知、获取通知、标记已读）

### 后端修改文件
- `backend/src/lib/db/schema.ts` — 添加 `feedback_notifications` 表
- `backend/src/routes/feedback.ts` — 在状态变更和回复时创建通知
- `backend/src/types/index.ts` — 添加通知相关类型

### 前端修改文件
- `frontend/src/app/layout.tsx` — 注册 FeedbackNotificationProvider
- `frontend/src/components/layout/Header.tsx` — 添加通知铃铛图标 + 徽标
- `frontend/src/lib/api.ts` — 添加通知相关 API
- `frontend/src/types/index.ts` — 添加通知相关类型

## 依赖项
- Phase 1-4 全部完成

---

## 实现要点

### 1. 通知数据库表

在 `backend/src/lib/db/schema.ts` 中添加：

```sql
CREATE TABLE IF NOT EXISTS feedback_notifications (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  feedback_id CHAR(36) NOT NULL,
  type ENUM('status_change', 'reply', 'admin_reply', 'system') NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, is_read),
  INDEX idx_notifications_user_created (user_id, created_at DESC),
  INDEX idx_notifications_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. 通知服务

新建 `backend/src/services/notification.ts`：

| 方法 | 说明 |
|------|------|
| `createNotification(userId, feedbackId, type, title, content)` | 创建一条通知 |
| `getUserNotifications(userId, page, pageSize)` | 获取用户通知列表 |
| `getUnreadCount(userId)` | 获取未读通知数量 |
| `markAsRead(notificationId, userId)` | 标记单条通知已读 |
| `markAllAsRead(userId)` | 标记全部已读 |

**通知创建时机**：
1. **状态变更通知**：当反馈状态变更时，通知反馈提交人
   - `type`: 'status_change'
   - `title`: "反馈状态已更新"
   - `content`: "您的反馈「{title}」状态已从「{old_status}」变更为「{new_status}」"
2. **管理员回复通知**：当管理员回复反馈时，通知反馈提交人
   - `type`: 'admin_reply'
   - `title`: "管理员回复了您的反馈"
   - `content`: "管理员回复了您的反馈「{title}」: {reply_preview}"
3. **用户回复通知**：当用户回复反馈时，通知管理员（如配置了管理员）
   - `type`: 'reply'
   - `title`: "用户回复了反馈"
   - `content`: "用户回复了反馈「{title}」: {reply_preview}"

### 3. 后端类型定义

在 `backend/src/types/index.ts` 中添加：

```typescript
export type NotificationType = 'status_change' | 'reply' | 'admin_reply' | 'system';

export interface FeedbackNotification {
  id: string;
  user_id: string;
  feedback_id: string;
  type: NotificationType;
  title: string;
  content: string | null;
  is_read: boolean;
  created_at: Date;
}

export interface FeedbackNotificationResponse {
  id: string;
  feedback_id: string;
  feedback_no: string;
  type: NotificationType;
  title: string;
  content: string | null;
  is_read: boolean;
  created_at: string;
}
```

### 4. 通知 API 路由

在 `backend/src/routes/feedback.ts` 中添加路由：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/feedback/notifications` | 获取当前用户通知列表（分页） |
| `GET` | `/api/feedback/notifications/unread-count` | 获取未读通知数 |
| `PUT` | `/api/feedback/notifications/:id/read` | 标记单条已读 |
| `PUT` | `/api/feedback/notifications/read-all` | 标记全部已读 |

### 5. 前端通知类型

在 `frontend/src/types/index.ts` 中添加：

```typescript
export type NotificationType = 'status_change' | 'reply' | 'admin_reply' | 'system';

export interface FeedbackNotification {
  id: string;
  feedback_id: string;
  feedback_no: string;
  type: NotificationType;
  title: string;
  content: string | null;
  is_read: boolean;
  created_at: string;
}
```

### 6. 前端通知 API

在 `frontend/src/lib/api.ts` 中添加：

```typescript
// Notification API
export const notificationApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<FeedbackNotification>>('/feedback/notifications', { params }),

  unreadCount: () =>
    apiClient.get<{ count: number }>('/feedback/notifications/unread-count'),

  markAsRead: (id: string) =>
    apiClient.put(`/feedback/notifications/${id}/read`),

  markAllAsRead: () =>
    apiClient.put('/feedback/notifications/read-all'),
};
```

### 7. 前端通知上下文

新建 `frontend/src/hooks/useFeedbackNotifications.ts`：

```typescript
interface NotificationContextType {
  unreadCount: number;
  notifications: FeedbackNotification[];
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

- 使用 React Context + useReducer 或 useState
- 轮询未读计数（每60秒）
- 提供刷新方法
- 在收到新通知时更新计数

### 8. 通知铃铛组件

修改 `frontend/src/components/layout/Header.tsx`：

在用户头像前添加通知铃铛图标：

```tsx
<Button variant="ghost" size="icon" className="relative" onClick={toggleNotificationPanel}>
  <Bell className="h-5 w-5" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )}
</Button>
```

点击后打开通知列表下拉面板。

### 9. 通知列表弹窗

新建通知列表面板（DropdownMenu 或 Popover）：

- 标题："通知"
- 顶部："全部已读"按钮（有未读时显示）
- 通知列表：
  - 每条通知显示：图标（根据type不同）、标题、内容预览、时间
  - 未读通知有蓝色左边框或背景色高亮
  - 点击通知 → 标记已读 + 跳转到对应反馈详情页
- 底部："查看全部" → 跳转到通知列表页（可选）
- 空状态："暂无通知"
- 最多显示最近20条

### 10. 整体功能打磨

#### 10.1 边缘状态处理

| 场景 | 处理方式 |
|------|---------|
| 反馈列表为空 | 显示空状态引导："暂无反馈记录，遇到问题？[提交反馈]" |
| 反馈详情加载失败 | 显示错误提示 + 重试按钮 |
| 反馈详情404 | 显示"反馈不存在"提示 + 返回列表按钮 |
| 网络错误 | 显示网络错误提示 + 重试按钮 |
| 上传文件过大 | 前端拦截 + 提示具体限制 |
| 上传文件类型不支持 | 前端拦截 + 提示支持的格式 |
| 防刷限制（5分钟5次） | 显示"提交过于频繁，请稍后再试" |
| 未授权访问 | 显示"无权访问该反馈" |
| 反馈已关闭7天后 | 显示"反馈已关闭超过7天，无法重新开启" |

#### 10.2 性能优化

- 列表分页，每页20条
- 搜索防抖（300ms）
- 图片附件懒加载
- 通知轮询间隔60秒，避免频繁请求

#### 10.3 用户体验增强

- 反馈提交成功后自动跳转到列表页（可选）
- 反馈列表页支持下拉刷新（可选）
- 详情页回复后自动滚动到底部
- 提交表单时的自动保存草稿（localStorage，可选）
- 时间显示：2分钟内→"刚刚"，1小时内→"N分钟前"，当天→"HH:mm"，昨天→"昨天 HH:mm"，更早→"MM-DD HH:mm"

#### 10.4 无障碍

- 所有图标按钮添加 `aria-label`
- 表单字段关联 label
- 加载状态使用 aria-busy
- 错误提示使用 role="alert"
- 颜色对比度满足 WCAG 2.1 AA 标准

---

## 预期验证方式

1. 提交一条反馈
2. 管理员回复该反馈
3. 确认反馈提交人收到通知（Header铃铛出现红点）
4. 点击铃铛，确认通知列表显示新通知
5. 点击通知，确认跳转到反馈详情页
6. 标记单条已读和全部已读功能正常
7. 状态变更时确认提交人收到通知
8. 用户回复时确认管理员收到通知（如配置了管理员）
9. 轮询机制正常工作（60秒间隔）
10. 测试所有边缘场景（空状态、错误、404、网络错误、权限等）
11. 编译无错误

## 交付物清单

- [ ] feedback_notifications 数据表
- [ ] 后端通知服务（创建、列表、未读计数、标记已读）
- [ ] 后端通知 API 路由
- [ ] 前端通知类型定义
- [ ] 前端通知 API 客户端
- [ ] 通知上下文 Provider + Hook（含轮询）
- [ ] Header 通知铃铛图标 + 未读红点徽标
- [ ] 通知列表弹窗（含标记已读、跳转详情）
- [ ] 所有边缘状态处理（空状态、错误、404、权限等）
- [ ] 性能优化（分页、防抖、懒加载）
- [ ] 用户体验增强（时间格式化、自动滚动等）
- [ ] 编译无错误

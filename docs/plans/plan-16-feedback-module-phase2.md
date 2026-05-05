# Plan-16: 用户问题反馈模块 — Phase 2：前端反馈提交功能

## 目标

实现用户反馈提交的前端功能，包括浮动反馈按钮、反馈表单弹窗、文件上传组件、自动捕获系统信息、隐私说明等。

## 涉及文件清单

### 前端新建文件
- `frontend/src/components/feedback/FeedbackButton.tsx` — 页面右下角浮动反馈按钮
- `frontend/src/components/feedback/FeedbackDialog.tsx` — 反馈表单弹窗（主表单容器）
- `frontend/src/components/feedback/FeedbackForm.tsx` — 反馈表单内容
- `frontend/src/components/feedback/FileUploader.tsx` — 文件上传组件（支持预览、进度、删除）
- `frontend/src/components/feedback/PrivacyInfo.tsx` — 自动捕获信息隐私说明折叠面板
- `frontend/src/components/feedback/FeedbackSuccess.tsx` — 提交成功提示组件
- `frontend/src/components/feedback/index.ts` — barrel export

### 前端修改文件
- `frontend/src/app/layout.tsx` — 全局引入 FeedbackButton
- `frontend/src/lib/api.ts` — 添加 feedbackApi 对象
- `frontend/src/types/index.ts` — 添加 Feedback 相关前端类型
- `frontend/src/components/layout/Header.tsx` — 用户下拉菜单添加"问题反馈"入口

### 后端修改文件
- 无（Phase 1 已完成后端 API）

## 依赖项
- Phase 1（数据库Schema与后端API）完成

---

## 实现要点

### 1. 前端类型定义

在 `frontend/src/types/index.ts` 中添加：

```typescript
// Feedback Types
export type FeedbackType = 'bug' | 'feature_request' | 'other';
export type FeedbackStatus = 'pending' | 'processing' | 'fixed' | 'closed' | 'duplicate';

export interface Feedback {
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
  timeline?: FeedbackTimelineItem[];
  replies?: FeedbackReply[];
  created_at: string;
  updated_at: string;
}

export interface FeedbackListItem {
  id: string;
  feedback_no: string;
  type: FeedbackType;
  title: string;
  status: FeedbackStatus;
  submitter_name?: string;
  reply_count: number;
  created_at: string;
  updated_at: string;
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
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface FeedbackReply {
  id: string;
  content: string;
  is_admin_reply: boolean;
  author_name?: string;
  attachments?: FeedbackAttachment[];
  created_at: string;
}

export interface FeedbackTimelineItem {
  id: string;
  action_type: 'created' | 'status_changed' | 'replied' | 'reopened';
  old_status: string | null;
  new_status: string | null;
  content: string | null;
  operator_name?: string;
  created_at: string;
}

export interface FeedbackStats {
  pending_count: number;
  processing_count: number;
  today_count: number;
  week_count: number;
  avg_response_time: number;
}
```

### 2. API 客户端

在 `frontend/src/lib/api.ts` 中添加：

```typescript
// Feedback API
export const feedbackApi = {
  // 提交反馈（支持未登录）
  create: (data: CreateFeedbackData) =>
    apiClient.post<Feedback>('/feedback', data),

  // 获取我的反馈列表
  list: (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    type?: string;
    keyword?: string;
    start_date?: string;
    end_date?: string;
  }) =>
    apiClient.get<PaginatedResponse<FeedbackListItem>>('/feedback', { params }),

  // 获取反馈详情
  get: (id: string) =>
    apiClient.get<Feedback>(`/feedback/${id}`),

  // 添加回复
  addReply: (id: string, data: { content: string; attachment_ids?: string[] }) =>
    apiClient.post<FeedbackReply>(`/feedback/${id}/reply`, data),

  // 更新状态
  updateStatus: (id: string, data: { status: FeedbackStatus; reason: string; duplicate_of?: string }) =>
    apiClient.put(`/feedback/${id}/status`, data),

  // 关闭反馈
  close: (id: string) =>
    apiClient.post(`/feedback/${id}/close`),

  // 重新开启
  reopen: (id: string) =>
    apiClient.post(`/feedback/${id}/reopen`),

  // 上传附件（独立接口）
  uploadAttachment: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<{ id: string; file_name: string; file_url: string; file_size: number; mime_type: string }>(
      '/feedback/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      }
    );
  },

  // 管理员接口
  adminList: (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    type?: string;
    keyword?: string;
  }) =>
    apiClient.get<PaginatedResponse<FeedbackListItem>>('/feedback/admin/all', { params }),

  adminStats: () =>
    apiClient.get<FeedbackStats>('/feedback/admin/stats'),

  adminAssign: (id: string, userId: string) =>
    apiClient.put(`/feedback/admin/${id}/assign`, { assigned_to: userId }),

  adminBatch: (data: { ids: string[]; action: string; value?: string }) =>
    apiClient.post('/feedback/admin/batch', data),
};
```

### 3. 浮动反馈按钮

新建 `frontend/src/components/feedback/FeedbackButton.tsx`：

- 固定在页面右下角
- 图标使用 MessageCircle / MessageSquare / 气泡样式
- 点击打开 FeedbackDialog
- 圆角全、带阴影、悬停效果
- 使用 TailwindCSS 的 `fixed` 定位（bottom-6 right-6）
- z-index: 50
- 仅在非登录页面和反馈相关页面显示（通过 pathname 判断）

交互：
1. 点击按钮 → 打开 FeedbackDialog
2. 对话框中显示反馈表单
3. 提交成功 → 显示 FeedbackSuccess 组件
4. 关闭对话框 → 回到原始页面

### 4. 反馈表单对话框

新建 `frontend/src/components/feedback/FeedbackDialog.tsx`：

- 使用 shadcn/ui 的 `Dialog` 组件
- 宽屏布局：默认宽度 `max-w-2xl`
- 标题："问题反馈" / "提交反馈"
- 包含表单内容，提交成功，加载状态
- 支持 esc 关闭，点击外部关闭
- 如果用户未登录，在表单顶部显示提示："未登录用户提交反馈后无法追踪进度，建议先登录"

### 5. 反馈表单

新建 `frontend/src/components/feedback/FeedbackForm.tsx`：

包含以下字段（对应PRD 2.2.3）：

**反馈类型**：
- 使用 shadcn/ui 的 RadioGroup 或 Tabs 风格
- 三个选项：Bug/功能建议/其他
- 每个选项带图标（BugReport/Lightbulb/HelpCircle）

**标题**：
- Input 组件
- placeholder: "请简要描述您的问题或建议"
- 字符计数：当前/100
- 实时校验：5-100字符

**详细描述**：
- Textarea 组件
- placeholder: "请详细描述您遇到的问题或建议..."
- 字符计数：当前/2000
- 实时校验：10-2000字符

**复现步骤**（仅Bug类型时显示，且建议填写）：
- Textarea 组件
- placeholder: "请描述复现问题的步骤..."
- 字符计数：当前/2000

**期望行为**：
- Textarea 组件
- placeholder: "您期望的正确行为是？"
- 字符计数：当前/1000

**实际行为**：
- Textarea 组件
- placeholder: "实际出现的错误行为是？"
- 字符计数：当前/1000

**附件上传**（FileUploader 组件）：
- 显示已上传文件列表（缩略图/文件名）
- 支持继续添加（最多5个）
- 每个文件显示大小、删除按钮
- 上传进度条

**联系方式**：
- Input 组件
- placeholder: "邮箱或手机号，便于我们与您联系（选填）"

**自动捕获信息**（PrivacyInfo 折叠面板）：
- 在表单底部，默认折叠
- 标题："系统已自动捕获以下信息"
- 展开后显示：页面URL、浏览器、操作系统、屏幕分辨率等
- 隐私说明："以上信息仅用于问题定位，不会用于其他用途"

**提交按钮**：
- "提交反馈" 按钮
- 加载状态显示 "提交中..."
- 校验通过后才可点击

**表单校验逻辑**：
- 使用 React 状态管理表单，不使用第三方表单库
- 提交时校验所有必填字段
- 实时显示校验错误信息
- 防重复提交：提交后按钮禁用

### 6. 文件上传组件

新建 `frontend/src/components/feedback/FileUploader.tsx`：

功能：
- 点击或拖拽上传（可选 drag & drop）
- 文件选择后立即自动上传到 `POST /api/feedback/upload`
- 显示上传进度条
- 上传成功后显示文件信息（文件名、大小、缩略图）
- 支持删除已上传文件
- 支持取消上传（使用 AbortController）

状态管理：
- `files: UploadedFile[]` — 已上传成功的文件列表
- `uploading: boolean` — 是否正在上传
- `progress: number` — 当前上传进度（0-100）
- `error: string | null` — 上传错误信息

UI 布局：
- 虚线边框的 drop zone
- 文件列表以横向/纵向排列
- 图片类型显示缩略图（使用 URL.createObjectURL 或文件URL）
- 非图片类型显示文件类型图标
- 每个文件右上角删除按钮

错误处理：
- 文件类型不支持 → 提示 "不支持的文件格式"
- 文件超过5MB → 提示 "文件大小不能超过5MB"
- 上传失败 → 提示 "文件上传失败，请重试"

### 7. 隐私说明组件

新建 `frontend/src/components/feedback/PrivacyInfo.tsx`：

- 使用 shadcn/ui 的 Collapsible 或自定义折叠面板
- 默认折叠状态
- 展开后以表格或列表形式显示自动捕获的信息

自动捕获的信息（在组件 mount 时收集）：
- 当前页面URL：`window.location.href`
- 浏览器信息：`navigator.userAgent`
- 浏览器语言：`navigator.language`
- 屏幕分辨率：`${screen.width} × ${screen.height}`
- 操作系统：从 `navigator.userAgent` 解析
- 时间戳：`new Date().toISOString()`

将这些信息作为隐藏字段随表单一起提交。

### 8. 提交成功组件

新建 `frontend/src/components/feedback/FeedbackSuccess.tsx`：

- 成功图标（CheckCircle）
- 标题："反馈已提交"
- 反馈编号展示（大号字体，如 `FB-20260505-0001`）
- 说明文字："感谢您的反馈，我们会尽快处理"
- 两个按钮：
  - "查看我的反馈" → 跳转到反馈详情页（需要登录）
  - "继续浏览" → 关闭对话框
- 5秒后自动关闭

### 9. 全局集成

**Layout 集成**（`frontend/src/app/layout.tsx`）：
- 导入 FeedbackButton
- 在所有页面中渲染（放在 AuthProvider 内部）

**Header 入口**（`frontend/src/components/layout/Header.tsx`）：
- 在用户下拉菜单中添加"问题反馈"菜单项
- 在"项目协作"和"设置"之间
- 图标：MessageCircle

**状态管理**：
- 使用 React Context 或 zustand store 管理 FeedbackDialog 的打开/关闭状态
- 或者使用简单的 useState 提升到 FeedbackButton 组件中

建议：使用简单的状态提升。FeedbackButton 包含 FeedbackDialog，FeedbackDialog 内部管理表单状态。

### 10. 表单提交逻辑

表单提交流程：
1. 用户填写表单
2. 用户上传附件（可选）
3. 系统收集自动捕获信息
4. 用户点击"提交反馈"
5. 前端校验所有必填字段
6. 调用 `POST /api/feedback`
7. 提交成功后显示 FeedbackSuccess
8. 提交失败显示错误信息

---

## 预期验证方式

1. 启动前端和后端：`npm run dev`
2. 确认页面右下角显示浮动反馈按钮
3. 点击按钮，反馈表单弹窗打开
4. 测试表单字段校验（空字段、超长文本）
5. 测试文件上传（图片、txt、log格式）
6. 测试文件类型限制（上传非支持格式）
7. 测试文件大小限制（上传超过5MB文件）
8. 提交反馈，确认显示成功提示和反馈编号
9. 确认 Header 下拉菜单中有"问题反馈"入口
10. 编译无错误

## 交付物清单

- [ ] 前端 Feedback 相关类型定义
- [ ] feedbackApi 对象（含所有接口方法）
- [ ] 浮动反馈按钮组件
- [ ] 反馈表单对话框组件
- [ ] 反馈表单（含所有字段和校验）
- [ ] 文件上传组件（含进度、预览、错误处理）
- [ ] 隐私说明折叠面板（自动捕获信息）
- [ ] 提交成功组件
- [ ] 全局集成（Layout + Header）
- [ ] 表单提交逻辑（含防刷提示）
- [ ] 编译无错误

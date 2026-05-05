# Plan-17: 用户问题反馈模块 — Phase 3：前端反馈列表与详情页

## 目标

实现"我的反馈"列表页面和反馈详情页面，支持筛选、搜索、分页、状态管理、时间线展示和回复沟通。

## 涉及文件清单

### 前端新建文件
- `frontend/src/app/feedback/page.tsx` — 我的反馈列表页
- `frontend/src/app/feedback/[id]/page.tsx` — 反馈详情页
- `frontend/src/components/feedback/FeedbackList.tsx` — 反馈列表组件
- `frontend/src/components/feedback/FeedbackCard.tsx` — 反馈卡片组件
- `frontend/src/components/feedback/FeedbackFilter.tsx` — 筛选栏组件
- `frontend/src/components/feedback/FeedbackDetail.tsx` — 反馈详情组件
- `frontend/src/components/feedback/FeedbackTimeline.tsx` — 时间线组件
- `frontend/src/components/feedback/FeedbackReplyBox.tsx` — 回复输入框组件
- `frontend/src/components/feedback/FeedbackAttachmentPreview.tsx` — 附件预览组件
- `frontend/src/components/feedback/FeedbackStatusBadge.tsx` — 状态标签组件
- `frontend/src/components/feedback/FeedbackStatusActions.tsx` — 状态操作按钮组件

### 前端修改文件
- `frontend/src/components/layout/Sidebar.tsx` — 添加"问题反馈"导航链接
- `frontend/src/components/layout/Header.tsx` — 确认导航链接（可选）

### 后端修改文件
- 无（Phase 1 已完成后端 API）

## 依赖项
- Phase 1（数据库Schema与后端API）完成
- Phase 2（前端反馈提交）完成

---

## 实现要点

### 1. 导航入口

在 `frontend/src/components/layout/Sidebar.tsx` 的 `navItems` 中添加：

```typescript
{ href: "/feedback", label: "问题反馈", icon: MessageCircle }
```

放在 "Webhook" 和 "设置" 之间。

### 2. 状态标签组件

新建 `frontend/src/components/feedback/FeedbackStatusBadge.tsx`：

根据状态显示不同颜色的 Badge（使用 shadcn/ui 的 Badge 组件）：

| 状态 | 显示文本 | 颜色 |
|------|---------|:----:|
| pending | 待处理 | 红（destructive） |
| processing | 处理中 | 黄/橙（warning） |
| fixed | 已修复 | 绿（success/emerald） |
| closed | 已关闭 | 灰（secondary） |
| duplicate | 重复反馈 | 蓝（default/blue） |

```typescript
const statusConfig: Record<FeedbackStatus, { label: string; variant: string }> = {
  pending: { label: '待处理', variant: 'destructive' },
  processing: { label: '处理中', variant: 'warning' },
  fixed: { label: '已修复', variant: 'success' },
  closed: { label: '已关闭', variant: 'secondary' },
  duplicate: { label: '重复反馈', variant: 'default' },
};
```

### 3. 类型标签组件

在 `FeedbackStatusBadge.tsx` 中或单独新建，显示反馈类型标签：

| 类型 | 显示文本 | 颜色 |
|------|---------|:----:|
| bug | Bug | red |
| feature_request | 功能建议 | blue |
| other | 其他 | gray |

### 4. 反馈列表页

新建 `frontend/src/app/feedback/page.tsx`：

**页面结构**：
```
┌─────────────────────────────────────────────────┐
│  我的反馈      [新建反馈] 按钮                    │
│  查看和管理您提交的反馈记录                        │
├─────────────────────────────────────────────────┤
│  [筛选栏: 状态下拉 | 类型下拉 | 搜索框]           │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐│
│  │  反馈卡片 1                                  ││
│  │  FB-20260505-0001  │  Bug  │  待处理        ││
│  │  标题文字...                                 ││
│  │  2026-05-05 14:30                           ││
│  └─────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────┐│
│  │  反馈卡片 2                                  ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  [分页组件]                                     │
└─────────────────────────────────────────────────┘
```

**功能点**：
- 使用 `MainLayout` 布局
- 页面标题："我的反馈"，副标题："查看和管理您提交的反馈记录"
- 右上角"新建反馈"按钮（打开 FeedbackDialog）
- 筛选栏（FeedbackFilter 组件）：
  - 状态下拉：全部/待处理/处理中/已修复/已关闭/重复反馈
  - 类型下拉：全部/Bug/功能建议/其他
  - 关键词搜索框（带300ms防抖）
  - 时间范围下拉（可选，简化版可以不实现自定义，仅最近7/30/90天）
- 反馈列表（FeedbackList 组件）：
  - 使用 FeedbackCard 组件展示每条反馈
  - 点击卡片进入详情页
  - 空状态：显示引导信息 "暂无反馈记录，遇到问题？[提交反馈]"
  - 加载状态：Skeleton 骨架屏
- 分页：使用 shadcn/ui 的分页或简单的前后翻页

**FeedbackCard 组件**（`frontend/src/components/feedback/FeedbackCard.tsx`）：
- 展示字段：反馈编号、标题、类型标签、状态标签、提交时间、最近更新时间
- 鼠标悬停时显示简短预览（前50字描述）— 使用 tooltip
- 点击跳转到详情页
- 简洁卡片设计

**FeedbackFilter 组件**（`frontend/src/components/feedback/FeedbackFilter.tsx`）：
- 水平排列的筛选控件
- 状态下拉（Select 组件）
- 类型下拉（Select 组件）
- 搜索输入框（Input 组件，带搜索图标）
- "重置"按钮（清除所有筛选条件）
- 响应式：移动端垂直堆叠

### 5. 反馈详情页

新建 `frontend/src/app/feedback/[id]/page.tsx`：

**页面结构**（对应PRD 2.4.2）：

```
┌─────────────────────────────────────────────────┐
│  ← 返回列表                                      │
├─────────────────────────────────────────────────┤
│  FB-20260505-0001                               │
│  [标题 - 大号字体]                               │
│  [Bug标签] [待处理标签]  提交于 2026-05-05 14:30 │
│  提交人: username / email                        │
├─────────────────────────────────────────────────┤
│  【详细描述】                                     │
│  用户详细问题描述...                              │
│                                                 │
│  【复现步骤】（如有）                            │
│  1. 步骤一                                       │
│  2. 步骤二                                       │
│                                                 │
│  【期望行为】（如有）                            │
│  ...                                            │
│                                                 │
│  【实际行为】（如有）                            │
│  ...                                            │
│                                                 │
│  【附件】（如有）                                │
│  [缩略图1] [缩略图2] [缩略图3]                   │
│                                                 │
│  【系统信息】（折叠面板）                        │
│  页面URL: ...                                    │
│  浏览器: ...                                     │
│  操作系统: ...                                   │
├─────────────────────────────────────────────────┤
│  【处理进度】                                    │
│  ┌─ 时间线 ──────────────────────────────────┐  │
│  │  [系统消息] 已提交 - 待处理  14:30         │  │
│  │  [管理员] 已确认，正在排查  15:00          │  │
│  │  [系统消息] 状态变更为处理中  16:30        │  │
│  │  [用户] 好的，请尽快修复  17:00           │  │
│  │  [管理员] 已修复，请验证  18:00           │  │
│  │  ...                                      │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  【回复输入框】                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  [输入回复内容...]                        │   │
│  │  [上传附件]                    [发送]     │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**数据加载**：
- 使用 `useFeedback` hook 或直接在 page 组件中使用 `useEffect` 获取数据
- URL 参数 `id` 从 `useParams` 获取
- 加载状态：Skeleton 骨架屏
- 错误状态：错误提示 + 重试按钮
- 404 状态：反馈不存在提示

**功能点**：
1. **反馈概要区域**：反馈编号、标题、类型标签、状态标签、提交时间、提交人
2. **反馈内容区域**：详细描述、复现步骤、期望行为、实际行为（分段展示）
3. **附件预览区域**（FeedbackAttachmentPreview 组件）：
   - 图片附件显示缩略图，点击放大（使用简单的 Modal 或 Dialog）
   - 非图片附件显示文件图标和文件名，点击下载
   - 使用 `GET /uploads/...` 路径加载文件
4. **系统信息区域**：使用折叠面板展示自动捕获的系统信息
5. **状态操作按钮**（FeedbackStatusActions 组件）：
   - 根据用户角色和当前状态显示可操作按钮
   - 用户：可关闭（非closed状态）、可重新开启（closed状态，7天内）
   - 管理员：可变更状态、可分配处理人
6. **处理进度时间线**（FeedbackTimeline 组件）：
   - 按时间倒序排列
   - 不同类型的记录使用不同图标和颜色
   - 系统消息：info图标 + 蓝色
   - 管理员回复：user-check图标 + 绿色
   - 用户回复：user图标 + 灰色
   - 状态变更：arrow-left-right图标 + 橙色
   - 时间格式：相对时间（如"5分钟前"）+ 绝对时间（hover显示）

7. **回复功能**（FeedbackReplyBox 组件）：
   - Textarea 输入框
   - 附件上传（复用 FileUploader 组件）
   - 发送按钮
   - 按回车发送（Shift+Enter换行）
   - 加载状态
   - 错误处理

**权限控制**（对应PRD R006）：
- 只有反馈提交人和管理员可以查看该反馈
- 未授权的用户显示"无权访问"提示
- 获取详情时后端验证权限

### 6. 附件预览组件

新建 `frontend/src/components/feedback/FeedbackAttachmentPreview.tsx`：

- 接收附件列表
- 图片附件：Grid 布局展示缩略图，点击用 Dialog 放大
- 非图片附件：文件图标 + 文件名 + 文件大小 + 下载链接
- 使用 `lucide-react` 的文件类型图标（FileImage, FileText, FileCode 等）

### 7. 时间线组件

新建 `frontend/src/components/feedback/FeedbackTimeline.tsx`：

- 垂直线性时间轴布局（类似于 Timelime/Activity Feed）
- 每个条目包含：
  - 左侧：圆形图标（不同操作类型不同颜色）
  - 右侧：操作描述 + 时间
- 操作描述文案映射：

| action_type | 文案 |
|------------|------|
| created | 提交了反馈 |
| status_changed | 状态从「旧状态」变更为「新状态」|
| replied | 回复了反馈 |
| reopened | 重新开启了反馈 |

- 状态文本映射：pending→待处理, processing→处理中, fixed→已修复, closed→已关闭, duplicate→重复反馈

### 8. 状态操作按钮

新建 `frontend/src/components/feedback/FeedbackStatusActions.tsx`：

根据当前用户角色和反馈状态，显示可用的操作按钮：

**用户视角**：
| 当前状态 | 可用操作 |
|---------|---------|
| pending/processing/fixed | 关闭反馈 |
| closed（7天内） | 重新开启 |
| fixed | 确认已修复（→ 关闭）或 未修复（→ 处理中） |
| closed（超7天） | 无操作 |

**管理员视角**（额外操作）：
| 当前状态 | 可用操作 |
|---------|---------|
| pending | 开始处理（→ 处理中）、标记重复、关闭 |
| processing | 标记已修复、关闭 |
| fixed | 关闭 |
| duplicate | 关闭 |

操作确认：对于关键操作（关闭、标记重复等），使用 AlertDialog 确认。

---

## 预期验证方式

1. 启动前后端
2. 在 Sidebar 中看到"问题反馈"导航链接
3. 点击进入反馈列表页，确认空状态显示
4. 提交一条反馈，刷新列表页，确认显示新反馈
5. 测试筛选功能（按状态、类型筛选）
6. 测试关键词搜索（按标题、编号搜索）
7. 点击反馈卡片进入详情页
8. 确认详情页展示完整信息（内容、附件、系统信息）
9. 测试回复功能（发送回复、上传附件）
10. 测试状态变更操作（关闭、重新开启）
11. 测试时间线是否正确展示所有操作记录
12. 测试未授权用户访问其他用户反馈的权限控制
13. 编译无错误

## 交付物清单

- [ ] Sidebar 添加"问题反馈"导航链接
- [ ] 状态标签组件（5种状态不同颜色）
- [ ] 类型标签组件（3种类型）
- [ ] 反馈列表页（含列表、卡片、筛选、搜索、分页）
- [ ] 反馈详情页（概要、内容、附件、系统信息）
- [ ] 时间线组件（操作记录可视化）
- [ ] 回复输入框组件（含附件上传）
- [ ] 附件预览组件（图片放大、文件下载）
- [ ] 状态操作按钮（用户和管理员不同权限）
- [ ] 空状态和加载状态处理
- [ ] 权限控制（仅提交人和管理员可查看）
- [ ] 编译无错误

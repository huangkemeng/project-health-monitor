# Plan-18: 用户问题反馈模块 — Phase 4：后台管理面板

## 目标

实现管理员后台反馈管理面板，包括统计概览、全部反馈列表、状态管理、分配处理人、批量操作等功能。

## 涉及文件清单

### 前端新建文件
- `frontend/src/app/feedback/admin/page.tsx` — 反馈管理后台主页
- `frontend/src/components/feedback/admin/FeedbackAdminStats.tsx` — 统计概览卡片组件
- `frontend/src/components/feedback/admin/FeedbackAdminTable.tsx` — 管理员反馈表格组件
- `frontend/src/components/feedback/admin/FeedbackAdminFilter.tsx` — 管理员筛选栏
- `frontend/src/components/feedback/admin/BatchActionBar.tsx` — 批量操作栏
- `frontend/src/components/feedback/admin/AssignDialog.tsx` — 分配处理人对话框
- `frontend/src/components/feedback/admin/StatusChangeDialog.tsx` — 状态变更对话框
- `frontend/src/components/feedback/admin/DuplicateDialog.tsx` — 标记重复对话框
- `frontend/src/components/feedback/admin/index.ts` — barrel export

### 后端修改文件
- 无（Phase 1 已实现后台 API 路由）

### 其他修改文件
- `frontend/src/components/layout/Sidebar.tsx` — 添加管理员后台入口（仅管理员可见）
- `frontend/src/types/index.ts` — 可能需要补充管理相关类型

## 依赖项
- Phase 1（数据库Schema与后端API）完成
- Phase 2（前端反馈提交）完成
- Phase 3（前端反馈列表与详情）完成

---

## 实现要点

### 1. 管理员路由保护

前端使用简单的管理员判断逻辑：
- 在 AuthProvider 或 auth store 中添加 `isAdmin` 字段
- 通过用户邮箱或ID判断（与后端一致）
- Admin 页面使用条件渲染或路由守卫

建议在 `frontend/src/hooks/useAuth.ts` 中添加：
```typescript
const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
```

其中 `ADMIN_EMAILS` 从环境变量 `NEXT_PUBLIC_ADMIN_EMAILS` 读取，或以逗号分隔的字符串配置。

### 2. 管理后台入口

在 `frontend/src/components/layout/Sidebar.tsx` 中，仅管理员可见的导航项：
```typescript
{ href: "/feedback/admin", label: "反馈管理", icon: MessageCircleWarning, adminOnly: true }
```

如果当前用户不是管理员，不渲染此项。

### 3. 管理后台主页

新建 `frontend/src/app/feedback/admin/page.tsx`：

**页面结构**（对应PRD 2.6.2）：

```
┌──────────────────────────────────────────────────────────────────────────┐
│  反馈管理                                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                │
│  │ 待处理 │ │ 处理中 │ │ 今日新增│ │ 本周新增│ │ 平均响应│               │
│  │   12   │ │    8   │ │    5   │ │   23   │ │  4.2h  │               │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘                │
├──────────────────────────────────────────────────────────────────────────┤
│  [筛选栏: 状态 | 类型 | 关键词搜索 | 分配人筛选]                             │
├──────────────────────────────────────────────────────────────────────────┤
│  [批量操作栏: 批量标记 | 批量关闭] (选中后显示)                              │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  ☐ │ 编号 │ 标题 │ 类型 │ 状态 │ 提交人 │ 提交时间 │ 操作 │       ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │  ☐ │ FB.. │ ...  │ Bug  │ 待处理 │ user │ 05-05  │ [处理] │      ││
│  │  ☐ │ FB.. │ ...  │ 建议  │ 处理中 │ user │ 05-04  │ [处理] │      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  [分页]                                                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4. 统计概览卡片

新建 `frontend/src/components/feedback/admin/FeedbackAdminStats.tsx`：

展示5个统计卡片（使用 shadcn/ui 的 Card 组件）：

| 统计项 | 数据来源 | 说明 |
|-------|---------|------|
| 待处理 | `GET /api/feedback/admin/stats` 返回 `pending_count` | 红色背景/边框 |
| 处理中 | `processing_count` | 黄色背景/边框 |
| 今日新增 | `today_count` | 蓝色背景/边框 |
| 本周新增 | `week_count` | 绿色背景/边框 |
| 平均响应 | `avg_response_time` | 紫色背景/边框 |

每个卡片包含：
- 标题（小字）
- 数值（大字）
- 图标
- 背景色区分

数据加载：
- 页面加载时自动获取
- 支持手动刷新（刷新按钮）

### 5. 管理员反馈表格

新建 `frontend/src/components/feedback/admin/FeedbackAdminTable.tsx`：

使用 shadcn/ui 的 Table 组件展示。

**表格列**：
| 列 | 说明 |
|---|------|
| ☐ (复选框) | 用于批量选择 |
| 编号 | 反馈编号，可点击跳转详情 |
| 标题 | 反馈标题，前30字符 + "..." |
| 类型 | 类型标签 |
| 状态 | 状态标签 |
| 提交人 | 用户名/邮箱 |
| 提交时间 | 格式化时间 |
| 操作 | 下拉菜单（开始处理、分配、标记重复、关闭） |

**交互**：
- 点击行 → 跳转到反馈详情页
- 复选框 → 选中用于批量操作
- 全选框 → 选择/取消选择全部
- 操作下拉菜单 → 根据状态显示可用操作

**操作下拉菜单**：
| 当前状态 | 可用操作 |
|---------|---------|
| pending | 开始处理、标记重复、关闭 |
| processing | 标记已修复、关闭 |
| fixed | 关闭 |
| duplicate | 查看原反馈、关闭 |
| closed | —（无操作） |

### 6. 管理员筛选栏

新建 `frontend/src/components/feedback/admin/FeedbackAdminFilter.tsx`：

- 状态下拉：全部/待处理/处理中/已修复/已关闭/重复反馈
- 类型下拉：全部/Bug/功能建议/其他
- 关键词搜索（带300ms防抖）
- 排序方式：按提交时间倒序/按更新时间倒序
- "重置筛选"按钮

### 7. 批量操作栏

新建 `frontend/src/components/feedback/admin/BatchActionBar.tsx`：

- 当选中反馈时，在表格上方显示
- 显示："已选择 N 项"
- 操作按钮：
  - "批量标记为处理中" — 将选中的 pending 反馈标记为 processing
  - "批量标记为已修复" — 将选中的 processing 反馈标记为 fixed
  - "批量关闭" — 将选中的反馈关闭
- 操作前弹出确认对话框
- 操作完成后刷新列表

### 8. 状态变更对话框

新建 `frontend/src/components/feedback/admin/StatusChangeDialog.tsx`：

- Dialog 弹窗
- 标题："变更反馈状态"
- 选择目标状态（下拉）
- 必填：变更原因（Textarea，10-200字符）
- 可选：备注信息
- 确认按钮和取消按钮

### 9. 分配处理人对话框

新建 `frontend/src/components/feedback/admin/AssignDialog.tsx`：

- Dialog 弹窗
- 标题："分配处理人"
- 用户搜索/选择器（搜索用户名或邮箱）
- 搜索使用 `GET /api/users/search?keyword=...`（可能需要新建此接口，或从前端已加载的数据中搜索）
- 显示用户列表供选择
- 确认分配按钮

### 10. 标记重复对话框

新建 `frontend/src/components/feedback/admin/DuplicateDialog.tsx`：

- Dialog 弹窗
- 标题："标记为重复反馈"
- 输入原反馈编号或标题进行搜索
- 搜索使用现有的反馈搜索接口
- 显示匹配的反馈列表供选择
- 选择后显示"将关联到：FB-XXXX-XXXX"
- 确认按钮

### 11. 分页

使用 shadcn/ui 的分页组件或自定义分页，每页20条。

---

## 预期验证方式

1. 启动前后端
2. 以管理员账户登录，确认 Sidebar 显示"反馈管理"入口
3. 以普通用户登录，确认 Sidebar 不显示"反馈管理"入口
4. 进入管理后台，确认统计概览卡片正确显示数据
5. 确认反馈列表正确展示所有用户的反馈
6. 测试筛选功能（状态、类型、关键词）
7. 测试反馈状态变更（开始处理、标记已修复、关闭）
8. 测试标记重复（搜索原反馈、关联）
9. 测试分配处理人
10. 测试批量操作（批量标记、批量关闭）
11. 测试分页功能
12. 编译无错误

## 交付物清单

- [ ] 管理员路由保护（前端 isAdmin 判断）
- [ ] Sidebar 管理员入口（条件渲染）
- [ ] 统计概览卡片组件（5个统计项）
- [ ] 管理员反馈表格组件（含操作下拉菜单）
- [ ] 管理员筛选栏
- [ ] 批量操作栏
- [ ] 状态变更对话框
- [ ] 分配处理人对话框
- [ ] 标记重复对话框
- [ ] 分页功能
- [ ] 编译无错误

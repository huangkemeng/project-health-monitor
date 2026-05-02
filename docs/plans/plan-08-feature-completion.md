# Plan-8: 功能补全计划

## 目标
补充系统遗漏的功能，包括登录失败锁定机制、API路径统一、前端历史记录页面拆分、监控项URL可达性测试提示等，确保系统功能完整符合需求文档要求。

## 涉及文件清单

### 后端修改
- `backend/src/lib/db/schema.ts` — modify (添加登录失败记录表)
- `backend/src/lib/db/migrate.ts` — modify (添加新表迁移)
- `backend/src/routes/auth.ts` — modify (添加logout API、登录失败锁定、PUT /auth/password)
- `backend/src/types/index.ts` — modify (添加LoginAttempt类型)

### 前端修改
- `frontend/src/app/history/page.tsx` — modify (拆分为checks和alerts两个标签页或独立页面)
- `frontend/src/app/history/checks/page.tsx` — new (独立的探测历史页面)
- `frontend/src/app/history/alerts/page.tsx` — new (独立的告警历史页面)
- `frontend/src/components/monitors/MonitorForm.tsx` — modify (添加URL可达性测试提示)
- `frontend/src/lib/api.ts` — modify (统一API路径，添加logout方法)

## 依赖项
- Plan-1 到 Plan-7 全部完成

## 实现要点

### 1. 登录失败锁定机制
- 创建 `login_attempts` 表记录登录失败：
  - id CHAR(36) PK
  - username VARCHAR(50) - 尝试登录的用户名
  - ip_address VARCHAR(45) - IP地址
  - attempted_at TIMESTAMP - 尝试时间
  - INDEX idx_username_time (username, attempted_at)
- 锁定规则：
  - 连续5次失败锁定15分钟
  - 检查最近15分钟内的失败次数
  - 登录成功后清除该用户的失败记录
- 错误信息保持模糊："用户名或密码错误"

### 2. API路径统一
- 添加 `POST /api/auth/logout` - 用户登出（记录登出日志）
- 添加 `PUT /api/auth/password` - 修改密码（与需求文档一致，当前是POST /auth/change-password）
- 保持向后兼容：保留现有的 `POST /auth/change-password`

### 3. 历史记录页面拆分
- 将 `/history` 拆分为两个独立页面：
  - `/history/checks` - 探测历史（支持时间范围、状态筛选、分页）
  - `/history/alerts` - 告警历史（支持级别、状态筛选、分页）
- 更新导航链接
- 保持筛选和分页功能

### 4. 监控项URL可达性测试
- 在创建监控项表单中，保存前进行URL可达性测试
- 如果测试失败，显示确认对话框："URL不可达，是否继续保存？"
- 用户可以选择"继续保存"或"返回修改"
- 测试超时设置为5秒

### 5. 响应时间趋势图表（可选增强）
- 在监控项详情页添加响应时间趋势图
- 显示最近24小时的响应时间变化
- 使用轻量级图表库（如Chart.js或Recharts）

## 预期验证方式
- `npm run dev` 启动正常
- 连续5次登录失败后，第6次显示账号已锁定
- 15分钟后可以再次尝试登录
- `/history/checks` 和 `/history/alerts` 可以正常访问
- 创建监控项时，如果URL不可达，显示确认对话框
- 所有API路径与需求文档一致
- 编译无错误

## 交付物清单
- [ ] 登录失败记录表创建
- [ ] 登录失败锁定机制实现
- [ ] POST /api/auth/logout API实现
- [ ] PUT /api/auth/password API实现
- [ ] 历史记录页面拆分为独立页面
- [ ] 监控项URL可达性测试提示
- [ ] 导航链接更新
- [ ] 编译无错误

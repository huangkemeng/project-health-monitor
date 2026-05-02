# Plan-4: 监控项管理模块

## 目标
实现监控项的CRUD管理功能，包括创建、编辑、删除、列表展示、详情查看、暂停/启用功能。这是系统的核心实体，用于配置要监控的Web服务或API。

## 涉及文件清单
- `src/app/monitors/page.tsx` — new (监控项列表页)
- `src/app/monitors/new/page.tsx` — new (新建监控项页)
- `src/app/monitors/[id]/page.tsx` — new (监控项详情页)
- `src/app/monitors/[id]/edit/page.tsx` — new (编辑监控项页)
- `src/app/api/monitors/route.ts` — new (监控项列表/创建API)
- `src/app/api/monitors/[id]/route.ts` — new (监控项详情/更新/删除API)
- `src/app/api/monitors/[id]/pause/route.ts` — new (暂停监控API)
- `src/app/api/monitors/[id]/resume/route.ts` — new (恢复监控API)
- `src/components/monitors/MonitorForm.tsx` — new (监控项表单组件)
- `src/components/monitors/MonitorList.tsx` — new (监控项列表组件)
- `src/components/monitors/MonitorCard.tsx` — new (监控项卡片组件)
- `src/components/monitors/MonitorStats.tsx` — new (监控统计组件)

## 依赖项
- Plan-1 完成：基础架构
- Plan-2 完成：用户认证
- Plan-3 完成：Webhook配置（创建监控项需要选择Webhook）

## 实现要点
- 监控项列表页路径: /monitors
- 表单字段：
  - 名称：1-50字符，必填
  - URL：必填，必须以http://或https://开头
  - HTTP方法：GET/POST/PUT/DELETE，默认GET
  - Headers：JSON格式，可选
  - Body：请求体，POST/PUT时有效
  - 探测间隔：30-300秒，默认60秒
  - 超时时间：5-60秒，默认10秒
  - 期望状态码：100-599，默认200
  - 连续失败次数：1-10，默认5（触发告警阈值）
  - 响应时间警告阈值：1000-30000ms，默认3000ms
  - 关联Webhook：选择已配置的Webhook
- 首次创建时进行URL可达性测试，如果失败提示"URL不可达，是否继续保存？"
- 状态管理（status）：active(活跃)、paused(暂停)、archived(归档)
- 健康状态（health_status）：normal(正常)、warning(警告)、critical(严重)
- 额外字段：consecutive_failures(连续失败计数)、last_check_at(最后探测时间)、last_response_time(最后响应时间)
- 数据隔离：用户只能看到自己的监控项（基于owner_id过滤）
- 列表页支持：状态筛选、健康状态筛选、关键词搜索、分页
- 详情页显示：基本信息、统计数据（24小时可用率、平均响应时间、总探测次数）、最近探测记录

## 预期验证方式
- `npm run dev` 启动正常
- 可以创建新的监控项（首次探测失败时提示确认）
- 可以编辑、删除监控项
- 可以暂停和启用监控项
- 详情页显示监控项配置信息和统计数据
- 列表页支持状态筛选和搜索
- 数据隔离正常（只能看到自己的监控项）

## 交付物清单
- [ ] 监控项列表页完成（支持筛选/搜索/分页）
- [ ] 监控项创建/编辑/详情页完成
- [ ] 监控项CRUD API完成
- [ ] 暂停/启用功能完成
- [ ] URL可达性测试完成功能
- [ ] 详情页统计显示完成
- [ ] 数据隔离正常
- [ ] 编译无错误

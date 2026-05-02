# Plan-6: 探测引擎与告警模块

## 目标
实现HTTP探测引擎（定时执行探测）、探测结果记录、告警触发判定、企业微信通知发送。这是系统的核心功能，实现故障的"分钟级发现"和"快速响应"。

## 涉及文件清单
- `src/app/api/cron/check/route.ts` — new (定时探测API，Vercel Cron)
- `src/app/api/checks/route.ts` — new (手动触发探测API)
- `src/app/api/alerts/route.ts` — new (告警列表API)
- `src/app/api/alerts/[id]/resolve/route.ts` — new (告警解决API)
- `src/lib/engine.ts` — new (探测引擎核心逻辑)
- `src/lib/alert.ts` — new (告警判定逻辑)
- `src/lib/http.ts` — new (HTTP请求工具)
- `src/lib/wechat.ts` — new (企业微信消息发送，Plan-3基础上增强)
- `src/components/history/CheckLogs.tsx` — new (探测历史组件)
- `src/components/history/AlertLogs.tsx` — new (告警历史组件)
- `src/app/history/checks/page.tsx` — new (探测历史页)
- `src/app/history/alerts/page.tsx` — new (告警历史页)
- `vercel.json` — modify (配置Cron Job)

## 依赖项
- Plan-1 完成：基础架构
- Plan-2 完成：用户认证
- Plan-3 完成：Webhook配置（告警通知需要）
- Plan-4 完成：监控项管理

## 实现要点
- 定时探测：使用Vercel Cron Job，配置每分钟执行一次
- HTTP探测逻辑：
  - 遍历所有status=active的监控项
  - 发送HTTP请求（支持GET/POST/PUT/DELETE）
  - 记录状态码、响应时间、错误信息
  - 超时处理（使用配置的timeout值）
- 探测结果记录（check_logs表）：
  - monitor_id: 关联监控项
  - status: success/failure
  - http_code: HTTP状态码
  - response_time: 响应时间(ms)
  - error_msg: 错误信息
  - checked_at: 探测时间
- 监控项状态更新：
  - 更新last_check_at、last_response_time
  - 成功：consecutive_failures重置为0
  - 失败：consecutive_failures + 1
- 告警判定逻辑：
  - 连续失败次数 >= retry_times：触发critical告警
  - 响应时间 >= warning_threshold：触发warning告警
  - 同一监控项已有firing状态告警时，不再重复触发
- 告警静默机制：
  - 告警触发后进入15分钟静默期
  - 静默期内相同问题不重复发送告警
- 恢复通知：
  - 监控项从失败状态恢复成功时
  - 将告警状态更新为resolved
  - 发送恢复通知到企业微信
- 企业微信消息格式（Markdown）：
  - 告警消息：红色标题，包含监控项名称、URL、失败原因、时间
  - 恢复消息：绿色标题，包含监控项名称、URL、恢复时间、持续时间
  - 支持@成员（根据Webhook配置的at_users）
- Vercel平台约束：
  - Cron函数执行时间≤10s（Hobby）或≤60s（Pro）
  - 需要控制单次探测的监控项数量，避免超时
  - **MySQL 8.4 性能优化**：
    - 为 check_logs 表添加索引：monitor_id, checked_at（提高查询性能）
    - 为 alerts 表添加索引：monitor_id, started_at（提高查询性能）
    - 定期归档或清理历史数据（可选，根据存储容量决定）
    - 使用连接池管理数据库连接，避免连接泄漏
- 探测历史页面：/history/checks
  - 显示探测记录列表（时间、状态、状态码、响应时间）
  - 支持按监控项筛选、按时间范围筛选
- 告警历史页面：/history/alerts
  - 显示告警记录列表（监控项、级别、状态、开始时间、结束时间）
  - 支持按级别筛选、按状态筛选

## 预期验证方式
- `npm run dev` 启动正常
- 手动触发探测API可以执行探测并记录结果
- 连续失败达到阈值时触发告警
- 告警触发时发送企业微信通知（Markdown格式）
- 服务恢复时发送恢复通知
- 告警/探测历史页面正常显示
- vercel.json中Cron配置正确

## 交付物清单
- [ ] 探测引擎核心逻辑完成
- [ ] HTTP请求工具完成（支持超时）
- [ ] 定时探测Cron配置完成
- [ ] 探测结果记录功能完成
- [ ] 告警判定逻辑完成（连续失败/响应时间）
- [ ] 告警静默机制完成
- [ ] 恢复通知功能完成
- [ ] 企业微信消息发送完成（Markdown格式）
- [ ] 告警/探测历史页面完成
- [ ] 编译无错误

# Plan-5: 监控大盘与状态展示模块

## 目标
实现监控大盘页面，作为登录后的默认首页，提供全局视图展示监控统计、监控项状态列表、最近告警信息，实现"一目了然"的可见性价值。

## 涉及文件清单
- `src/app/dashboard/page.tsx` — new (监控大盘页)
- `src/app/api/dashboard/route.ts` — new (大盘数据API)
- `src/components/dashboard/StatCards.tsx` — new (统计卡片组件)
- `src/components/dashboard/MonitorStatusList.tsx` — new (监控状态列表组件)
- `src/components/dashboard/RecentAlerts.tsx` — new (最近告警组件)
- `src/components/common/StatusBadge.tsx` — new (状态徽章组件)
- `src/lib/stats.ts` — new (统计数据计算工具)

## 依赖项
- Plan-1 完成：基础架构
- Plan-2 完成：用户认证
- Plan-4 完成：监控项管理（需要监控项数据）

## 实现要点
- 大盘页路径: /dashboard（登录后默认首页，从/重定向）
- 整体布局：Header(60px) + Main Content + Footer(40px)
- 统计卡片（4个）：
  - 总监控数：所有监控项数量
  - 正常数：health_status=normal且status=active的监控项
  - 警告数：health_status=warning的监控项
  - 严重数：health_status=critical的监控项
  - 每个卡片显示对应图标和颜色
- 最近告警区域：显示最近5条告警记录（告警级别、监控项名称、触发时间）
- 监控状态列表：显示所有活跃监控项的最新状态
  - 状态图标（🟢正常/🟡警告/🔴严重/⚪暂停）
  - 监控项名称
  - URL（截断显示）
  - 响应时间（最后一次）
  - 最后检查时间（相对时间，如"1分钟前"）
- 状态颜色规范：
  - 正常：#52c41a（绿色）
  - 警告：#faad14（黄色）
  - 严重：#f5222d（红色）
  - 暂停：#bfbfbf（灰色）
  - 信息：#1890ff（蓝色）
- 响应式布局：
  - 大屏(>=1200px)：完整布局，4列统计卡片
  - 中屏(768px-1199px)：侧边栏收起，2列统计卡片
  - 小屏(<768px)：单列布局，1列统计卡片
- 数据自动刷新：每30秒自动刷新一次数据

## 预期验证方式
- `npm run dev` 启动正常
- 登录后默认跳转到 /dashboard
- 显示正确的统计数据（总/正常/警告/严重）
- 监控项状态列表显示正常（名称、URL、响应时间、最后检查时间）
- 状态颜色显示正确（绿/黄/红/灰）
- 响应式布局在不同屏幕尺寸下正常
- 数据自动刷新功能正常

## 交付物清单
- [ ] 监控大盘页面完成
- [ ] 统计卡片组件完成（4个卡片）
- [ ] 最近告警展示完成
- [ ] 监控状态列表完成
- [ ] 状态徽章组件完成
- [ ] 响应式布局正常（大屏/中屏/小屏）
- [ ] 数据自动刷新功能
- [ ] 编译无错误

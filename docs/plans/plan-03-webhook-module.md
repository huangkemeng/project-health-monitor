# Plan-3: Webhook配置模块

## 目标
实现企业微信Webhook的CRUD管理功能，包括创建、编辑、删除、列表展示和测试功能。这是创建监控项的前置步骤，用于配置告警通知渠道。

## 涉及文件清单
- `src/app/webhooks/page.tsx` — new (Webhook列表页)
- `src/app/webhooks/new/page.tsx` — new (新建Webhook页)
- `src/app/webhooks/[id]/edit/page.tsx` — new (编辑Webhook页)
- `src/app/api/webhooks/route.ts` — new (Webhook列表/创建API)
- `src/app/api/webhooks/[id]/route.ts` — new (Webhook详情/更新/删除API)
- `src/app/api/webhooks/[id]/test/route.ts` — new (Webhook测试API)
- `src/components/webhooks/WebhookForm.tsx` — new (Webhook表单组件)
- `src/components/webhooks/WebhookList.tsx` — new (Webhook列表组件)
- `src/lib/wechat.ts` — new (企业微信消息发送工具)
- `src/app/api/webhooks/default/route.ts` — new (获取默认Webhook API)

## 依赖项
- Plan-1 完成：基础架构
- Plan-2 完成：用户认证（需要登录才能访问）

## 实现要点
- Webhook列表页路径: /webhooks
- 表单字段：
  - 名称：1-50字符，必填
  - Webhook URL：必填，格式为 `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`
  - @成员手机号：可选，多个手机号用逗号分隔
  - 设为默认：布尔值，每个用户只能有一个默认Webhook
- Webhook URL校验：必须是有效的企业微信Webhook地址格式
- 测试功能：发送测试消息到配置的Webhook，验证是否可用
- 数据隔离：用户只能看到自己的Webhook配置（基于owner_id过滤）
- 默认Webhook：创建监控项时自动选择默认Webhook
- 企业微信消息格式：Markdown格式，支持@成员

## 预期验证方式
- `npm run dev` 启动正常
- 登录后可以访问 /webhooks 页面
- 可以创建新的Webhook配置
- 可以编辑和删除Webhook
- 测试按钮可以发送测试消息（实际调用企业微信API或模拟成功）
- 只能看到自己的Webhook，数据隔离正常

## 交付物清单
- [ ] Webhook列表页完成
- [ ] Webhook创建/编辑页完成
- [ ] Webhook CRUD API完成
- [ ] Webhook测试功能完成
- [ ] 默认Webhook设置功能
- [ ] 数据隔离正常
- [ ] 编译无错误

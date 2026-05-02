# 项目健康监控系统 - 代码生成计划

> **文档版本**: v1.0  
> **最后更新**: 2026-05-02  
> **计划数量**: 7个

---

## 📋 计划概览

本代码生成计划将"项目健康监控系统"分解为7个有序的代码生成步骤，每个计划产生可独立编译、运行的代码，遵循Vercel平台约束。

| 计划 | 名称 | 核心功能 | 依赖 | 预估文件数 |
|:---:|:---|:---|:---:|:---:|
| [Plan-1](./plan-01-project-setup.md) | 项目基础架构与核心配置 | Next.js+TS+Tailwind项目搭建、数据库配置、认证基础、全局布局 | - | 12 |
| [Plan-2](./plan-02-auth-module.md) | 用户认证模块 | 注册/登录/登出页面、JWT认证、路由保护 | Plan-1 | 11 |
| [Plan-3](./plan-03-webhook-module.md) | Webhook配置模块 | 企业微信Webhook的CRUD、测试功能 | Plan-1,2 | 9 |
| [Plan-4](./plan-04-monitor-module.md) | 监控项管理模块 | 监控项CRUD、详情展示、暂停/启用 | Plan-1,2,3 | 11 |
| [Plan-5](./plan-05-dashboard-module.md) | 监控大盘与状态展示 | 统计卡片、监控状态列表、最近告警 | Plan-1,2,4 | 7 |
| [Plan-6](./plan-06-engine-alert-module.md) | 探测引擎与告警模块 | HTTP探测引擎、告警判定、企业微信通知 | Plan-1,2,3,4 | 12 |
| [Plan-7](./plan-07-final-wrapup.md) | 最终优化与部署配置 | 个人设置、错误处理、性能优化、Vercel部署 | Plan-1~6 | 12 |

---

## 🎯 功能覆盖

### V1.0 MVP 功能清单

| 功能模块 | 需求编号 | 覆盖计划 |
|:---|:---|:---:|
| **用户认证** | | |
| 用户注册 | FR-AUTH-001 | Plan-2 |
| 用户登录 | FR-AUTH-002 | Plan-2 |
| 用户登出 | FR-AUTH-003 | Plan-2 |
| 修改密码 | FR-AUTH-004 | Plan-7 |
| 查看个人信息 | FR-AUTH-005 | Plan-7 |
| **监控项管理** | | |
| 创建监控项 | FR-MON-001 | Plan-4 |
| 编辑监控项 | FR-MON-002 | Plan-4 |
| 删除监控项 | FR-MON-003 | Plan-4 |
| 查看监控项列表 | FR-MON-004 | Plan-4 |
| 查看监控项详情 | FR-MON-005 | Plan-4 |
| 暂停监控项 | FR-MON-006 | Plan-4 |
| 启用监控项 | FR-MON-007 | Plan-4 |
| **Webhook配置** | | |
| 创建Webhook | FR-WH-001 | Plan-3 |
| 编辑Webhook | FR-WH-002 | Plan-3 |
| 删除Webhook | FR-WH-003 | Plan-3 |
| 查看Webhook列表 | FR-WH-004 | Plan-3 |
| 测试Webhook | FR-WH-005 | Plan-3 |
| **执行引擎** | | |
| 定时探测执行 | FR-ENG-001 | Plan-6 |
| HTTP探测 | FR-ENG-002 | Plan-6 |
| 探测结果记录 | FR-ENG-003 | Plan-6 |
| **告警管理** | | |
| 告警触发判定 | FR-ALERT-001 | Plan-6 |
| 分级告警 | FR-ALERT-002 | Plan-6 |
| 告警静默 | FR-ALERT-003 | Plan-6 |
| 企业微信通知 | FR-ALERT-004 | Plan-6 |
| 恢复通知 | FR-ALERT-005 | Plan-6 |
| **状态展示** | | |
| 监控大盘 | FR-DASH-001 | Plan-5 |
| 监控统计卡片 | FR-DASH-002 | Plan-5 |
| 状态趋势图表 | FR-DASH-003 | Plan-4(详情页) |
| **历史记录** | | |
| 探测历史查询 | FR-HIST-001 | Plan-6 |
| 告警历史查询 | FR-HIST-002 | Plan-6 |

---

## 📁 页面清单

| 页面 | 路径 | 所属计划 | 权限 |
|:---|:---|:---:|:---:|
| 登录页 | /login | Plan-2 | 公开 |
| 注册页 | /register | Plan-2 | 公开 |
| 监控大盘 | /dashboard | Plan-5 | 需登录 |
| 监控列表 | /monitors | Plan-4 | 需登录 |
| 监控详情 | /monitors/:id | Plan-4 | 需登录 |
| 新建监控 | /monitors/new | Plan-4 | 需登录 |
| 编辑监控 | /monitors/:id/edit | Plan-4 | 需登录 |
| Webhook列表 | /webhooks | Plan-3 | 需登录 |
| 新建Webhook | /webhooks/new | Plan-3 | 需登录 |
| 编辑Webhook | /webhooks/:id/edit | Plan-3 | 需登录 |
| 探测历史 | /history/checks | Plan-6 | 需登录 |
| 告警历史 | /history/alerts | Plan-6 | 需登录 |
| 个人设置 | /settings | Plan-7 | 需登录 |

---

## 🗄️ 数据模型

### 核心实体关系

```
users 1:N monitors
users 1:N webhooks
monitors 1:N check_logs
monitors 1:N alerts
monitors N:1 webhooks
```

### 数据库表

| 表名 | 说明 | 创建计划 |
|:---|:---|:---:|
| users | 用户表 | Plan-1 |
| monitors | 监控项表 | Plan-1 |
| webhooks | Webhook配置表 | Plan-1 |
| check_logs | 探测记录表 | Plan-1 |
| alerts | 告警记录表 | Plan-1 |

---

## 🔌 API接口

### 认证接口

| 方法 | 路径 | 说明 | 计划 |
|:---:|:---|:---|:---:|
| POST | /api/auth/register | 用户注册 | Plan-2 |
| POST | /api/auth/login | 用户登录 | Plan-2 |
| POST | /api/auth/logout | 用户登出 | Plan-2 |
| GET | /api/auth/me | 获取当前用户 | Plan-2 |
| PUT | /api/auth/password | 修改密码 | Plan-7 |

### 监控项接口

| 方法 | 路径 | 说明 | 计划 |
|:---:|:---|:---|:---:|
| GET | /api/monitors | 获取监控项列表 | Plan-4 |
| POST | /api/monitors | 创建监控项 | Plan-4 |
| GET | /api/monitors/:id | 获取监控项详情 | Plan-4 |
| PUT | /api/monitors/:id | 更新监控项 | Plan-4 |
| DELETE | /api/monitors/:id | 删除监控项 | Plan-4 |
| POST | /api/monitors/:id/pause | 暂停监控项 | Plan-4 |
| POST | /api/monitors/:id/resume | 恢复监控项 | Plan-4 |

### Webhook接口

| 方法 | 路径 | 说明 | 计划 |
|:---:|:---|:---|:---:|
| GET | /api/webhooks | 获取Webhook列表 | Plan-3 |
| POST | /api/webhooks | 创建Webhook | Plan-3 |
| GET | /api/webhooks/:id | 获取Webhook详情 | Plan-3 |
| PUT | /api/webhooks/:id | 更新Webhook | Plan-3 |
| DELETE | /api/webhooks/:id | 删除Webhook | Plan-3 |
| POST | /api/webhooks/:id/test | 测试Webhook | Plan-3 |
| GET | /api/webhooks/default | 获取默认Webhook | Plan-3 |

### 大盘与历史接口

| 方法 | 路径 | 说明 | 计划 |
|:---:|:---|:---|:---:|
| GET | /api/dashboard | 获取监控大盘数据 | Plan-5 |
| GET | /api/history/checks | 获取探测历史 | Plan-6 |
| GET | /api/history/alerts | 获取告警历史 | Plan-6 |
| POST | /api/cron/check | 定时探测（Cron） | Plan-6 |
| POST | /api/checks | 手动触发探测 | Plan-6 |

---

## 🎨 设计规范

### 状态颜色

| 状态 | 颜色 | 色值 |
|:---|:---|:---|
| 正常 | 绿色 | #52c41a |
| 警告 | 黄色 | #faad14 |
| 严重 | 红色 | #f5222d |
| 暂停 | 灰色 | #bfbfbf |
| 信息 | 蓝色 | #1890ff |

### 布局规范

| 元素 | 高度 |
|:---|:---|
| Header | 60px |
| Footer | 40px |
| Main Content | 自适应 |

### 响应式断点

| 断点 | 宽度 | 布局 |
|:---|:---|:---|
| 大屏 | >= 1200px | 完整布局 |
| 中屏 | 768px - 1199px | 侧边栏收起 |
| 小屏 | < 768px | 单列布局，汉堡菜单 |

---

## ⚙️ Vercel平台约束

### 技术栈选择

| 项目 | 选择 | 说明 |
|:---|:---|:---|
| 框架 | Next.js 14+ | App Router |
| 语言 | TypeScript | 类型安全 |
| 样式 | Tailwind CSS | 原子化CSS |
| 数据库 | MySQL 8.4 | 云数据库 |
| ORM | mysql2 + 自定义SQL | 支持连接池 |
| 认证 | JWT (jose库) | Edge-compatible |
| 密码加密 | bcryptjs | 纯JavaScript |

### 限制与注意事项

1. **Serverless Functions**: Node.js Runtime（MySQL需要），执行时间≤10s（Hobby）或≤60s（Pro）
2. **数据库**: 使用云数据库 MySQL 8.4，通过 `mysql2` 库连接
3. **连接池**: 配置连接池管理，避免连接泄漏（max 10 connections）
4. **No long-running processes**: 使用Vercel Cron Jobs进行定时探测
5. **No binary dependencies**: 避免需要原生编译的npm包
6. **Cron Job**: 最小间隔1分钟，配置在vercel.json中
7. **MySQL 配置**: 字符集 utf8mb4，时区 UTC

---

## 📚 相关文档

- [项目概述](../requirements/01-overview.md)
- [用户角色](../requirements/02-user-roles.md)
- [业务流程](../requirements/03-business-flow.md)
- [功能需求](../requirements/04-functional-requirements.md)
- [数据模型](../requirements/05-data-model.md)
- [API接口](../requirements/06-api-specification.md)
- [非功能需求](../requirements/07-non-functional.md)
- [界面原型](../requirements/08-ui-prototype.md)
- [测试策略](../requirements/09-testing.md)
- [部署指南](../requirements/10-deployment.md)
- [项目计划](../requirements/11-roadmap.md)

---

## 📝 使用说明

1. **按顺序执行**: 计划必须按Plan-1到Plan-7的顺序执行，每个计划依赖前一个计划的输出
2. **独立验证**: 每个计划完成后应能独立编译和运行
3. **Mock数据**: 早期计划使用mock数据，不依赖后续功能
4. **Vercel约束**: 所有代码必须遵循Vercel平台约束

---

*本文档由 AI 代码规划专家生成，用于指导项目健康监控系统的代码生成。*

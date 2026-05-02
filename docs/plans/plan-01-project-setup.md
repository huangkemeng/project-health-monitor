# Plan-1: 项目基础架构与核心配置

## 目标
搭建 Next.js + TypeScript + Tailwind CSS 项目基础架构，配置数据库连接、认证基础、全局样式和布局，为项目健康监控系统奠定基础。实现简单、可靠、实时的监控平台基础。

## 涉及文件清单
- `package.json` — new
- `tsconfig.json` — new
- `tailwind.config.ts` — new
- `next.config.js` — new
- `.env.example` — new
- `src/app/globals.css` — new
- `src/app/layout.tsx` — new
- `src/app/page.tsx` — new (首页重定向到dashboard或login)
- `src/lib/db.ts` — new (数据库连接配置)
- `src/lib/db/schema.ts` — new (数据库表结构定义)
- `src/lib/db/migrate.ts` — new (数据库迁移脚本)
- `src/lib/auth.ts` — new (JWT认证工具)
- `src/types/index.ts` — new (核心类型定义)
- `src/components/layout/Header.tsx` — new (顶部导航组件)
- `src/components/layout/Footer.tsx` — new (底部组件)

## 依赖项
- 无前置依赖，这是第一个计划

## 实现要点
- 使用 Next.js 14+ App Router 架构
- 配置 Tailwind CSS 主题色（正常绿#52c41a、警告黄#faad14、严重红#f5222d、灰色#bfbfbf、蓝色#1890ff）
- 配置数据库连接：
  - 开发环境：MySQL 8.4（本地或远程）
  - 生产环境：云数据库 MySQL 8.4
  - 使用 `mysql2` 库进行连接（支持连接池）
- 配置 JWT 认证工具函数（生成Token、验证Token），使用 `jose` 库（Edge兼容）
- 创建基础类型定义（User、Monitor、Webhook、CheckLog、Alert等核心实体）
- 数据库表结构定义（5个核心表，MySQL 8.4）：
  - `users`: 用户表（id CHAR(36) PK, username VARCHAR(20), email VARCHAR(100), password_hash VARCHAR(255), is_active BOOLEAN, created_at TIMESTAMP, updated_at TIMESTAMP）
  - `monitors`: 监控项表（id CHAR(36) PK, owner_id CHAR(36) FK, name VARCHAR(50), url VARCHAR(500), method VARCHAR(10), headers JSON, body TEXT, interval INT, timeout INT, expected_status INT, retry_times INT, warning_threshold INT, status VARCHAR(20), health_status VARCHAR(20), consecutive_failures INT, last_check_at TIMESTAMP, last_response_time INT, webhook_id CHAR(36) FK, created_at TIMESTAMP, updated_at TIMESTAMP）
  - `webhooks`: Webhook表（id CHAR(36) PK, owner_id CHAR(36) FK, name VARCHAR(50), webhook_url VARCHAR(500), at_users VARCHAR(500), is_default BOOLEAN, created_at TIMESTAMP, updated_at TIMESTAMP）
  - `check_logs`: 探测记录表（id CHAR(36) PK, monitor_id CHAR(36) FK, status VARCHAR(20), http_code INT, response_time INT, error_msg TEXT, checked_at TIMESTAMP）
  - `alerts`: 告警记录表（id CHAR(36) PK, monitor_id CHAR(36) FK, alert_level VARCHAR(20), status VARCHAR(20), started_at TIMESTAMP, ended_at TIMESTAMP, duration INT, send_status VARCHAR(20), send_error TEXT, created_at TIMESTAMP, updated_at TIMESTAMP）
  - 所有表使用 InnoDB 引擎，utf8mb4 字符集
- 配置环境变量模板（DATABASE_URL、JWT_SECRET、NEXT_PUBLIC_APP_NAME等）
- 创建基础布局组件（Header 60px高度、Footer 40px高度）
- 响应式断点配置：
  - 大屏(>=1200px)：完整布局
  - 中屏(768px-1199px)：侧边栏收起
  - 小屏(<768px)：单列布局，汉堡菜单
- Vercel平台约束：
  - 使用 Edge-compatible 的JWT库（jose替代jsonwebtoken）
  - 使用云数据库 MySQL 8.4 进行数据持久化
  - **MySQL 8.4 配置注意事项**：
    - 使用 `mysql2` 库（支持 Promise 和连接池）
    - 配置连接池：max 10 connections，idle timeout 60000ms
    - 数据库字符集：utf8mb4（支持 emoji 和中文）
    - 时区设置：统一使用 UTC，应用层转换
    - 执行时间：Serverless Function ≤ 10s（Hobby）或 ≤ 60s（Pro）

## 预期验证方式
- `npm install` 安装依赖成功
- `npm run dev` 启动开发服务器正常
- 访问 http://localhost:3000 显示基础布局（Header + Main + Footer）
- 数据库表自动创建成功
- 无编译错误

## 交付物清单
- [ ] 所有配置文件创建完成
- [ ] 项目能正常启动
- [ ] 数据库表结构定义完成（5个表）
- [ ] 数据库连接和迁移功能正常
- [ ] 编译无错误
- [ ] 基础布局显示正常（Header 60px、Footer 40px）
- [ ] 主题色配置正确（绿/黄/红/灰/蓝）

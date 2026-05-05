# 项目健康监控系统

简单、可靠、实时的项目健康监控平台。支持HTTP服务监控、企业微信告警通知、分钟级故障发现，以及多人协作管理。

## 功能特性

### 核心监控
- **监控管理**: 创建、编辑、删除HTTP监控项，支持 GET/POST/PUT/DELETE 等多种请求方法
- **定时探测**: 每分钟自动执行健康检查，支持自定义探测间隔和超时时间
- **告警通知**: 企业微信Webhook实时告警，支持严重(critical)和警告(warning)分级
- **告警静默**: 15分钟静默期避免重复告警，服务恢复时自动发送恢复通知
- **响应时间告警**: 响应时间超过阈值时触发警告，支持自定义阈值
- **历史记录**: 探测历史和告警历史查询，支持多维度筛选

### 监控大盘
- **状态统计卡片**: 总监控数、正常/警告/严重数量概览
- **监控状态列表**: 按健康状态分组展示所有监控项
- **最近告警**: 最近告警事件实时展示
- **响应式布局**: 适配大屏/中屏/小屏设备

### 监控分组
- **分组管理**: 创建、编辑、删除监控分组
- **颜色标识**: 支持10种预设颜色用于视觉区分
- **默认分组**: 自动创建"未分组"系统分组
- **批量操作**: 支持将监控项分配到指定分组
- **分组筛选**: 按分组查看和筛选监控项

### 多人协作
- **成员邀请**: 通过邮箱邀请协作者，支持只读(viewer)和编辑(editor)两种权限
- **分组权限**: 支持全部分组、指定分组、未分组三种访问范围
- **协作者管理**: 查看、修改权限、移除协作者
- **项目切换**: 在多个项目间快速切换查看
- **项目拒绝**: "这不是我的项目"功能，拒绝不需要的协作项目

### 问题反馈
- **反馈提交**: 用户可提交问题、建议，支持附件上传
- **反馈列表**: 按状态/分类筛选，关键词搜索
- **反馈详情**: 进度追踪，管理员回复互动
- **后台管理**: 批量处理、状态流转、分配处理人
- **通知提醒**: 反馈状态变更时实时通知

### 其他功能
- **用户认证**: 注册、登录、JWT身份验证
- **个人设置**: 修改密码、查看个人信息
- **头像上传**: 支持用户头像上传（自动裁剪优化）
- **全局错误处理**: Error Boundary、友好404/错误页面
- **加载状态**: 全局loading指示器、骨架屏
- **Toast通知**: 操作成功/失败的即时反馈

## 技术栈

### 后端
- **Node.js** + **Express.js**
- **TypeScript**
- **MySQL 8.4** (数据库，使用 mysql2 连接池)
- **JWT** (认证，使用 jose 库)
- **bcryptjs** (密码加密)
- **node-cron** (定时任务)
- **express-validator** + **zod** (参数校验)
- **multer** + **sharp** (文件上传与图片处理)
- **express-rate-limit** (请求频率限制)

### 前端
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (UI组件库)
- **Zustand** (状态管理)
- **React Hook Form** + **zod** (表单处理与校验)
- **Axios** (HTTP客户端)
- **Recharts** (数据可视化)
- **Lucide React** (图标库)
- **date-fns** (日期处理)

## 快速开始

### 环境要求

- Node.js 18+
- MySQL 8.4+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd project-health-monitor
```

2. **安装依赖**
```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

3. **配置环境变量**

后端配置 (`backend/.env`):
```env
# 数据库配置 (MySQL 8.4)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=health_monitor
DB_USER=root
DB_PASSWORD=your_password
DB_POOL_SIZE=10

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3001
NODE_ENV=development

# 前端地址 (用于CORS)
FRONTEND_URL=http://localhost:3000

# Cron 任务密钥
CRON_SECRET=your-cron-secret-key

# 管理员邮箱 (逗号分隔，用于反馈管理菜单)
ADMIN_EMAILS=admin@example.com
```

前端配置 (`frontend/.env.local`):
```env
# 后端 API 地址
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# 管理员邮箱 (逗号分隔，用于反馈管理菜单)
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com
```

4. **初始化数据库**
```bash
cd backend
npm run db:migrate
```

5. **启动开发服务器**
```bash
# 启动后端 (端口 3001)
cd backend
npm run dev

# 启动前端 (端口 3000)
cd frontend
npm run dev
```

访问 http://localhost:3000 即可使用系统。

## 项目结构

```
project-health-monitor/
├── backend/                       # Express.js 后端
│   ├── src/
│   │   ├── routes/               # API 路由
│   │   │   ├── auth.ts           # 认证接口
│   │   │   ├── monitors.ts       # 监控项接口
│   │   │   ├── webhooks.ts       # Webhook 接口
│   │   │   ├── groups.ts         # 分组接口
│   │   │   ├── dashboard.ts      # 大盘数据接口
│   │   │   ├── history.ts        # 历史记录接口
│   │   │   ├── cron.ts           # 定时任务接口
│   │   │   ├── projects.ts       # 项目列表接口
│   │   │   ├── collaborators.ts  # 协作者管理接口
│   │   │   ├── feedback.ts       # 问题反馈接口
│   │   │   └── shared-projects.ts# 共享项目接口
│   │   ├── services/             # 业务逻辑层
│   │   │   ├── collaboration.ts  # 协作服务
│   │   │   ├── feedback.ts       # 反馈服务
│   │   │   └── notification.ts   # 通知服务
│   │   ├── middleware/           # 中间件
│   │   │   ├── auth.ts           # JWT 认证
│   │   │   ├── permission.ts     # 权限校验
│   │   │   ├── error-handler.ts  # 错误处理
│   │   │   └── validate.ts       # 参数校验
│   │   ├── lib/                  # 工具库
│   │   │   ├── db/               # 数据库相关
│   │   │   │   ├── schema.ts     # 表结构定义
│   │   │   │   ├── migrate.ts    # 迁移脚本
│   │   │   │   └── auto-migrate.ts # 自动迁移
│   │   │   ├── auth.ts           # JWT 工具函数
│   │   │   ├── db.ts             # 数据库连接池
│   │   │   ├── password.ts       # 密码加密
│   │   │   └── scheduler.ts      # 定时任务调度
│   │   ├── types/                # TypeScript 类型
│   │   ├── utils/                # 工具函数
│   │   │   ├── api-response.ts   # API 响应格式
│   │   │   ├── data-isolation.ts # 数据隔离工具
│   │   │   ├── errors.ts         # 错误类
│   │   │   └── validators.ts     # 校验规则
│   │   ├── __tests__/            # 测试文件
│   │   └── index.ts              # 入口文件
│   ├── .env.example
│   ├── .env.production.example
│   ├── jest.config.js
│   └── package.json
│
├── frontend/                     # Next.js 前端
│   ├── src/
│   │   ├── app/                  # 页面路由 (App Router)
│   │   │   ├── login/            # 登录页
│   │   │   ├── register/         # 注册页
│   │   │   ├── dashboard/        # 监控大盘
│   │   │   ├── monitors/         # 监控项管理
│   │   │   ├── webhooks/         # Webhook 管理
│   │   │   ├── groups/           # 分组管理
│   │   │   ├── history/          # 历史记录
│   │   │   ├── collaboration/    # 协作管理
│   │   │   ├── feedback/         # 问题反馈
│   │   │   ├── settings/         # 个人设置
│   │   │   ├── error.tsx         # 错误边界
│   │   │   ├── loading.tsx       # 加载状态
│   │   │   ├── not-found.tsx     # 404 页面
│   │   │   └── layout.tsx        # 根布局
│   │   ├── components/           # React 组件
│   │   │   ├── ui/               # shadcn/ui 基础组件
│   │   │   ├── layout/           # 布局组件 (Header, Sidebar, MainLayout)
│   │   │   ├── auth/             # 认证相关组件
│   │   │   ├── dashboard/        # 大盘组件
│   │   │   ├── collaboration/    # 协作组件 (ProjectSwitcher等)
│   │   │   ├── feedback/         # 反馈组件
│   │   │   └── common/           # 通用组件 (Skeleton, Toast等)
│   │   ├── hooks/                # 自定义 Hooks
│   │   ├── store/                # Zustand 状态管理
│   │   ├── lib/                  # 工具库 (API客户端等)
│   │   └── types/                # TypeScript 类型
│   ├── .env.example
│   ├── .env.production.example
│   └── package.json
│
├── docs/                         # 项目文档
│   ├── requirements/             # 需求文档
│   ├── plans/                    # 开发计划
│   ├── multi-user-collaboration-prd.md
│   ├── monitor-grouping-prd.md
│   ├── feedback-prd.md
│   └── system-wide-report.md
│
├── vercel.json                   # Vercel 部署配置
└── README.md
```

## API 文档

### 认证接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| POST | `/api/auth/change-password` | 修改密码 |

### 监控项接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/monitors` | 获取监控项列表 |
| POST | `/api/monitors` | 创建监控项 |
| GET | `/api/monitors/:id` | 获取监控项详情 |
| PUT | `/api/monitors/:id` | 更新监控项 |
| DELETE | `/api/monitors/:id` | 删除监控项 |
| POST | `/api/monitors/:id/pause` | 暂停监控 |
| POST | `/api/monitors/:id/resume` | 恢复监控 |

### 分组接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/groups` | 获取分组列表 |
| POST | `/api/groups` | 创建分组 |
| PUT | `/api/groups/:id` | 更新分组 |
| DELETE | `/api/groups/:id` | 删除分组 |

### Webhook 接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/webhooks` | 获取Webhook列表 |
| POST | `/api/webhooks` | 创建Webhook |
| GET | `/api/webhooks/:id` | 获取Webhook详情 |
| PUT | `/api/webhooks/:id` | 更新Webhook |
| DELETE | `/api/webhooks/:id` | 删除Webhook |
| POST | `/api/webhooks/:id/test` | 测试Webhook |

### 大盘数据接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard/stats` | 获取监控统计概览 |
| GET | `/api/dashboard/monitor-list` | 获取监控状态列表 |
| GET | `/api/dashboard/recent-alerts` | 获取最近告警 |

### 历史记录接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/history/checks` | 获取探测历史 |
| GET | `/api/history/alerts` | 获取告警历史 |

### 协作接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 获取用户可访问的项目列表 |
| GET | `/api/collaborators` | 获取协作者列表 |
| POST | `/api/collaborators/invite` | 邀请协作者 |
| PUT | `/api/collaborators/:id` | 更新协作者权限 |
| DELETE | `/api/collaborators/:id` | 移除协作者 |
| POST | `/api/shared-projects/:ownerId/reject` | 拒绝共享项目 |

### 反馈接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/feedback` | 获取反馈列表 |
| POST | `/api/feedback` | 提交反馈 |
| GET | `/api/feedback/:id` | 获取反馈详情 |
| POST | `/api/feedback/:id/reply` | 回复反馈 |
| PUT | `/api/feedback/:id/status` | 更新反馈状态 |
| PUT | `/api/feedback/:id/assign` | 分配处理人 |
| POST | `/api/feedback/batch-status` | 批量更新状态 |

### 定时任务接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/cron/check` | 执行健康检查 (Cron Job) |

## 部署到 Vercel

### 1. 准备环境变量

在 Vercel Dashboard 中配置以下环境变量:

```
# 数据库配置 (MySQL 8.4)
DB_HOST=your-mysql-host.mysql.database.azure.com
DB_PORT=3306
DB_NAME=health_monitor
DB_USER=your_username
DB_PASSWORD=your_secure_password
DB_POOL_SIZE=10

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRES_IN=7d

# Cron 任务密钥
CRON_SECRET=your-cron-secret-key-for-verification

# 服务器配置
PORT=3001
NODE_ENV=production

# 前端地址 (用于CORS)
FRONTEND_URL=https://your-domain.vercel.app

# 管理员邮箱 (逗号分隔)
ADMIN_EMAILS=admin@example.com

# 前端环境变量
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app/api
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com
```

### 2. 部署命令

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

### 3. 配置 Cron Job

项目已配置 `vercel.json` 自动设置每分钟执行健康检查:

```json
{
  "crons": [
    {
      "path": "/api/cron/check",
      "schedule": "* * * * *"
    }
  ]
}
```

## 数据库 (MySQL 8.4)

### 推荐初始化配置

```sql
CREATE DATABASE health_monitor
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'health_monitor'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON health_monitor.* TO 'health_monitor'@'%';
FLUSH PRIVILEGES;
```

### 核心数据表

| 表名 | 说明 |
|------|------|
| `users` | 用户表 |
| `monitor_groups` | 监控分组表 |
| `webhooks` | Webhook 配置表 |
| `monitors` | 监控项表 |
| `check_logs` | 探测记录表 |
| `alerts` | 告警记录表 |
| `alert_silences` | 告警静默表 |
| `cron_job_logs` | 定时任务执行日志表 |
| `login_attempts` | 登录尝试记录表 |
| `project_collaborators` | 项目协作者表 |
| `project_collaborator_groups` | 协作者分组权限表 |
| `project_rejections` | 项目拒绝记录表 |
| `feedback` | 问题反馈表 |
| `feedback_replies` | 反馈回复表 |

### 索引优化

系统已为关键查询字段配置数据库索引:
- `monitors`: owner_id, group_id, status, health_status
- `check_logs`: monitor_id, checked_at (复合索引)
- `alerts`: monitor_id, started_at, status (复合索引)
- `alert_silences`: monitor_id, expires_at (复合索引)
- `project_collaborators`: project_owner_id, collaborator_email (联合唯一索引)
- `feedback`: user_id, status, created_at

## 告警机制说明

### 触发条件

1. **严重告警 (critical)**: 连续失败次数 >= 重试次数 (retry_times)
2. **警告告警 (warning)**: 响应时间 >= 警告阈值 (warning_threshold)

### 静默机制

- 告警触发后进入15分钟静默期
- 静默期内相同问题不重复发送通知
- 静默记录存储在 `alert_silences` 表

### 恢复通知

- 服务恢复正常时自动发送恢复通知
- 包含故障持续时间
- 更新告警状态为已恢复，记录 resolved_reason

## 权限与数据隔离

系统实现了完整的数据隔离机制：

| 角色 | 权限 | 数据范围 |
|------|------|---------|
| 项目所有者 (owner) | 完全控制 | 自己创建的所有数据 |
| 编辑者 (editor) | 查看和编辑监控配置 | 被授权的分组范围 |
| 查看者 (viewer) | 只读访问 | 被授权的分组范围 |

- 所有API请求都经过 `permission` 中间件进行数据隔离校验
- 协作者只能访问被授权的分组数据
- 监控项、分组、Webhook等资源均受权限管控

## 测试

```bash
# 后端测试
cd backend
npm test            # 运行测试
npm run test:watch  # 监听模式
npm run test:coverage  # 覆盖率报告

# 前端测试
cd frontend
npm test
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

[MIT](LICENSE)

## 联系方式

如有问题或建议，欢迎提交 Issue 或 Pull Request。

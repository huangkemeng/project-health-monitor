# 项目健康监控系统

简单、可靠、实时的项目健康监控平台。支持HTTP服务监控、企业微信告警通知、分钟级故障发现。

## 功能特性

- **监控管理**: 创建、编辑、删除HTTP监控项
- **定时探测**: 每分钟自动执行健康检查
- **告警通知**: 企业微信Webhook实时告警
- **告警静默**: 15分钟静默期避免重复告警
- **分级告警**: 支持严重(critical)和警告(warning)级别
- **响应时间告警**: 响应时间超过阈值时触发警告
- **历史记录**: 探测历史和告警历史查询
- **监控大盘**: 可视化展示监控状态统计

## 技术栈

### 后端
- **Node.js** + **Express.js**
- **TypeScript**
- **MySQL 8.4** (数据库)
- **JWT** (认证)
- **bcryptjs** (密码加密)

### 前端
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Zustand** (状态管理)
- **React Hook Form** (表单处理)

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
PORT=3001
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=health_monitor
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_POOL_SIZE=10
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CRON_SECRET=your-cron-secret
```

前端配置 (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

4. **初始化数据库**
```bash
cd backend
npm run migrate
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
├── backend/                 # Express.js 后端
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── lib/            # 工具库
│   │   ├── middleware/     # 中间件
│   │   ├── types/          # TypeScript 类型
│   │   └── __tests__/      # 测试文件
│   └── package.json
│
└── frontend/               # Next.js 前端
    ├── src/
    │   ├── app/            # 页面路由
    │   ├── components/     # React 组件
    │   ├── lib/            # 工具库
    │   ├── store/          # 状态管理
    │   └── __tests__/      # 测试文件
    └── package.json
```

## API 文档

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户
- `POST /api/auth/change-password` - 修改密码

### 监控项接口
- `GET /api/monitors` - 获取监控项列表
- `POST /api/monitors` - 创建监控项
- `GET /api/monitors/:id` - 获取监控项详情
- `PUT /api/monitors/:id` - 更新监控项
- `DELETE /api/monitors/:id` - 删除监控项
- `POST /api/monitors/:id/pause` - 暂停监控
- `POST /api/monitors/:id/resume` - 恢复监控

### Webhook 接口
- `GET /api/webhooks` - 获取Webhook列表
- `POST /api/webhooks` - 创建Webhook
- `GET /api/webhooks/:id` - 获取Webhook详情
- `PUT /api/webhooks/:id` - 更新Webhook
- `DELETE /api/webhooks/:id` - 删除Webhook
- `POST /api/webhooks/:id/test` - 测试Webhook

### 历史记录接口
- `GET /api/history/checks` - 获取探测历史
- `GET /api/history/alerts` - 获取告警历史

### 定时任务接口
- `POST /api/cron/check` - 执行健康检查 (Cron Job)

## 部署到 Vercel

### 1. 准备环境变量

在 Vercel Dashboard 中配置以下环境变量:

```
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_DATABASE=health_monitor
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
MYSQL_POOL_SIZE=10
JWT_SECRET=your-jwt-secret
CRON_SECRET=your-cron-secret
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app/api
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

## 数据库配置 (MySQL 8.4)

### 推荐配置

```sql
-- 创建数据库
CREATE DATABASE health_monitor 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'health_monitor'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON health_monitor.* TO 'health_monitor'@'%';
FLUSH PRIVILEGES;
```

### 性能优化

系统已配置以下数据库索引:
- `check_logs`: monitor_id, checked_at
- `alerts`: monitor_id, started_at
- `alert_silences`: monitor_id, expires_at

## 测试

```bash
# 后端测试
cd backend
npm test

# 前端测试
cd frontend
npm test
```

## 告警机制说明

### 触发条件

1. **严重告警 (critical)**: 连续失败次数 >= 重试次数
2. **警告告警 (warning)**: 响应时间 >= 警告阈值

### 静默机制

- 告警触发后进入15分钟静默期
- 静默期内相同问题不重复发送通知
- 静默记录存储在 `alert_silences` 表

### 恢复通知

- 服务恢复正常时自动发送恢复通知
- 包含故障持续时间

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

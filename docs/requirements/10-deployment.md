# 10 - 部署与运维指南

> **文档版本**: v1.0  
> **最后更新**: 2026-05-02

---

## 10.1 部署架构

### 10.1.1 单机部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                      单机部署架构                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                  服务器 (Linux/Windows)              │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │   │
│   │  │   Web服务    │  │  监控引擎    │  │  SQLite  │  │   │
│   │  │   (Nginx)    │  │  (Python)    │  │  数据库  │  │   │
│   │  │              │  │              │  │          │  │   │
│   │  │ - 静态文件   │  │ - API服务    │  │ - 用户   │  │   │
│   │  │ - 反向代理   │  │ - 定时探测   │  │ - 配置   │  │   │
│   │  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  │   │
│   │         │                 │               │        │   │
│   │         └─────────────────┴───────────────┘        │   │
│   │                         │                          │   │
│   └─────────────────────────┼──────────────────────────┘   │
│                             │                              │
│                             ▼                              │
│                    企业微信服务器                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.1.2 推荐配置

| 环境 | CPU | 内存 | 磁盘 | 说明 |
|-----|:---:|:----:|:----:|------|
| 最小配置 | 1核 | 1GB | 10GB | 测试环境，<50监控项 |
| 推荐配置 | 2核 | 2GB | 20GB | 生产环境，<200监控项 |
| 高负载配置 | 4核 | 4GB | 50GB | 生产环境，<1000监控项 |

---

## 10.2 环境要求

### 10.2.1 软件依赖

| 软件 | 最低版本 | 推荐版本 | 说明 |
|-----|:-------:|:-------:|------|
| Python | 3.9 | 3.11 | 运行环境 |
| SQLite | 3.35 | 3.40 | 数据库 |
| Nginx | 1.20 | 1.24 | 反向代理 |
| systemd | - | - | 进程管理(Linux) |

### 10.2.2 Python依赖

```txt
fastapi==0.104.0
uvicorn[standard]==0.24.0
sqlalchemy==2.0.0
alembic==1.12.0
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
aiohttp==3.9.0
apscheduler==3.10.0
```

---

## 10.3 部署步骤

### 10.3.1 快速部署脚本

```bash
#!/bin/bash
# deploy.sh - 快速部署脚本

# 1. 克隆代码
git clone https://github.com/your-repo/project-health-monitor.git
cd project-health-monitor

# 2. 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 初始化数据库
alembic upgrade head

# 5. 创建管理员账号
python scripts/create_admin.py

# 6. 启动服务
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 10.3.2 使用Docker部署

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=sqlite:///data/monitor.db
      - SECRET_KEY=your-secret-key
    restart: unless-stopped
```

---

## 10.4 运维指南

### 10.4.1 日常检查清单

| 检查项 | 频率 | 命令/方法 |
|-------|:----:|----------|
| 服务状态 | 每日 | `systemctl status monitor` |
| 磁盘空间 | 每日 | `df -h` |
| 日志检查 | 每日 | `tail -f logs/app.log` |
| 数据库备份 | 每日 | 自动备份脚本 |
| 监控项状态 | 每周 | 检查大盘 |
| 告警测试 | 每月 | 模拟故障 |

### 10.4.2 日志管理

```
logs/
├── app.log          # 应用日志
├── error.log        # 错误日志
├── access.log       # 访问日志
└── probe.log        # 探测日志
```

日志轮转配置：
```
# logrotate配置
/var/log/monitor/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 monitor monitor
}
```

### 10.4.3 备份策略

| 数据 | 备份频率 | 保留期限 | 备份方式 |
|-----|:-------:|:-------:|---------|
| 数据库 | 每日 | 30天 | 自动备份脚本 |
| 配置文件 | 变更时 | 10份 | 版本控制 |
| 日志文件 | 每周 | 7天 | 压缩归档 |

---

## 附录A：变更记录

| 版本 | 日期 | 修改人 | 修改内容 |
|-----|------|-------|---------|
| v1.0 | 2026-05-02 | - | 初始版本 |

# 05 - 数据模型设计

> **文档版本**: v1.0  
> **最后更新**: 2026-05-02

---

## 5.1 文档概述

### 5.1.1 文档目的

本文档定义项目健康监控系统的数据模型，包括实体关系图、表结构设计、字段定义、索引设计和数据字典，为数据库设计和开发提供依据。

### 5.1.2 数据库选型

| 项目 | 选择 | 说明 |
|-----|------|------|
| 数据库类型 | SQLite / PostgreSQL | 根据部署环境选择 |
| ORM框架 | SQLAlchemy (Python) | 支持多种数据库后端 |
| 迁移工具 | Alembic | 数据库版本管理 |

---

## 5.2 实体关系图 (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           实体关系图 (ERD)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│   │    users     │         │   monitors   │         │  check_logs  │       │
│   ├──────────────┤         ├──────────────┤         ├──────────────┤       │
│   │ PK id        │◀───┐    │ PK id        │◀─────┐  │ PK id        │       │
│   │ username     │    │    │ FK owner_id  │──────┘  │ FK monitor_id│       │
│   │ email        │    │    │ name         │         │ status       │       │
│   │ password_hash│    │    │ url          │         │ http_code    │       │
│   │ created_at   │    │    │ method       │         │ response_time│       │
│   │ updated_at   │    │    │ headers      │         │ error_msg    │       │
│   └──────────────┘    │    │ body         │         │ checked_at   │       │
│        1              │    │ interval     │         └──────────────┘       │
│        │              │    │ timeout      │              N                │
│        │              │    │ expected_status                             │
│        │              │    │ retry_times  │         ┌──────────────┐       │
│        │              │    │ warning_threshold    │  │    alerts    │       │
│        │              │    │ status       │         ├──────────────┤       │
│        │              │    │ health_status│         │ PK id        │       │
│        │              │    │ consecutive_failures │  │ FK monitor_id│       │
│        │              │    │ last_check_at│         │ alert_level  │       │
│        │              │    │ last_response_time   │  │ status       │       │
│        │              │    │ webhook_id   │◀────────│ started_at   │       │
│        │              │    │ created_at   │    N    │ ended_at     │       │
│        │              │    │ updated_at   │         │ duration     │       │
│        │              │    └──────────────┘         │ send_status  │       │
│        │              │           N                 │ error_msg    │       │
│        │              │                             │ created_at   │       │
│        │              └─────────────────────────────└──────────────┘       │
│        │                          1                                         │
│        │                                                                    │
│        │         ┌──────────────┐                                           │
│        │         │   webhooks   │                                           │
│        │         ├──────────────┤                                           │
│        └────────▶│ PK id        │                                           │
│           N      │ FK owner_id  │                                           │
│                  │ name         │                                           │
│                  │ webhook_url  │                                           │
│                  │ at_users     │                                           │
│                  │ is_default   │                                           │
│                  │ created_at   │                                           │
│                  │ updated_at   │                                           │
│                  └──────────────┘                                           │
│                                                                              │
│   关系说明:                                                                  │
│   - users 1:N monitors: 一个用户可以创建多个监控项                           │
│   - users 1:N webhooks: 一个用户可以配置多个Webhook                          │
│   - monitors 1:N check_logs: 一个监控项有多条探测记录                        │
│   - monitors 1:N alerts: 一个监控项可能触发多次告警                          │
│   - monitors N:1 webhooks: 多个监控项可以共用同一个Webhook                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5.3 表结构设计

### 5.3.1 users 表

用户账号信息表。

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_users_username UNIQUE (username),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT chk_username_format CHECK (username ~ '^[a-zA-Z][a-zA-Z0-9_]{2,19}$')
);

-- 索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

**字段说明：**

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|------|
| id | UUID | PK | 用户唯一标识 |
| username | VARCHAR(20) | UK, NOT NULL | 用户名，字母开头，3-20字符 |
| email | VARCHAR(100) | UK, NOT NULL | 邮箱地址 |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt加密后的密码 |
| is_active | BOOLEAN | DEFAULT TRUE | 账号是否激活 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

---

### 5.3.2 monitors 表

监控项配置表。

```sql
CREATE TABLE monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    url VARCHAR(500) NOT NULL,
    method VARCHAR(10) DEFAULT 'GET',
    headers JSONB DEFAULT '{}',
    body TEXT,
    interval INTEGER DEFAULT 60,
    timeout INTEGER DEFAULT 10,
    expected_status INTEGER DEFAULT 200,
    retry_times INTEGER DEFAULT 5,
    warning_threshold INTEGER DEFAULT 3000,
    status VARCHAR(20) DEFAULT 'active',
    health_status VARCHAR(20) DEFAULT 'normal',
    consecutive_failures INTEGER DEFAULT 0,
    last_check_at TIMESTAMP WITH TIME ZONE,
    last_response_time INTEGER,
    webhook_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_monitors_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_monitors_webhook FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE SET NULL,
    CONSTRAINT chk_interval CHECK (interval BETWEEN 30 AND 300),
    CONSTRAINT chk_timeout CHECK (timeout BETWEEN 5 AND 60),
    CONSTRAINT chk_retry_times CHECK (retry_times BETWEEN 1 AND 10),
    CONSTRAINT chk_status CHECK (status IN ('active', 'paused', 'archived')),
    CONSTRAINT chk_health_status CHECK (health_status IN ('normal', 'warning', 'critical'))
);

-- 索引
CREATE INDEX idx_monitors_owner ON monitors(owner_id);
CREATE INDEX idx_monitors_status ON monitors(status);
CREATE INDEX idx_monitors_health ON monitors(health_status);
CREATE INDEX idx_monitors_owner_status ON monitors(owner_id, status);
```

**字段说明：**

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|-------|------|------|:------:|------|
| id | UUID | PK | gen_random_uuid() | 监控项唯一标识 |
| owner_id | UUID | FK, NOT NULL | - | 所属用户ID |
| name | VARCHAR(50) | NOT NULL | - | 监控项名称 |
| url | VARCHAR(500) | NOT NULL | - | 监控目标URL |
| method | VARCHAR(10) | - | GET | HTTP方法 |
| headers | JSONB | - | {} | 请求头(JSON格式) |
| body | TEXT | - | NULL | 请求体 |
| interval | INTEGER | CHECK | 60 | 探测间隔(秒) |
| timeout | INTEGER | CHECK | 10 | 超时时间(秒) |
| expected_status | INTEGER | - | 200 | 期望状态码 |
| retry_times | INTEGER | CHECK | 5 | 触发告警的连续失败次数 |
| warning_threshold | INTEGER | - | 3000 | 响应时间警告阈值(ms) |
| status | VARCHAR(20) | CHECK | active | 监控项状态 |
| health_status | VARCHAR(20) | CHECK | normal | 健康状态 |
| consecutive_failures | INTEGER | - | 0 | 连续失败计数 |
| last_check_at | TIMESTAMP | - | NULL | 最后探测时间 |
| last_response_time | INTEGER | - | NULL | 最后响应时间(ms) |
| webhook_id | UUID | FK | NULL | 关联Webhook |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 更新时间 |

---

### 5.3.3 webhooks 表

企业微信Webhook配置表。

```sql
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    webhook_url VARCHAR(500) NOT NULL,
    at_users VARCHAR(500),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_webhooks_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_webhooks_owner ON webhooks(owner_id);
CREATE INDEX idx_webhooks_owner_default ON webhooks(owner_id, is_default);
```

**字段说明：**

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|-------|------|------|:------:|------|
| id | UUID | PK | gen_random_uuid() | Webhook唯一标识 |
| owner_id | UUID | FK, NOT NULL | - | 所属用户ID |
| name | VARCHAR(50) | NOT NULL | - | Webhook名称 |
| webhook_url | VARCHAR(500) | NOT NULL | - | 企业微信Webhook地址 |
| at_users | VARCHAR(500) | - | NULL | @成员手机号，逗号分隔 |
| is_default | BOOLEAN | - | FALSE | 是否为默认Webhook |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 更新时间 |

---

### 5.3.4 check_logs 表

探测记录表。

```sql
CREATE TABLE check_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    http_code INTEGER,
    response_time INTEGER,
    error_msg TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_check_logs_monitor FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
    CONSTRAINT chk_check_status CHECK (status IN ('success', 'failure'))
);

-- 索引
CREATE INDEX idx_check_logs_monitor ON check_logs(monitor_id);
CREATE INDEX idx_check_logs_checked_at ON check_logs(checked_at);
CREATE INDEX idx_check_logs_monitor_time ON check_logs(monitor_id, checked_at);

-- 分区（PostgreSQL）或定期清理
-- 保留30天数据
```

**字段说明：**

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|-------|------|------|:------:|------|
| id | UUID | PK | gen_random_uuid() | 记录唯一标识 |
| monitor_id | UUID | FK, NOT NULL | - | 关联监控项ID |
| status | VARCHAR(20) | CHECK, NOT NULL | - | 探测结果状态 |
| http_code | INTEGER | - | NULL | HTTP状态码 |
| response_time | INTEGER | - | NULL | 响应时间(ms) |
| error_msg | TEXT | - | NULL | 错误信息 |
| checked_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 探测时间 |

---

### 5.3.5 alerts 表

告警记录表。

```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_id UUID NOT NULL,
    alert_level VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'firing',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    send_status VARCHAR(20) DEFAULT 'pending',
    send_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_alerts_monitor FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
    CONSTRAINT chk_alert_level CHECK (alert_level IN ('warning', 'critical')),
    CONSTRAINT chk_alert_status CHECK (status IN ('firing', 'resolved')),
    CONSTRAINT chk_send_status CHECK (send_status IN ('pending', 'sent', 'failed'))
);

-- 索引
CREATE INDEX idx_alerts_monitor ON alerts(monitor_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_started_at ON alerts(started_at);
CREATE INDEX idx_alerts_monitor_started ON alerts(monitor_id, started_at);
```

**字段说明：**

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|-------|------|------|:------:|------|
| id | UUID | PK | gen_random_uuid() | 告警唯一标识 |
| monitor_id | UUID | FK, NOT NULL | - | 关联监控项ID |
| alert_level | VARCHAR(20) | CHECK, NOT NULL | - | 告警级别 |
| status | VARCHAR(20) | CHECK | firing | 告警状态 |
| started_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 告警开始时间 |
| ended_at | TIMESTAMP | - | NULL | 告警结束时间 |
| duration | INTEGER | - | NULL | 持续时间(秒) |
| send_status | VARCHAR(20) | CHECK | pending | 发送状态 |
| send_error | TEXT | - | NULL | 发送失败原因 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 更新时间 |

---

## 5.4 索引设计

### 5.4.1 索引清单

| 表名 | 索引名 | 字段 | 类型 | 说明 |
|-----|-------|------|------|------|
| users | idx_users_username | username | B-tree | 登录查询 |
| users | idx_users_email | email | B-tree | 邮箱查询 |
| monitors | idx_monitors_owner | owner_id | B-tree | 用户监控项查询 |
| monitors | idx_monitors_status | status | B-tree | 状态筛选 |
| monitors | idx_monitors_health | health_status | B-tree | 健康状态筛选 |
| monitors | idx_monitors_owner_status | owner_id, status | B-tree | 组合查询 |
| webhooks | idx_webhooks_owner | owner_id | B-tree | 用户Webhook查询 |
| webhooks | idx_webhooks_owner_default | owner_id, is_default | B-tree | 默认Webhook查询 |
| check_logs | idx_check_logs_monitor | monitor_id | B-tree | 监控项历史查询 |
| check_logs | idx_check_logs_checked_at | checked_at | B-tree | 时间范围查询 |
| check_logs | idx_check_logs_monitor_time | monitor_id, checked_at | B-tree | 组合查询 |
| alerts | idx_alerts_monitor | monitor_id | B-tree | 监控项告警查询 |
| alerts | idx_alerts_status | status | B-tree | 状态筛选 |
| alerts | idx_alerts_started_at | started_at | B-tree | 时间范围查询 |
| alerts | idx_alerts_monitor_started | monitor_id, started_at | B-tree | 组合查询 |

---

## 5.5 数据字典

### 5.5.1 枚举值定义

**monitor.status:**
| 值 | 说明 |
|---|------|
| active | 活跃状态，正常监控中 |
| paused | 暂停状态，不执行探测 |
| archived | 归档状态，已删除 |

**monitor.health_status:**
| 值 | 说明 |
|---|------|
| normal | 正常，服务可用 |
| warning | 警告，连续失败但响应时间正常 |
| critical | 严重，连续失败且响应超时或5xx错误 |

**monitor.method:**
| 值 | 说明 |
|---|------|
| GET | GET请求 |
| POST | POST请求 |
| PUT | PUT请求 |
| DELETE | DELETE请求 |

**check_logs.status:**
| 值 | 说明 |
|---|------|
| success | 探测成功 |
| failure | 探测失败 |

**alerts.alert_level:**
| 值 | 说明 |
|---|------|
| warning | 警告级别 |
| critical | 严重级别 |

**alerts.status:**
| 值 | 说明 |
|---|------|
| firing | 告警中 |
| resolved | 已恢复 |

**alerts.send_status:**
| 值 | 说明 |
|---|------|
| pending | 待发送 |
| sent | 发送成功 |
| failed | 发送失败 |

---

## 5.6 数据清理策略

### 5.6.1 自动清理规则

| 数据表 | 保留期限 | 清理方式 |
|-------|---------|---------|
| check_logs | 30天 | 定时任务删除 |
| alerts | 90天 | 定时任务删除 |
| monitors (archived) | 90天 | 定时任务物理删除 |
| webhooks (archived) | 90天 | 定时任务物理删除 |

### 5.6.2 清理脚本示例

```sql
-- 清理30天前的探测记录
DELETE FROM check_logs 
WHERE checked_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

-- 清理90天前的告警记录
DELETE FROM alerts 
WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';

-- 清理已归档90天的监控项及其关联数据
DELETE FROM monitors 
WHERE status = 'archived' 
AND updated_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
```

---

## 附录A：变更记录

| 版本 | 日期 | 修改人 | 修改内容 |
|-----|------|-------|---------|
| v1.0 | 2026-05-02 | - | 初始版本，定义完整数据模型 |

---

*本文档定义了系统数据模型，API接口定义请参见 [06-api-specification.md](./06-api-specification.md)*

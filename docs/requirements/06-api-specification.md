# 06 - API接口定义

> **文档版本**: v1.0  
> **最后更新**: 2026-05-02

---

## 6.1 文档概述

### 6.1.1 文档目的

本文档定义项目健康监控系统的RESTful API接口规范，包括接口列表、请求/响应格式、错误码定义和认证方式，为前后端开发和接口联调提供依据。

### 6.1.2 接口规范

| 项目 | 规范 |
|-----|------|
| 协议 | HTTPS |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 认证方式 | JWT Bearer Token |
| API版本 | v1 |
| 基础路径 | /api/v1 |

---

## 6.2 认证方式

### 6.2.1 JWT认证

所有需要认证的接口必须在请求头中携带Token：

```
Authorization: Bearer <access_token>
```

### 6.2.2 认证错误响应

| 状态码 | 错误码 | 说明 |
|:------:|:------:|------|
| 401 | AUTH_001 | 未提供Token |
| 401 | AUTH_002 | Token无效或过期 |
| 403 | AUTH_003 | 无权访问该资源 |

---

## 6.3 通用响应格式

### 6.3.1 成功响应

```json
{
  "code": 200,
  "message": "success",
  "data": { }
}
```

### 6.3.2 错误响应

```json
{
  "code": 400,
  "message": "请求参数错误",
  "errors": [
    {
      "field": "url",
      "message": "请输入有效的URL地址"
    }
  ]
}
```

### 6.3.3 分页响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

---

## 6.4 接口清单

### 6.4.1 认证接口

| 方法 | 路径 | 描述 | 认证 |
|:----:|------|------|:----:|
| POST | /auth/register | 用户注册 | ❌ |
| POST | /auth/login | 用户登录 | ❌ |
| POST | /auth/logout | 用户登出 | ✅ |
| GET | /auth/me | 获取当前用户信息 | ✅ |
| PUT | /auth/password | 修改密码 | ✅ |

### 6.4.2 监控项接口

| 方法 | 路径 | 描述 | 认证 |
|:----:|------|------|:----:|
| GET | /monitors | 获取监控项列表 | ✅ |
| POST | /monitors | 创建监控项 | ✅ |
| GET | /monitors/:id | 获取监控项详情 | ✅ |
| PUT | /monitors/:id | 更新监控项 | ✅ |
| DELETE | /monitors/:id | 删除监控项 | ✅ |
| POST | /monitors/:id/pause | 暂停监控项 | ✅ |
| POST | /monitors/:id/resume | 恢复监控项 | ✅ |

### 6.4.3 Webhook接口

| 方法 | 路径 | 描述 | 认证 |
|:----:|------|------|:----:|
| GET | /webhooks | 获取Webhook列表 | ✅ |
| POST | /webhooks | 创建Webhook | ✅ |
| GET | /webhooks/:id | 获取Webhook详情 | ✅ |
| PUT | /webhooks/:id | 更新Webhook | ✅ |
| DELETE | /webhooks/:id | 删除Webhook | ✅ |
| POST | /webhooks/:id/test | 测试Webhook | ✅ |

### 6.4.4 大盘与历史接口

| 方法 | 路径 | 描述 | 认证 |
|:----:|------|------|:----:|
| GET | /dashboard | 获取监控大盘数据 | ✅ |
| GET | /history/checks | 获取探测历史 | ✅ |
| GET | /history/alerts | 获取告警历史 | ✅ |

---

## 6.5 接口详情

### 6.5.1 认证接口

#### POST /auth/register

用户注册

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|-----|------|:----:|------|
| username | string | 是 | 用户名，3-20字符，字母开头 |
| email | string | 是 | 邮箱地址 |
| password | string | 是 | 密码，8-32字符，必须包含字母和数字 |
| confirm_password | string | 是 | 确认密码 |

**请求示例：**
```json
{
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "password": "Password123",
  "confirm_password": "Password123"
}
```

**响应示例（成功）：**
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "created_at": "2026-05-02T10:00:00Z"
  }
}
```

**响应示例（失败）：**
```json
{
  "code": 400,
  "message": "请求参数错误",
  "errors": [
    {
      "field": "username",
      "message": "用户名已被使用"
    }
  ]
}
```

---

#### POST /auth/login

用户登录

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|-----|------|:----:|------|
| username | string | 是 | 用户名或邮箱 |
| password | string | 是 | 密码 |
| remember_me | boolean | 否 | 记住登录状态 |

**请求示例：**
```json
{
  "username": "zhangsan",
  "password": "Password123",
  "remember_me": true
}
```

**响应示例（成功）：**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 604800,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "zhangsan",
      "email": "zhangsan@example.com"
    }
  }
}
```

**响应示例（失败）：**
```json
{
  "code": 401,
  "message": "用户名或密码错误"
}
```

---

#### GET /auth/me

获取当前用户信息

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "created_at": "2026-05-02T10:00:00Z"
  }
}
```

---

### 6.5.2 监控项接口

#### GET /monitors

获取监控项列表

**查询参数：**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|:----:|:------:|------|
| page | integer | 否 | 1 | 页码 |
| page_size | integer | 否 | 20 | 每页数量 |
| status | string | 否 | - | 状态筛选：active/paused/archived |
| health_status | string | 否 | - | 健康状态筛选：normal/warning/critical |
| keyword | string | 否 | - | 名称搜索关键词 |

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "用户服务API",
        "url": "https://api.example.com/health",
        "status": "active",
        "health_status": "normal",
        "last_check_at": "2026-05-02T14:30:00Z",
        "last_response_time": 150,
        "success_rate": 99.5
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

---

#### POST /monitors

创建监控项

**请求参数：**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|:----:|:------:|------|
| name | string | 是 | - | 监控项名称 |
| url | string | 是 | - | 监控URL |
| method | string | 否 | GET | HTTP方法 |
| headers | object | 否 | {} | 请求头 |
| body | string | 否 | - | 请求体 |
| interval | integer | 否 | 60 | 探测间隔(秒) |
| timeout | integer | 否 | 10 | 超时时间(秒) |
| expected_status | integer | 否 | 200 | 期望状态码 |
| retry_times | integer | 否 | 5 | 连续失败次数 |
| warning_threshold | integer | 否 | 3000 | 响应时间阈值(ms) |
| webhook_id | string | 否 | - | Webhook ID |

**请求示例：**
```json
{
  "name": "用户服务API",
  "url": "https://api.example.com/health",
  "method": "GET",
  "interval": 60,
  "timeout": 10,
  "expected_status": 200,
  "retry_times": 5,
  "warning_threshold": 3000,
  "webhook_id": "770e8400-e29b-41d4-a716-446655440002"
}
```

**响应示例：**
```json
{
  "code": 201,
  "message": "创建成功",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "用户服务API",
    "url": "https://api.example.com/health",
    "status": "active",
    "health_status": "normal",
    "created_at": "2026-05-02T14:30:00Z"
  }
}
```

---

#### GET /monitors/:id

获取监控项详情

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "用户服务API",
    "url": "https://api.example.com/health",
    "method": "GET",
    "headers": {},
    "interval": 60,
    "timeout": 10,
    "expected_status": 200,
    "retry_times": 5,
    "warning_threshold": 3000,
    "status": "active",
    "health_status": "normal",
    "consecutive_failures": 0,
    "last_check_at": "2026-05-02T14:30:00Z",
    "last_response_time": 150,
    "webhook": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "后端告警群"
    },
    "stats": {
      "total_checks": 1440,
      "success_checks": 1435,
      "failed_checks": 5,
      "success_rate": 99.65,
      "avg_response_time": 145
    },
    "created_at": "2026-05-02T10:00:00Z",
    "updated_at": "2026-05-02T14:30:00Z"
  }
}
```

---

#### PUT /monitors/:id

更新监控项

**请求参数：** 同创建监控项

**响应示例：** 同获取详情

---

#### DELETE /monitors/:id

删除监控项

**响应示例：**
```json
{
  "code": 200,
  "message": "删除成功"
}
```

---

#### POST /monitors/:id/pause

暂停监控项

**响应示例：**
```json
{
  "code": 200,
  "message": "已暂停",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "paused"
  }
}
```

---

#### POST /monitors/:id/resume

恢复监控项

**响应示例：**
```json
{
  "code": 200,
  "message": "已恢复",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "active"
  }
}
```

---

### 6.5.3 Webhook接口

#### GET /webhooks

获取Webhook列表

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "name": "后端告警群",
        "webhook_url": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx",
        "at_users": "13800138000,13800138001",
        "is_default": true,
        "created_at": "2026-05-02T10:00:00Z"
      }
    ]
  }
}
```

---

#### POST /webhooks

创建Webhook

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|-----|------|:----:|------|
| name | string | 是 | Webhook名称 |
| webhook_url | string | 是 | Webhook地址 |
| at_users | string | 否 | @成员手机号，逗号分隔 |
| is_default | boolean | 否 | 是否设为默认 |

**请求示例：**
```json
{
  "name": "后端告警群",
  "webhook_url": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx",
  "at_users": "13800138000",
  "is_default": true
}
```

---

#### POST /webhooks/:id/test

测试Webhook

**响应示例（成功）：**
```json
{
  "code": 200,
  "message": "测试消息发送成功"
}
```

**响应示例（失败）：**
```json
{
  "code": 400,
  "message": "Webhook测试失败",
  "data": {
    "error": "invalid webhook url"
  }
}
```

---

### 6.5.4 大盘与历史接口

#### GET /dashboard

获取监控大盘数据

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "summary": {
      "total": 10,
      "normal": 8,
      "warning": 1,
      "critical": 0,
      "paused": 1
    },
    "recent_alerts": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "monitor_name": "订单服务API",
        "alert_level": "warning",
        "started_at": "2026-05-02T14:00:00Z"
      }
    ],
    "items": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "用户服务API",
        "url": "https://api.example.com/health",
        "health_status": "normal",
        "last_check_at": "2026-05-02T14:30:00Z",
        "last_response_time": 150
      }
    ]
  }
}
```

---

#### GET /history/checks

获取探测历史

**查询参数：**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|:----:|:------:|------|
| monitor_id | string | 否 | - | 监控项ID筛选 |
| status | string | 否 | - | 状态筛选：success/failure |
| start_time | string | 否 | - | 开始时间，ISO 8601格式 |
| end_time | string | 否 | - | 结束时间，ISO 8601格式 |
| page | integer | 否 | 1 | 页码 |
| page_size | integer | 否 | 50 | 每页数量 |

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440004",
        "monitor_id": "660e8400-e29b-41d4-a716-446655440001",
        "status": "success",
        "http_code": 200,
        "response_time": 150,
        "checked_at": "2026-05-02T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 50,
      "total": 1440,
      "total_pages": 29
    }
  }
}
```

---

#### GET /history/alerts

获取告警历史

**查询参数：**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|:----:|:------:|------|
| monitor_id | string | 否 | - | 监控项ID筛选 |
| status | string | 否 | - | 状态筛选：firing/resolved |
| start_time | string | 否 | - | 开始时间 |
| end_time | string | 否 | - | 结束时间 |
| page | integer | 否 | 1 | 页码 |
| page_size | integer | 否 | 20 | 每页数量 |

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "monitor_id": "660e8400-e29b-41d4-a716-446655440001",
        "monitor_name": "用户服务API",
        "alert_level": "warning",
        "status": "resolved",
        "started_at": "2026-05-02T13:00:00Z",
        "ended_at": "2026-05-02T13:15:00Z",
        "duration": 900,
        "send_status": "sent"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 10,
      "total_pages": 1
    }
  }
}
```

---

## 6.6 错误码定义

### 6.6.1 通用错误码

| 错误码 | HTTP状态码 | 说明 |
|:------:|:----------:|------|
| SUCCESS | 200 | 成功 |
| CREATED | 201 | 创建成功 |
| BAD_REQUEST | 400 | 请求参数错误 |
| UNAUTHORIZED | 401 | 未认证 |
| FORBIDDEN | 403 | 无权访问 |
| NOT_FOUND | 404 | 资源不存在 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

### 6.6.2 业务错误码

| 错误码 | HTTP状态码 | 说明 |
|:------:|:----------:|------|
| AUTH_001 | 401 | Token未提供 |
| AUTH_002 | 401 | Token无效或过期 |
| AUTH_003 | 401 | 用户名或密码错误 |
| AUTH_004 | 400 | 用户名已被使用 |
| AUTH_005 | 400 | 邮箱已被注册 |
| MONITOR_001 | 404 | 监控项不存在 |
| MONITOR_002 | 403 | 无权访问该监控项 |
| MONITOR_003 | 400 | URL格式无效 |
| MONITOR_004 | 400 | 监控项名称已存在 |
| WEBHOOK_001 | 404 | Webhook不存在 |
| WEBHOOK_002 | 400 | Webhook URL无效 |
| WEBHOOK_003 | 400 | Webhook测试失败 |

---

## 附录A：变更记录

| 版本 | 日期 | 修改人 | 修改内容 |
|-----|------|-------|---------|
| v1.0 | 2026-05-02 | - | 初始版本，定义完整API规范 |

---

*本文档定义了系统API接口，非功能需求请参见 [07-non-functional.md](./07-non-functional.md)*

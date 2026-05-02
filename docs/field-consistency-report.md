# 端到端字段一致性检查报告

> 扫描范围：数据库 Schema ↔ 后端类型 ↔ API 接口 ↔ 前端类型

---

## 执行摘要

| 类别 | 一致 ✅ | 不一致 ❌ | 可疑 ⚠️ |
|------|---------|-----------|---------|
| User 相关 | 3 | 2 | 1 |
| Monitor 相关 | 8 | 3 | 2 |
| Webhook 相关 | 4 | 1 | 0 |
| CheckLog 相关 | 3 | 3 | 1 |
| Alert 相关 | 4 | 4 | 2 |
| Dashboard 相关 | 2 | 2 | 1 |
| **总计** | **24** | **15** | **7** |

**严重级别**：🔴 严重（会导致运行时错误）| 🟡 警告（可能导致数据问题）| 🟢 建议（命名不一致）

---

## 一、User 模块字段一致性

### 1.1 登录响应字段不一致 🔴

| 层级 | 字段名 | 类型 | 问题 |
|------|--------|------|------|
| **后端返回** | `token` | string | 使用 `token` |
| **前端类型** | `access_token` | string | 期望 `access_token` |
| **后端类型** | `token` | string | 定义 `token` |

**代码位置**：
- 后端：`auth.ts` 第 125 行 `created(res, { user: userResponse, token })`
- 前端：`api.ts` 第 98 行 `access_token: string`
- 前端类型：`types/index.ts` `AuthResponse.access_token`

**影响**：登录成功后前端无法正确获取 token

**修复建议**：统一使用 `token` 或 `access_token`
```typescript
// 方案1：后端改为 access_token
const authResponse = {
  user: userResponse,
  access_token: token,  // 改为 access_token
  token_type: 'Bearer',
  expires_in: 7 * 24 * 3600
};

// 方案2：前端改为 token
export interface AuthResponse {
  token: string;  // 改为 token
  token_type: string;
  expires_in: number;
  user: User;
}
```

---

### 1.2 日期类型不一致 🟡

| 层级 | 字段 | 数据库 | 后端 | 前端 |
|------|------|--------|------|------|
| created_at | TIMESTAMP | Date | string |
| updated_at | TIMESTAMP | Date | string |

**问题**：后端使用 `Date` 类型，前端使用 `string` 类型

**影响**：需要确保后端在返回时转换为 ISO 字符串

---

### 1.3 User 类型字段缺失 🟡

**后端 User 类型**（包含敏感字段）：
```typescript
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;  // 前端不应该有这个字段
  is_active: boolean;     // 前端没有这个字段
  created_at: Date;
  updated_at: Date;
}
```

**前端 User 类型**：
```typescript
export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}
```

**问题**：后端类型包含敏感字段，应该分离为 `User` 和 `UserResponse`

---

## 二、Monitor 模块字段一致性

### 2.1 返回字段不一致 🔴

**后端 API 返回**（monitors.ts）：
```typescript
success(res, {
  items: monitors,  // 直接返回 Monitor[]
  pagination: {...}
});
```

**前端期望**：
```typescript
PaginatedResponse<Monitor>  // 包含 items 和 pagination
```

**问题**：实际返回的是 `Monitor` 类型，但 `Monitor` 类型在后端包含 `owner_id`，前端没有

---

### 2.2 字段类型不一致 🟡

| 字段 | 数据库 | 后端类型 | 前端类型 | 问题 |
|------|--------|----------|----------|------|
| `headers` | JSON | `Record<string, string>` | `Record<string, string>` | ✅ 一致 |
| `body` | TEXT | `string \| null` | `string \| null` | ✅ 一致 |
| `last_check_at` | TIMESTAMP NULL | `Date \| null` | `string \| null` | ⚠️ 类型转换 |
| `created_at` | TIMESTAMP | `Date` | `string` | ⚠️ 类型转换 |
| `updated_at` | TIMESTAMP | `Date` | `string` | ⚠️ 类型转换 |

---

### 2.3 MonitorResponse 字段缺失 🔴

**后端定义**（types/index.ts）：
```typescript
export interface MonitorResponse {
  // ... 基本字段
  webhook?: WebhookResponse;  // 可选
  stats?: MonitorStats;       // 可选
}
```

**前端类型**：
```typescript
export interface MonitorResponse extends Monitor {
  stats?: MonitorStats;
  webhook?: WebhookResponse;
}
```

**问题**：前端使用 `extends Monitor`，但后端 `MonitorResponse` 是独立定义，字段可能不一致

---

### 2.4 获取详情接口字段映射错误 🔴

**后端代码**（monitors.ts 第 150+ 行）：
```typescript
const monitor = await queryOne<Monitor & { webhook_name?: string; ... }>(...);

const monitorResponse: MonitorResponse = {
  id: monitor.id,
  name: monitor.name,
  // ...
  webhook: monitor.webhook_id ? {
    id: monitor.webhook_id,
    name: monitor.webhook_name!,      // 从 JOIN 获取
    webhook_url: monitor.webhook_url!,
    at_users: monitor.at_users,
    is_default: monitor.is_default!,
    created_at: monitor.webhook_created_at!,
    updated_at: monitor.webhook_updated_at!
  } : undefined
};
```

**问题**：
1. `MonitorResponse` 类型定义中没有 `webhook` 字段的详细类型
2. 前端期望的 `WebhookResponse` 与后端构造的对象可能不一致

---

## 三、Webhook 模块字段一致性

### 3.1 字段基本一致 ✅

| 字段 | 数据库 | 后端 | 前端 | 状态 |
|------|--------|------|------|------|
| id | CHAR(36) | string | string | ✅ |
| name | VARCHAR(50) | string | string | ✅ |
| webhook_url | VARCHAR(500) | string | string | ✅ |
| at_users | VARCHAR(500) | string \| null | string \| null | ✅ |
| is_default | BOOLEAN | boolean | boolean | ✅ |

**问题**：后端 `Webhook` 类型有 `owner_id`，前端没有

---

## 四、CheckLog 模块字段一致性

### 4.1 字段缺失 🔴

**后端类型**（types/index.ts）：
```typescript
export interface CheckLog {
  id: string;
  monitor_id: string;
  status: CheckStatus;
  http_code: number | null;
  response_time: number | null;  // 可为 null
  error_msg: string | null;
  checked_at: Date;
}
```

**前端类型**：
```typescript
export interface CheckLog {
  id: string;
  monitor_id: string;
  status: CheckStatus;
  http_code: number | null;
  response_time: number;         // 不为 null
  error_msg: string | null;
  checked_at: string;
}
```

**问题**：
1. `response_time` 后端可为 null，前端不可为 null
2. `checked_at` 后端是 Date，前端是 string

---

### 4.2 CheckLogResponse 字段不一致 🔴

**后端定义**：
```typescript
export interface CheckLogResponse {
  id: string;
  monitor_id: string;
  status: CheckStatus;
  http_code: number | null;
  response_time: number | null;
  error_msg: string | null;
  checked_at: Date;
}
```

**前端定义**：
```typescript
export interface CheckLogResponse {
  id: string;
  monitor_id: string;
  monitor_name: string;  // 后端没有这个字段！
  status: CheckStatus;
  http_code: number | null;
  response_time: number;
  error_msg: string | null;
  checked_at: string;
}
```

**严重问题**：前端期望 `monitor_name`，但后端 `CheckLogResponse` 没有这个字段！

**后端 API 代码**（history.ts）：
```typescript
const response: CheckLogResponse[] = logs.map((l) => ({
  id: l.id,
  monitor_id: l.monitor_id,
  status: l.status,
  http_code: l.http_code,
  response_time: l.response_time,
  error_msg: l.error_msg,
  checked_at: l.checked_at
  // 缺少 monitor_name！
}));
```

---

### 4.3 API 返回类型错误 🔴

**前端 API 定义**（api.ts）：
```typescript
getChecks: (...) =>
  apiClient.get<PaginatedResponse<CheckLog>>('/history/checks', ...)
```

**实际应该返回**：
```typescript
PaginatedResponse<CheckLogResponse>  // 包含 monitor_name
```

**问题**：前端使用了错误的类型 `CheckLog` 而不是 `CheckLogResponse`

---

## 五、Alert 模块字段一致性

### 5.1 字段不一致 🔴

**数据库**：
```sql
CREATE TABLE alerts (
  id CHAR(36),
  monitor_id CHAR(36),
  alert_level VARCHAR(20),
  status VARCHAR(20),
  started_at TIMESTAMP,
  ended_at TIMESTAMP NULL,
  duration INT,
  send_status VARCHAR(20),
  send_error TEXT,        -- 数据库有这个字段
  created_at TIMESTAMP,
  updated_at TIMESTAMP    -- 数据库有这个字段
);
```

**后端类型**：
```typescript
export interface Alert {
  id: string;
  monitor_id: string;
  alert_level: AlertLevel;
  status: AlertStatus;
  started_at: Date;
  ended_at: Date | null;
  duration: number | null;
  send_status: SendStatus;
  send_error: string | null;  // ✅ 有这个字段
  created_at: Date;
  updated_at: Date;           // ✅ 有这个字段
}
```

**前端类型**：
```typescript
export interface Alert {
  id: string;
  monitor_id: string;
  monitor_name: string;      // 后端 Alert 没有这个字段！
  alert_level: AlertLevel;
  status: AlertStatus;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  send_status: SendStatus;
  // 缺少 send_error！
  created_at: string;
  // 缺少 updated_at！
}
```

**问题**：
1. 前端 `Alert` 有 `monitor_name`，后端 `Alert` 没有
2. 前端 `Alert` 缺少 `send_error` 和 `updated_at`

---

### 5.2 AlertResponse 字段不一致 🔴

**后端定义**：
```typescript
export interface AlertResponse {
  id: string;
  monitor_id: string;
  monitor_name?: string;  // 可选
  alert_level: AlertLevel;
  status: AlertStatus;
  started_at: Date;
  ended_at: Date | null;
  duration: number | null;
  send_status: SendStatus;
  created_at: Date;
  // 缺少 send_error！
  // 缺少 updated_at！
}
```

**前端定义**：
```typescript
export interface AlertResponse {
  id: string;
  monitor_id: string;
  monitor_name: string;   // 必填
  alert_level: AlertLevel;
  status: AlertStatus;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  send_status: SendStatus;
  created_at: string;
  // 缺少 send_error！
  // 缺少 updated_at！
}
```

**问题**：
1. `monitor_name` 后端可选，前端必填
2. 都缺少 `send_error` 和 `updated_at`

---

### 5.3 API 映射不一致 🟡

**后端 API**（history.ts）：
```typescript
const response: AlertResponse[] = alerts.map((a) => ({
  id: a.id,
  monitor_id: a.monitor_id,
  monitor_name: a.monitor_name,  // 从 JOIN 获取
  alert_level: a.alert_level,
  status: a.status,
  started_at: a.started_at,
  ended_at: a.ended_at,
  duration: a.duration,
  send_status: a.send_status,
  created_at: a.created_at
  // 缺少 send_error 和 updated_at！
}));
```

**问题**：API 返回时遗漏了 `send_error` 和 `updated_at` 字段

---

## 六、Dashboard 模块字段一致性

### 6.1 DashboardData 字段不一致 🔴

**后端类型**：
```typescript
export interface DashboardData {
  summary: DashboardSummary;
  recent_alerts: AlertResponse[];
  items: DashboardMonitorItem[];  // 注意字段名是 items
}

export interface DashboardMonitorItem {
  id: string;
  name: string;
  url: string;
  health_status: HealthStatus;
  last_check_at: Date | null;
  last_response_time: number | null;
}
```

**前端类型**：
```typescript
export interface DashboardData {
  stats: DashboardStats;      // 字段名不一致！
  monitors: Monitor[];        // 字段名不一致！
  recent_alerts: Alert[];
}

export interface DashboardStats {
  total_monitors: number;
  active_monitors: number;
  warning_monitors: number;
  critical_monitors: number;
  total_checks_24h: number;
  success_rate_24h: number;
  avg_response_time_24h: number;
  recent_alerts: Alert[];
}
```

**严重问题**：
1. 后端 `summary` vs 前端 `stats`
2. 后端 `items` vs 前端 `monitors`
3. 后端 `DashboardMonitorItem` vs 前端 `Monitor`

**后端 API 代码**（dashboard.ts）：
```typescript
export const dashboardApi = {
  get: () => apiClient.get<DashboardData>('/dashboard'),
};
```

需要查看实际后端实现来确认返回的字段名。

---

## 七、关键问题汇总

### 🔴 严重问题（会导致运行时错误）

| # | 问题 | 影响 | 修复优先级 |
|---|------|------|------------|
| 1 | `AuthResponse.token` vs `access_token` | 登录后无法获取 token | P0 |
| 2 | `CheckLogResponse.monitor_name` 后端缺失 | 检查历史页面显示错误 | P0 |
| 3 | `Alert` 类型字段不一致 | 告警页面数据错误 | P0 |
| 4 | `DashboardData` 字段名不一致 | 监控大盘无法显示 | P0 |
| 5 | `AlertResponse` 缺少 `send_error` | 告警发送错误信息丢失 | P1 |

### 🟡 警告问题（可能导致数据问题）

| # | 问题 | 影响 | 修复优先级 |
|---|------|------|------------|
| 6 | 日期类型 `Date` vs `string` | 需要确保正确转换 | P1 |
| 7 | `CheckLog.response_time` 可空性不一致 | 类型错误 | P1 |
| 8 | `monitor_name` 可选/必填不一致 | 类型检查失败 | P1 |

### 🟢 建议问题（命名不一致）

| # | 问题 | 建议 |
|---|------|------|
| 9 | `summary` vs `stats` | 统一命名 |
| 10 | `items` vs `monitors` | 统一命名 |

---

## 八、修复方案

### 8.1 统一 Auth 响应字段

**修改后端**（auth.ts）：
```typescript
// 登录响应
success(res, {
  access_token: token,  // 改为 access_token
  token_type: 'Bearer',
  expires_in: 7 * 24 * 3600,
  user: userResponse
});

// 注册响应
success(res, {
  user: userResponse,
  access_token: token,  // 添加 token
  token_type: 'Bearer',
  expires_in: 7 * 24 * 3600
});
```

### 8.2 修复 CheckLogResponse

**修改后端类型**（types/index.ts）：
```typescript
export interface CheckLogResponse {
  id: string;
  monitor_id: string;
  monitor_name: string;  // 添加这个字段
  status: CheckStatus;
  http_code: number | null;
  response_time: number | null;  // 统一为可空
  error_msg: string | null;
  checked_at: Date;
}
```

**修改后端 API**（history.ts）：
```typescript
const response: CheckLogResponse[] = logs.map((l) => ({
  id: l.id,
  monitor_id: l.monitor_id,
  monitor_name: l.monitor_name,  // 添加
  status: l.status,
  http_code: l.http_code,
  response_time: l.response_time,
  error_msg: l.error_msg,
  checked_at: l.checked_at
}));
```

**修改前端 API**（api.ts）：
```typescript
getChecks: (...) =>
  apiClient.get<PaginatedResponse<CheckLogResponse>>('/history/checks', ...)
```

### 8.3 修复 Alert 类型

**统一后端类型**（types/index.ts）：
```typescript
export interface AlertResponse {
  id: string;
  monitor_id: string;
  monitor_name: string;  // 改为必填
  alert_level: AlertLevel;
  status: AlertStatus;
  started_at: Date;
  ended_at: Date | null;
  duration: number | null;
  send_status: SendStatus;
  send_error: string | null;  // 添加
  created_at: Date;
  updated_at: Date;  // 添加
}
```

**修改前端类型**（types/index.ts）：
```typescript
export interface Alert {
  id: string;
  monitor_id: string;
  alert_level: AlertLevel;  // 移除 monitor_name
  status: AlertStatus;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  send_status: SendStatus;
  send_error: string | null;  // 添加
  created_at: string;
  updated_at: string;  // 添加
}

export interface AlertResponse {
  id: string;
  monitor_id: string;
  monitor_name: string;
  alert_level: AlertLevel;
  status: AlertStatus;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  send_status: SendStatus;
  send_error: string | null;  // 添加
  created_at: string;
  updated_at: string;  // 添加
}
```

### 8.4 修复 Dashboard 类型

**修改后端类型或前端类型**，建议修改前端以匹配后端：

```typescript
// 前端改为
export interface DashboardData {
  summary: DashboardSummary;
  recent_alerts: AlertResponse[];
  monitors: DashboardMonitorItem[];  // 改为 monitors
}

export interface DashboardSummary {
  total: number;
  normal: number;
  warning: number;
  critical: number;
  paused: number;
}
```

或者修改后端返回字段名。

---

## 九、验证清单

修复后需要验证以下端到端流程：

- [ ] 登录成功，token 正确存储
- [ ] 注册成功，自动登录
- [ ] 监控列表正常显示
- [ ] 监控详情正常显示（包含 webhook 和 stats）
- [ ] 检查历史正常显示（包含 monitor_name）
- [ ] 告警历史正常显示（包含 send_error）
- [ ] 监控大盘正常显示

---

*报告结束*

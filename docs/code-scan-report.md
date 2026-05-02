# 代码扫描报告

> 扫描时间：2026-05-02
> 扫描范围：backend/src, frontend/src
> 扫描依据：backend-scan-code-sln.md, front-end-scan-code-sln.md

---

## 一、后端代码问题 (backend/src)

### 🔴 严重问题

#### 1. SQL 注入风险 - `monitors.ts` 第 56 行
```typescript
conditions.push('(m.name LIKE ? OR m.url LIKE ?)');
values.push(`%${keyword}%`, `%${keyword}%`);
```
**问题**：虽然使用了参数化查询，但 `keyword` 未经过滤直接拼接到 LIKE 模式中。
**建议**：对 `keyword` 进行 sanitize 处理，移除特殊字符如 `%`、`_` 等通配符。

#### 2. 硬编码密钥 - `cron.ts` 第 10 行
```typescript
const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret-key';
```
**问题**：存在默认硬编码密钥，如果环境变量未设置则使用弱密钥。
**建议**：移除默认值，强制要求设置环境变量，启动时检查并抛出错误。

#### 3. 数据库连接密码硬编码风险 - `db.ts` 第 13 行
```typescript
password: process.env.DB_PASSWORD || '123456',
```
**问题**：存在默认硬编码数据库密码。
**建议**：移除默认值，强制要求通过环境变量配置。

---

### 🟡 中等问题

#### 4. 资源未释放风险 - `cron.ts` 健康检查
```typescript
await Promise.all(batch.map(async monitor => {
  // 每个监控项都创建新的请求，但没有限制并发数
}));
```
**问题**：虽然使用了 batch 处理，但在 batch 内部使用 `Promise.all` 同时发起所有请求，如果单个 batch 中有慢响应服务，可能导致连接堆积。
**建议**：使用 p-limit 等库限制并发数。

#### 5. 异常吞掉 - `auth.ts` 多处
```typescript
catch (err) {
  console.error('Login error:', err);
  error(res, '登录失败，请稍后重试', 500);
}
```
**问题**：错误信息被统一处理，丢失了具体错误详情，不利于调试。
**建议**：在开发环境返回详细错误，生产环境记录日志但返回通用错误。

#### 6. JWT Token 未设置过期时间检查 - `auth.ts`
```typescript
// 在 generateToken 函数中
```
**问题**：需要确认 JWT token 是否设置了合理的过期时间。
**建议**：确保 token 有过期时间（如 24 小时），并实现刷新机制。

#### 7. 登录失败锁定机制绕过风险 - `auth.ts`
```typescript
const sanitizedUsername = sanitizeString(username);
// ...
const user = await queryOne<User>(
  'SELECT * FROM users WHERE username = ? OR email = ?',
  [sanitizedUsername, sanitizedUsername.toLowerCase()]
);
```
**问题**：使用用户名或邮箱都可以登录，但锁定记录只记录 `sanitizedUsername`，可能导致绕过锁定。
**建议**：锁定记录应该基于实际查询到的用户名，而不是输入值。

---

### 🟢 轻微问题

#### 8. 魔法数字 - `cron.ts`
```typescript
const batchSize = 10;
const SILENCE_DURATION_MINUTES = 15;
```
**建议**：提取为配置常量或环境变量。

#### 9. 重复代码 - `webhooks.ts`
```typescript
// 多处重复映射 Webhook 到 WebhookResponse 的代码
const response: WebhookResponse = {
  id: webhook.id,
  name: webhook.name,
  // ...
};
```
**建议**：提取为公共映射函数。

#### 10. 类型断言过多 - `db.ts`
```typescript
return rows as T[];
return result as mysql.ResultSetHeader;
```
**建议**：使用更严格的类型定义，减少类型断言。

---

## 二、前端代码问题 (frontend/src)

### 🔴 严重问题

#### 1. XSS 风险 - `monitors/new/page.tsx` URL 测试功能
```typescript
const response = await fetch(formData.url, fetchOptions);
```
**问题**：用户输入的 URL 直接用于 fetch，如果 URL 包含恶意 JavaScript 协议（如 `javascript:`）可能导致安全问题。
**建议**：严格验证 URL 格式，只允许 http/https 协议。

#### 2. 本地存储敏感信息 - `api.ts` & `auth.ts`
```typescript
const token = localStorage.getItem('token');
localStorage.setItem('token', response.access_token);
```
**问题**：JWT token 存储在 localStorage，存在 XSS 攻击风险。
**建议**：考虑使用 httpOnly cookie，或至少对 token 进行加密存储。

#### 3. 内存泄漏风险 - `dashboard/page.tsx`
```typescript
useEffect(() => {
  fetchData();
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, []);
```
**问题**：虽然清除了 interval，但如果组件快速卸载，fetchData 中的 setState 可能在组件卸载后执行。
**建议**：使用 AbortController 取消未完成的请求。

---

### 🟡 中等问题

#### 4. Hooks 依赖遗漏 - `auth.ts` (store)
```typescript
useEffect(() => {
  if (token && !user) {
    fetchUser();
  }
}, [token, user, fetchUser]);
```
**问题**：`fetchUser` 是 store 中的方法，虽然 zustand 的 actions 是稳定的，但最好明确处理。

#### 5. 类型导入不一致 - `api.ts`
```typescript
list: () => apiClient.get<{ items: import('@/types').Webhook[] }>('/webhooks'),
```
**问题**：多处使用内联 `import('@/types')`，应该统一在文件顶部导入。
**建议**：统一导入类型，提高代码可读性。

#### 6. 错误边界缺失 - 多个页面组件
**问题**：页面组件没有使用 ErrorBoundary 包裹，一旦渲染错误会导致整个应用崩溃。
**建议**：添加 ErrorBoundary 组件包装页面。

#### 7. 表单提交无防抖 - `monitors/new/page.tsx`
```typescript
<button type="submit" disabled={loading} className="btn-primary">
```
**问题**：虽然使用了 `loading` 状态，但快速点击仍可能触发多次提交。
**建议**：添加防抖或使用更严格的提交状态管理。

---

### 🟢 轻微问题

#### 8. 魔法字符串 - `api.ts`
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
```
**建议**：提取为配置文件。

#### 9. 重复的状态更新逻辑 - `auth.ts`
```typescript
set({
  user: {
    ...response.user,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // ...
});
```
**问题**：多处重复构造 user 对象。
**建议**：提取为公共函数。

#### 10. 未使用的导入 - 需要检查
**建议**：运行 ESLint 检查未使用的导入和变量。

---

## 三、安全漏洞汇总

| 等级 | 数量 | 问题类型 |
|------|------|----------|
| 🔴 严重 | 5 | SQL注入风险、硬编码密钥、XSS风险、敏感信息存储 |
| 🟡 中等 | 7 | 资源管理、错误处理、类型问题、并发控制 |
| 🟢 轻微 | 5 | 代码风格、重复代码、魔法数字 |

---

## 四、修复建议优先级

### P0 - 立即修复
1. 移除所有硬编码密钥和密码默认值
2. 修复 SQL 注入风险（keyword 过滤）
3. 加强 URL 验证防止 XSS

### P1 - 本周修复
4. 实现请求取消机制防止内存泄漏
5. 添加 ErrorBoundary 错误边界
6. 统一类型导入

### P2 - 后续优化
7. 提取配置常量
8. 消除重复代码
9. 完善错误日志

---

## 五、工具推荐

- **ESLint**: 检查代码风格和潜在问题
- **SonarQube**: 全面的代码质量和安全扫描
- **Snyk**: 依赖安全漏洞扫描
- **CodeQL**: GitHub 的深度代码分析工具

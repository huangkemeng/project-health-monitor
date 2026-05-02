# 前端交互与体验问题补充报告

> 扫描重点：防抖、限流、布局、Loading、API Token、请求取消

---

## 一、防抖（Debounce）问题 🔴

### 1.1 搜索输入缺少防抖
**位置**：`frontend/src/app/monitors/page.tsx` 第 75-80 行

```typescript
// 当前实现 - 每次输入都触发请求
<input
  value={filters.keyword}
  onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
/>
```

**问题**：用户在搜索框输入时，每输入一个字符都会触发 API 请求，造成：
- 服务器压力增大
- 请求响应顺序错乱（后发先至）
- 用户体验差（闪烁）

**修复建议**：
```typescript
import { useCallback } from 'react';
import { debounce } from 'lodash';

// 在组件内
const debouncedSearch = useCallback(
  debounce((keyword: string) => {
    setFilters(prev => ({ ...prev, keyword }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, 300),
  []
);

// 输入框
<input
  value={filters.keyword}
  onChange={(e) => debouncedSearch(e.target.value)}
/>
```

### 1.2 表单输入缺少防抖
**位置**：`frontend/src/app/monitors/new/page.tsx` 等表单页面

**问题**：表单验证和 URL 测试可能频繁触发

---

## 二、限流（Throttle）问题 🔴

### 2.1 按钮点击缺少限流
**位置**：多个页面中的操作按钮

**问题场景**：
- 快速点击"保存"按钮可能提交多次
- 快速点击"测试 Webhook"可能发送多次请求

**当前代码**（monitors/new/page.tsx）：
```typescript
<button
  type="submit"
  disabled={saving}
>
  {saving ? '保存中...' : '保存'}
</button>
```

虽然使用了 `disabled` 状态，但如果用户在网络延迟时多次点击，仍可能出现问题。

**修复建议**：
```typescript
import { useCallback } from 'react';
import { throttle } from 'lodash';

const handleSubmit = useCallback(
  throttle(async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    // ... 提交逻辑
  }, 1000, { leading: true, trailing: false }),
  [saving]
);
```

### 2.2 后端限流缺失
**位置**：`backend/src/index.ts`

**问题**：API 没有限流保护

**修复建议**：
```typescript
import rateLimit from 'express-rate-limit';

// 通用限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { code: 429, message: '请求过于频繁，请稍后再试' }
});

// 登录限流（更严格）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
```

---

## 三、布局错乱问题 🟡

### 3.1 Loading 状态布局跳动
**位置**：`frontend/src/app/loading.tsx`

**当前问题**：
```typescript
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
    </div>
  );
}
```

**问题**：
- 全屏居中导致布局跳动
- 没有保持页面结构
- 与 MainLayout 的 loading 状态不一致

**修复建议**：
```typescript
// 使用骨架屏替代简单 loading
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header 骨架 */}
      <div className="bg-white border-b border-gray-200 h-16 animate-pulse" />
      
      {/* Content 骨架 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </main>
    </div>
  );
}
```

### 3.2 响应式布局问题
**位置**：多个列表页面

**问题**：
- 表格在小屏幕下显示不全
- 操作按钮在小屏幕下堆叠错乱
- 表单布局在移动端适配不佳

**建议**：
- 使用 `overflow-x-auto` 包装表格
- 使用 Grid 响应式布局
- 添加移动端专用样式

---

## 四、骨架屏与 Loading 问题 🟡

### 4.1 全局 Loading 组件过于简单
**位置**：`frontend/src/app/loading.tsx`

**问题**：只有一个旋转动画，用户体验差

**修复建议**：实现骨架屏组件

```typescript
// components/common/Skeleton.tsx
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-20 bg-gray-200 rounded" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  );
}
```

### 4.2 局部 Loading 状态缺失
**位置**：`frontend/src/app/monitors/page.tsx`

**问题**：
- 列表加载时没有骨架屏
- 操作按钮 loading 状态样式不一致

**建议**：
```typescript
// 列表加载骨架屏
{loading && !monitors.length ? (
  <SkeletonTable rows={5} />
) : (
  <MonitorList monitors={monitors} />
)}

// 按钮 loading 统一组件
<Button loading={isLoading}>
  保存
</Button>
```

### 4.3 页面切换 Loading 体验差
**位置**：`frontend/src/components/layout/MainLayout.tsx`

**问题**：认证检查时显示简单 loading，没有骨架屏

---

## 五、API Token 问题 🔴

### 5.1 Token 未正确排除登录/注册接口
**位置**：`frontend/src/lib/api.ts` 第 25-32 行

```typescript
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

**问题**：当前实现只要有 token 就会添加，但登录/注册接口不应该携带 token

**修复建议**：
```typescript
// 不需要 token 的接口白名单
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/health'
];

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => 
      config.url?.includes(endpoint)
    );
    
    if (token && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

### 5.2 Token 过期处理不完善
**位置**：`frontend/src/lib/api.ts` 第 35-45 行

**问题**：
- 401 时直接跳转登录页，可能丢失用户正在编辑的数据
- 没有尝试刷新 token 的机制

**建议**：
```typescript
// 添加 token 刷新机制
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && originalRequest) {
      // 尝试刷新 token
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refreshToken();
          refreshSubscribers.forEach(cb => cb(newToken));
          refreshSubscribers = [];
          return api(originalRequest);
        } catch {
          // 刷新失败，跳转登录
          redirectToLogin();
        } finally {
          isRefreshing = false;
        }
      }
      
      // 等待刷新完成
      return new Promise(resolve => {
        refreshSubscribers.push(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }
    
    return Promise.reject(error);
  }
);
```

---

## 六、API 请求取消问题 🔴

### 6.1 组件卸载时未取消请求
**位置**：多个页面组件

**问题**：
- 用户快速切换页面时，未完成请求继续执行
- 可能导致内存泄漏或状态更新错误

**当前代码**（monitors/page.tsx）：
```typescript
useEffect(() => {
  fetchMonitors();
}, [pagination.page, filters.status, filters.health_status]);
```

**修复建议**：
```typescript
useEffect(() => {
  const abortController = new AbortController();
  
  const fetchMonitors = async () => {
    try {
      setLoading(true);
      const response = await monitorsApi.list(
        { /* params */ },
        { signal: abortController.signal } // 传递 signal
      );
      setMonitors(response.items);
    } catch (err) {
      if (err.name !== 'AbortError') {
        error('获取监控项失败');
      }
    } finally {
      setLoading(false);
    }
  };
  
  fetchMonitors();
  
  return () => {
    abortController.abort();
  };
}, [pagination.page, filters.status, filters.health_status]);
```

### 6.2 API 层不支持 Cancel Token
**位置**：`frontend/src/lib/api.ts`

**问题**：需要修改 API 层以支持 signal 参数

**修复建议**：
```typescript
export const apiClient = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.get<ApiResponse<T>>(url, config);
    return handleResponse(response);
  },
  // ... 其他方法也需要支持 config
};

// Monitors API
export const monitorsApi = {
  list: (params?: {...}, config?: AxiosRequestConfig) =>
    apiClient.get<PaginatedResponse<Monitor>>('/monitors', { params, ...config }),
  // ...
};
```

---

## 七、问题汇总与优先级

| 问题 | 严重程度 | 影响范围 | 修复复杂度 |
|------|----------|----------|------------|
| 搜索缺少防抖 | 🔴 高 | 所有搜索功能 | 低 |
| 按钮缺少限流 | 🔴 高 | 所有表单提交 | 低 |
| API 未排除登录接口 | 🔴 高 | 认证流程 | 低 |
| 请求未取消 | 🔴 高 | 所有页面 | 中 |
| 后端缺少限流 | 🔴 高 | 服务端安全 | 低 |
| Loading 体验差 | 🟡 中 | 全局 | 中 |
| 布局响应式问题 | 🟡 中 | 移动端 | 中 |
| Token 刷新机制 | 🟡 中 | 认证流程 | 高 |

---

## 八、修复建议代码包

### 8.1 创建工具 hooks

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// hooks/useThrottle.ts
import { useRef, useCallback } from 'react';

export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  const lastRun = useRef<number>(0);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRun.current >= delay) {
      lastRun.current = now;
      fn(...args);
    }
  }, [fn, delay]) as T;
}

// hooks/useAbortableRequest.ts
import { useEffect, useRef } from 'react';

export function useAbortableRequest() {
  const abortControllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);
  
  const getSignal = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  };
  
  return { getSignal };
}
```

### 8.2 更新 API 层

```typescript
// lib/api.ts - 完整修复版
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// 不需要 token 的接口
const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/register', '/health'];

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30秒超时
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const isPublic = PUBLIC_ENDPOINTS.some(ep => config.url?.includes(ep));
    
    if (token && !isPublic) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API client with config support
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    api.get<ApiResponse<T>>(url, config).then(handleResponse),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.post<ApiResponse<T>>(url, data, config).then(handleResponse),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.put<ApiResponse<T>>(url, data, config).then(handleResponse),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    api.delete<ApiResponse<T>>(url, config).then(handleResponse),
};
```

---

*报告结束*

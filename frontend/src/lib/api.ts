import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  ApiResponse,
  ApiError,
  Webhook,
  CreateWebhookData,
  Monitor,
  MonitorResponse,
  PaginatedResponse,
  CreateMonitorData,
  DashboardData,
  CheckLog,
  Alert,
  MonitorGroup,
  CreateGroupData
} from '@/types';
import { emitRateLimitError, emitError } from '@/lib/error-events';
import { ApiException } from '@/lib/error-handler';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/health',
];

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor - add auth token
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

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      // 排除登录接口的 401 错误（用户名或密码错误）
      const isLoginEndpoint = error.config?.url?.includes('/auth/login');
      if (!isLoginEndpoint) {
        // Token expired or invalid - only redirect for non-login endpoints
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      // 403 Forbidden - 账号锁定等权限错误
      const message = error.response.data?.message || '访问被拒绝';
      const forbiddenError = new Error(message);
      forbiddenError.name = 'ForbiddenError';
      return Promise.reject(forbiddenError);
    } else if (error.response?.status === 429) {
      // Rate limit exceeded - show user-friendly message
      const message = error.response.data?.message || '请求过于频繁，请稍后再试';
      // Emit global error event
      emitRateLimitError(message);
      // Create a custom error with the message from backend
      const rateLimitError = new Error(message);
      rateLimitError.name = 'RateLimitError';
      return Promise.reject(rateLimitError);
    } else if (error.response?.status && error.response.status >= 500) {
      // Server errors
      emitError('服务器错误，请稍后重试');
    }
    return Promise.reject(error);
  }
);

// Helper function to handle API responses
function handleResponse<T>(response: { data: ApiResponse<T> }): T {
  const { data } = response;
  if (data.code >= 200 && data.code < 300) {
    return data.data as T;
  }
  throw new ApiException(data.message, data.code, data.errors);
}

// 重新导出 ApiException 以保持兼容性
export { ApiException } from '@/lib/error-handler';

// API methods
export const apiClient = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.get<ApiResponse<T>>(url, config);
    return handleResponse(response);
  },

  post: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.post<ApiResponse<T>>(url, data, config);
    return handleResponse(response);
  },

  put: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.put<ApiResponse<T>>(url, data, config);
    return handleResponse(response);
  },

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.delete<ApiResponse<T>>(url, config);
    return handleResponse(response);
  },
};

// Auth API
export const authApi = {
  login: (credentials: { username: string; password: string; remember_me?: boolean }) =>
    apiClient.post<{ token: string; user: { id: string; username: string; email: string } }>('/auth/login', credentials),

  register: (data: { username: string; email: string; password: string; confirm_password: string }) =>
    apiClient.post<{ id: string; username: string; email: string; created_at: string }>('/auth/register', data),

  logout: () => apiClient.post('/auth/logout', {}),

  me: () => apiClient.get<{ id: string; username: string; email: string; created_at: string }>('/auth/me'),

  changePassword: (data: { old_password: string; new_password: string; confirm_password: string }) =>
    apiClient.put('/auth/password', data),
};

// Webhooks API
export const webhooksApi = {
  list: (config?: AxiosRequestConfig) =>
    apiClient.get<{ items: Webhook[] }>('/webhooks', config),

  get: (id: string, config?: AxiosRequestConfig) =>
    apiClient.get<Webhook>(`/webhooks/${id}`, config),

  getDefault: (config?: AxiosRequestConfig) =>
    apiClient.get<Webhook | null>('/webhooks/default', config),

  create: (data: CreateWebhookData, config?: AxiosRequestConfig) =>
    apiClient.post<Webhook>('/webhooks', data, config),

  update: (id: string, data: Partial<CreateWebhookData>, config?: AxiosRequestConfig) =>
    apiClient.put<Webhook>(`/webhooks/${id}`, data, config),

  delete: (id: string, config?: AxiosRequestConfig) =>
    apiClient.delete(`/webhooks/${id}`, config),

  test: (id: string, config?: AxiosRequestConfig) =>
    apiClient.post(`/webhooks/${id}/test`, {}, config),
};

// Monitors API
export const monitorsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string; health_status?: string; keyword?: string; group_id?: string }, config?: AxiosRequestConfig) =>
    apiClient.get<PaginatedResponse<Monitor>>('/monitors', { params, ...config }),

  get: (id: string, config?: AxiosRequestConfig) =>
    apiClient.get<MonitorResponse>(`/monitors/${id}`, config),

  create: (data: CreateMonitorData, config?: AxiosRequestConfig) =>
    apiClient.post<MonitorResponse>('/monitors', data, config),

  update: (id: string, data: Partial<CreateMonitorData>, config?: AxiosRequestConfig) =>
    apiClient.put<MonitorResponse>(`/monitors/${id}`, data, config),

  delete: (id: string, config?: AxiosRequestConfig) =>
    apiClient.delete(`/monitors/${id}`, config),

  pause: (id: string, config?: AxiosRequestConfig) =>
    apiClient.post<{ id: string; status: string }>(`/monitors/${id}/pause`, {}, config),

  resume: (id: string, config?: AxiosRequestConfig) =>
    apiClient.post<{ id: string; status: string }>(`/monitors/${id}/resume`, {}, config),
};

// Dashboard API
export const dashboardApi = {
  get: (config?: AxiosRequestConfig) =>
    apiClient.get<DashboardData>('/dashboard', config),
};

// History API
export const historyApi = {
  getChecks: (params?: { monitor_id?: string; status?: string; start_time?: string; end_time?: string; page?: number; page_size?: number }, config?: AxiosRequestConfig) =>
    apiClient.get<PaginatedResponse<CheckLog>>('/history/checks', { params, ...config }),

  getAlerts: (params?: { monitor_id?: string; status?: string; start_time?: string; end_time?: string; page?: number; page_size?: number }, config?: AxiosRequestConfig) =>
    apiClient.get<PaginatedResponse<Alert>>('/history/alerts', { params, ...config }),
};

// Groups API
export const groupsApi = {
  list: (config?: AxiosRequestConfig) =>
    apiClient.get<{ items: MonitorGroup[]; total: number }>('/groups', config),

  get: (id: string, config?: AxiosRequestConfig) =>
    apiClient.get<MonitorGroup>(`/groups/${id}`, config),

  create: (data: CreateGroupData, config?: AxiosRequestConfig) =>
    apiClient.post<MonitorGroup>('/groups', data, config),

  update: (id: string, data: Partial<CreateGroupData>, config?: AxiosRequestConfig) =>
    apiClient.put<MonitorGroup>(`/groups/${id}`, data, config),

  delete: (id: string, config?: AxiosRequestConfig) =>
    apiClient.delete(`/groups/${id}`, config),

  getMonitors: (id: string, params?: { page?: number; limit?: number }, config?: AxiosRequestConfig) =>
    apiClient.get<PaginatedResponse<Monitor>>(`/groups/${id}/monitors`, { params, ...config }),

  moveMonitors: (groupId: string, monitorIds: string[], config?: AxiosRequestConfig) =>
    apiClient.post<{ moved_count: number }>(`/groups/${groupId}/monitors`, { monitor_ids: monitorIds }, config),
};

export default api;

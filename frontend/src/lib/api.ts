import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  ApiResponse,
  ApiError,
  Webhook,
  CreateWebhookData,
  Monitor,
  PaginatedResponse,
  CreateMonitorData,
  DashboardData,
  CheckLog,
  Alert
} from '@/types';

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
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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

// Custom API exception
export class ApiException extends Error {
  constructor(
    message: string,
    public code: number,
    public errors?: ApiError[]
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

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
  list: (params?: { page?: number; page_size?: number; status?: string; health_status?: string; keyword?: string }, config?: AxiosRequestConfig) =>
    apiClient.get<PaginatedResponse<Monitor>>('/monitors', { params, ...config }),

  get: (id: string, config?: AxiosRequestConfig) =>
    apiClient.get<Monitor>(`/monitors/${id}`, config),

  create: (data: CreateMonitorData, config?: AxiosRequestConfig) =>
    apiClient.post<Monitor>('/monitors', data, config),

  update: (id: string, data: Partial<CreateMonitorData>, config?: AxiosRequestConfig) =>
    apiClient.put<Monitor>(`/monitors/${id}`, data, config),

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

export default api;

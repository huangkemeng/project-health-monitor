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

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
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
    apiClient.post<{ access_token: string; token_type: string; expires_in: number; user: { id: string; username: string; email: string } }>('/auth/login', credentials),

  register: (data: { username: string; email: string; password: string; confirm_password: string }) =>
    apiClient.post<{ id: string; username: string; email: string; created_at: string }>('/auth/register', data),

  logout: () => apiClient.post('/auth/logout', {}),

  me: () => apiClient.get<{ id: string; username: string; email: string; created_at: string }>('/auth/me'),

  changePassword: (data: { old_password: string; new_password: string; confirm_password: string }) =>
    apiClient.put('/auth/password', data),
};

// Webhooks API
export const webhooksApi = {
  list: () => apiClient.get<{ items: Webhook[] }>('/webhooks'),

  get: (id: string) => apiClient.get<Webhook>(`/webhooks/${id}`),

  getDefault: () => apiClient.get<Webhook | null>('/webhooks/default'),

  create: (data: CreateWebhookData) =>
    apiClient.post<Webhook>('/webhooks', data),

  update: (id: string, data: Partial<CreateWebhookData>) =>
    apiClient.put<Webhook>(`/webhooks/${id}`, data),

  delete: (id: string) => apiClient.delete(`/webhooks/${id}`),

  test: (id: string) => apiClient.post(`/webhooks/${id}/test`, {}),
};

// Monitors API
export const monitorsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string; health_status?: string; keyword?: string }) =>
    apiClient.get<PaginatedResponse<Monitor>>('/monitors', { params }),

  get: (id: string) => apiClient.get<Monitor>(`/monitors/${id}`),

  create: (data: CreateMonitorData) =>
    apiClient.post<Monitor>('/monitors', data),

  update: (id: string, data: Partial<CreateMonitorData>) =>
    apiClient.put<Monitor>(`/monitors/${id}`, data),

  delete: (id: string) => apiClient.delete(`/monitors/${id}`),

  pause: (id: string) => apiClient.post<{ id: string; status: string }>(`/monitors/${id}/pause`, {}),

  resume: (id: string) => apiClient.post<{ id: string; status: string }>(`/monitors/${id}/resume`, {}),
};

// Dashboard API
export const dashboardApi = {
  get: () => apiClient.get<DashboardData>('/dashboard'),
};

// History API
export const historyApi = {
  getChecks: (params?: { monitor_id?: string; status?: string; start_time?: string; end_time?: string; page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<CheckLog>>('/history/checks', { params }),

  getAlerts: (params?: { monitor_id?: string; status?: string; start_time?: string; end_time?: string; page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<Alert>>('/history/alerts', { params }),
};

export default api;

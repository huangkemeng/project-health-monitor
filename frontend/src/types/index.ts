// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Monitor Types
export type MonitorStatus = 'active' | 'paused' | 'archived';
export type HealthStatus = 'normal' | 'warning' | 'critical';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body: string | null;
  interval: number;
  timeout: number;
  expected_status: number;
  retry_times: number;
  warning_threshold: number;
  status: MonitorStatus;
  health_status: HealthStatus;
  consecutive_failures: number;
  last_check_at: string | null;
  last_response_time: number | null;
  webhook_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonitorStats {
  total_checks: number;
  success_checks: number;
  failed_checks: number;
  success_rate: number;
  avg_response_time: number;
}

export interface MonitorResponse extends Monitor {
  stats?: MonitorStats;
  webhook?: WebhookResponse;
}

export interface CreateMonitorData {
  name: string;
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  interval?: number;
  timeout?: number;
  expected_status?: number;
  retry_times?: number;
  warning_threshold?: number;
  webhook_id?: string;
}

export interface UpdateMonitorData {
  name?: string;
  url?: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  interval?: number;
  timeout?: number;
  expected_status?: number;
  retry_times?: number;
  warning_threshold?: number;
  webhook_id?: string;
}

// Webhook Types
export interface Webhook {
  id: string;
  name: string;
  webhook_url: string;
  at_users: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookResponse extends Webhook {}

export interface CreateWebhookData {
  name: string;
  webhook_url: string;
  at_users?: string;
  is_default?: boolean;
}

export interface UpdateWebhookData {
  name?: string;
  webhook_url?: string;
  at_users?: string;
  is_default?: boolean;
}

// Check Log Types
export type CheckStatus = 'success' | 'failure';

export interface CheckLog {
  id: string;
  monitor_id: string;
  status: CheckStatus;
  http_code: number | null;
  response_time: number;
  error_msg: string | null;
  checked_at: string;
}

export interface CheckLogResponse {
  id: string;
  monitor_id: string;
  monitor_name: string;
  status: CheckStatus;
  http_code: number | null;
  response_time: number;
  error_msg: string | null;
  checked_at: string;
}

// Alert Types
export type AlertLevel = 'warning' | 'critical';
export type AlertStatus = 'firing' | 'resolved';
export type SendStatus = 'pending' | 'sent' | 'failed';

export interface Alert {
  id: string;
  monitor_id: string;
  monitor_name: string;
  alert_level: AlertLevel;
  status: AlertStatus;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  send_status: SendStatus;
  created_at: string;
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
  created_at: string;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface PaginationInfo {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

// API Types
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  errors?: ApiError[];
}

export interface ApiError {
  field: string;
  message: string;
}

// Dashboard Types
export interface DashboardStats {
  total_monitors: number;
  active_monitors: number;
  warning_monitors: number;
  critical_monitors: number;
  total_checks_24h: number;
  success_rate_24h: number;
  avg_response_time_24h: number;
  recent_alerts: AlertResponse[];
}

export interface DashboardMonitorItem {
  id: string;
  name: string;
  url: string;
  health_status: HealthStatus;
  status: MonitorStatus;
  last_check_at: string | null;
  last_response_time: number | null;
}

export interface DashboardData {
  stats: DashboardStats;
  monitors: DashboardMonitorItem[];
}

export interface ResponseTimeData {
  time: string;
  response_time: number;
}

export interface UptimeData {
  date: string;
  uptime: number;
}

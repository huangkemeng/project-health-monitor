// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  created_at: Date;
}

// Monitor Types
export type MonitorStatus = 'active' | 'paused' | 'archived';
export type HealthStatus = 'normal' | 'warning' | 'critical';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface Monitor {
  id: string;
  owner_id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body: string | null;
  check_interval: number;
  timeout: number;
  expected_status: number;
  retry_times: number;
  warning_threshold: number;
  status: MonitorStatus;
  health_status: HealthStatus;
  consecutive_failures: number;
  last_check_at: Date | null;
  last_response_time: number | null;
  webhook_id: string | null;
  group_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MonitorResponse {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body: string | null;
  check_interval: number;
  timeout: number;
  expected_status: number;
  retry_times: number;
  warning_threshold: number;
  status: MonitorStatus;
  health_status: HealthStatus;
  consecutive_failures: number;
  last_check_at: Date | null;
  last_response_time: number | null;
  webhook_id: string | null;
  group_id: string | null;
  webhook?: WebhookResponse;
  stats?: MonitorStats;
  created_at: Date;
  updated_at: Date;
  // 权限相关字段
  owner_id?: string;
  is_own_project?: boolean;
  role?: CollaboratorRole | null;
}

export interface MonitorStats {
  total_checks: number;
  success_checks: number;
  failed_checks: number;
  success_rate: number;
  avg_response_time: number;
}

// Group Types
export interface Group {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  color: string;
  is_default: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

// Webhook Types
export interface Webhook {
  id: string;
  owner_id: string;
  name: string;
  webhook_url: string;
  at_users: string | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WebhookResponse {
  id: string;
  name: string;
  webhook_url: string;
  at_users: string | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

// Check Log Types
export type CheckStatus = 'success' | 'failure';

export interface CheckLog {
  id: string;
  monitor_id: string;
  status: CheckStatus;
  http_code: number | null;
  response_time: number | null;
  error_msg: string | null;
  checked_at: Date;
}

export interface CheckLogResponse {
  id: string;
  monitor_id: string;
  monitor_name?: string;
  group_name?: string | null;
  status: CheckStatus;
  http_code: number | null;
  response_time: number | null;
  error_msg: string | null;
  checked_at: Date;
  // 权限相关字段
  is_own_project?: boolean;
  role?: CollaboratorRole | null;
}

// Alert Types
export type AlertLevel = 'warning' | 'critical';
export type AlertStatus = 'firing' | 'resolved';
export type AlertResolvedReason = 'recovered' | 'paused' | 'deleted' | null;
export type SendStatus = 'pending' | 'sent' | 'failed';

export interface Alert {
  id: string;
  monitor_id: string;
  alert_level: AlertLevel;
  status: AlertStatus;
  resolved_reason: AlertResolvedReason;
  started_at: Date;
  ended_at: Date | null;
  duration: number | null;
  send_status: SendStatus;
  send_error: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AlertResponse {
  id: string;
  monitor_id: string;
  monitor_name?: string;
  group_name?: string | null;
  alert_level: AlertLevel;
  status: AlertStatus;
  resolved_reason: AlertResolvedReason;
  started_at: Date;
  ended_at: Date | null;
  duration: number | null;
  send_status: SendStatus;
  created_at: Date;
  // 权限相关字段
  is_own_project?: boolean;
  role?: CollaboratorRole | null;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  errors?: ApiError[];
}

export interface ApiError {
  field: string;
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

// Dashboard Types
export interface DashboardSummary {
  total: number;
  normal: number;
  warning: number;
  critical: number;
  paused: number;
}

export interface DashboardMonitorItem {
  id: string;
  name: string;
  url: string;
  health_status: HealthStatus;
  last_check_at: Date | null;
  last_response_time: number | null;
  group_name?: string | null;
  // 权限相关字段
  is_own_project?: boolean;
  role?: CollaboratorRole | null;
}

export interface DashboardStats {
  total_monitors: number;
  active_monitors: number;
  warning_monitors: number;
  critical_monitors: number;
  total_checks_24h: number;
  success_rate_24h: number;
  success_rate?: number;
  avg_response_time_24h: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  recent_alerts: AlertResponse[];
  total_alerts?: number;
  items: DashboardMonitorItem[];
  stats: DashboardStats;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

// Alert Silence Types
export interface AlertSilence {
  id: string;
  monitor_id: string;
  alert_level: AlertLevel;
  reason: string;
  silenced_at: Date;
  expires_at: Date;
  created_at: Date;
}

// Login Attempt Types
export interface LoginAttempt {
  id: string;
  username: string;
  ip_address: string | null;
  attempted_at: Date;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

// Authenticated Request
export interface AuthenticatedRequest extends Express.Request {
  user?: JwtPayload;
}

// ============================================
// Collaboration Types
// ============================================

export type CollaboratorRole = 'viewer' | 'editor';
export type CollaboratorStatus = 'active' | 'rejected';

export interface ProjectCollaborator {
  id: string;
  project_owner_id: string;
  collaborator_email: string;
  collaborator_user_id: string | null;
  group_id: string | null;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectCollaboratorResponse {
  id: string;
  collaborator_email: string;
  collaborator_username?: string;
  group_id: string | null;
  group_name?: string | null;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  created_at: Date;
  updated_at?: Date;
}

export interface ProjectRejection {
  id: string;
  user_id: string;
  project_owner_id: string;
  rejected_at: Date;
}

export interface SharedProject {
  owner_id: string;
  owner_username: string;
  owner_email: string;
  role: CollaboratorRole | 'owner';
  group_id: string | null;
  group_name: string | null;
  joined_at: Date;
}

// Permission check result
export interface PermissionCheckResult {
  isOwner: boolean;
  isCollaborator: boolean;
  role: CollaboratorRole | null;
  accessibleGroupIds: string[] | null; // null means all groups
}

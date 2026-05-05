export const createTablesSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  username VARCHAR(20) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_username (username),
  UNIQUE KEY uk_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Monitor groups table (must be created before monitors)
CREATE TABLE IF NOT EXISTS monitor_groups (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  owner_id CHAR(36) NOT NULL,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  color VARCHAR(7) DEFAULT '#3B82F6',
  sort_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_owner_group_name (owner_id, name),
  INDEX idx_groups_owner (owner_id),
  INDEX idx_groups_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  owner_id CHAR(36) NOT NULL,
  name VARCHAR(50) NOT NULL,
  webhook_url VARCHAR(500) NOT NULL,
  at_users VARCHAR(500),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_webhooks_owner (owner_id),
  INDEX idx_webhooks_owner_default (owner_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Monitors table
CREATE TABLE IF NOT EXISTS monitors (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  owner_id CHAR(36) NOT NULL,
  group_id CHAR(36),
  name VARCHAR(50) NOT NULL,
  url VARCHAR(500) NOT NULL,
  method VARCHAR(10) DEFAULT 'GET',
  headers JSON,
  body TEXT,
  check_interval INT DEFAULT 60,
  timeout INT DEFAULT 10,
  expected_status INT DEFAULT 200,
  retry_times INT DEFAULT 5,
  warning_threshold INT DEFAULT 3000,
  status VARCHAR(20) DEFAULT 'active',
  health_status VARCHAR(20) DEFAULT 'normal',
  consecutive_failures INT DEFAULT 0,
  last_check_at TIMESTAMP NULL,
  last_response_time INT,
  webhook_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES monitor_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE SET NULL,
  INDEX idx_monitors_owner (owner_id),
  INDEX idx_monitors_group (group_id),
  INDEX idx_monitors_status (status),
  INDEX idx_monitors_health (health_status),
  INDEX idx_monitors_owner_status (owner_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Check logs table
CREATE TABLE IF NOT EXISTS check_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  monitor_id CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL,
  http_code INT,
  response_time INT,
  error_msg TEXT,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
  INDEX idx_check_logs_monitor (monitor_id),
  INDEX idx_check_logs_checked_at (checked_at),
  INDEX idx_check_logs_monitor_time (monitor_id, checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  monitor_id CHAR(36) NOT NULL,
  alert_level VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'firing',
  resolved_reason ENUM('recovered', 'paused', 'deleted') NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  duration INT,
  send_status VARCHAR(20) DEFAULT 'pending',
  send_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
  INDEX idx_alerts_monitor (monitor_id),
  INDEX idx_alerts_status (status),
  INDEX idx_alerts_started_at (started_at),
  INDEX idx_alerts_monitor_started (monitor_id, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alert silences table (for silence mechanism)
CREATE TABLE IF NOT EXISTS alert_silences (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  monitor_id CHAR(36) NOT NULL,
  alert_level VARCHAR(20) NOT NULL,
  reason VARCHAR(200),
  silenced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
  INDEX idx_silences_monitor (monitor_id),
  INDEX idx_silences_expires (expires_at),
  INDEX idx_silences_monitor_expires (monitor_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Login attempts table (for login lock mechanism)
CREATE TABLE IF NOT EXISTS login_attempts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  username VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_username_time (username, attempted_at),
  INDEX idx_login_attempted_at (attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cron job logs table (for cron job execution tracking)
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  status VARCHAR(20) DEFAULT 'running',
  total_monitors INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  error_message TEXT,
  INDEX idx_cron_logs_status (status),
  INDEX idx_cron_logs_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project collaborators table (for multi-user collaboration)
CREATE TABLE IF NOT EXISTS project_collaborators (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_owner_id CHAR(36) NOT NULL,
  collaborator_email VARCHAR(100) NOT NULL,
  collaborator_user_id CHAR(36),
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (collaborator_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uk_collaborator_project_email (project_owner_id, collaborator_email),
  INDEX idx_collaborators_owner (project_owner_id),
  INDEX idx_collaborators_email (collaborator_email),
  INDEX idx_collaborators_user (collaborator_user_id),
  INDEX idx_collaborators_status (status),
  CONSTRAINT chk_collaborator_role CHECK (role IN ('viewer', 'editor')),
  CONSTRAINT chk_collaborator_status CHECK (status IN ('active', 'rejected', 'removed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project collaborator groups table (for multi-group support)
CREATE TABLE IF NOT EXISTS project_collaborator_groups (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  collaborator_id CHAR(36) NOT NULL,
  group_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collaborator_id) REFERENCES project_collaborators(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES monitor_groups(id) ON DELETE CASCADE,
  UNIQUE KEY uk_collaborator_group (collaborator_id, group_id),
  INDEX idx_collaborator_id (collaborator_id),
  INDEX idx_group_id (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project rejections table (for "not my project" feature)
CREATE TABLE IF NOT EXISTS project_rejections (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  project_owner_id CHAR(36) NOT NULL,
  rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_rejection_user_project (user_id, project_owner_id),
  INDEX idx_rejections_user (user_id),
  INDEX idx_rejections_project (project_owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  guest_email VARCHAR(100),
  type ENUM('bug', 'feature_request', 'other') NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  contact VARCHAR(100),
  status ENUM('pending', 'processing', 'fixed', 'closed', 'duplicate') NOT NULL DEFAULT 'pending',
  duplicate_of CHAR(36),
  page_url VARCHAR(500),
  browser_info VARCHAR(500),
  browser_language VARCHAR(20),
  screen_resolution VARCHAR(20),
  operating_system VARCHAR(100),
  system_version VARCHAR(50),
  assigned_to CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (duplicate_of) REFERENCES feedback(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_feedback_user (user_id),
  INDEX idx_feedback_status (status),
  INDEX idx_feedback_type (type),
  INDEX idx_feedback_created_at (created_at),
  INDEX idx_feedback_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feedback replies table
CREATE TABLE IF NOT EXISTS feedback_replies (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  feedback_id CHAR(36) NOT NULL,
  user_id CHAR(36),
  content TEXT NOT NULL,
  is_admin_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_replies_feedback (feedback_id),
  INDEX idx_replies_created (feedback_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feedback attachments table
CREATE TABLE IF NOT EXISTS feedback_attachments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  feedback_id CHAR(36),
  reply_id CHAR(36),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
  FOREIGN KEY (reply_id) REFERENCES feedback_replies(id) ON DELETE CASCADE,
  INDEX idx_attachments_feedback (feedback_id),
  INDEX idx_attachments_reply (reply_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feedback timeline table
CREATE TABLE IF NOT EXISTS feedback_timeline (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  feedback_id CHAR(36) NOT NULL,
  action_type VARCHAR(30) NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  content TEXT,
  operator_id CHAR(36),
  reply_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reply_id) REFERENCES feedback_replies(id) ON DELETE SET NULL,
  INDEX idx_timeline_feedback (feedback_id),
  INDEX idx_timeline_created (feedback_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feedback notifications table
CREATE TABLE IF NOT EXISTS feedback_notifications (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  feedback_id CHAR(36) NOT NULL,
  type ENUM('status_change', 'reply', 'admin_reply', 'system') NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, is_read),
  INDEX idx_notifications_user_created (user_id, created_at DESC),
  INDEX idx_notifications_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export const dropTablesSQL = `
DROP TABLE IF EXISTS feedback_notifications;
DROP TABLE IF EXISTS feedback_timeline;
DROP TABLE IF EXISTS feedback_attachments;
DROP TABLE IF EXISTS feedback_replies;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS project_rejections;
DROP TABLE IF EXISTS project_collaborator_groups;
DROP TABLE IF EXISTS project_collaborators;
DROP TABLE IF EXISTS cron_job_logs;
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS alert_silences;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS check_logs;
DROP TABLE IF EXISTS monitors;
DROP TABLE IF EXISTS webhooks;
DROP TABLE IF EXISTS monitor_groups;
DROP TABLE IF EXISTS users;
`;

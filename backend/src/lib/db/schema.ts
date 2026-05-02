export const createTablesSQL = `
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS health_monitor 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE health_monitor;

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
  name VARCHAR(50) NOT NULL,
  url VARCHAR(500) NOT NULL,
  method VARCHAR(10) DEFAULT 'GET',
  headers JSON,
  body TEXT,
  interval INT DEFAULT 60,
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
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE SET NULL,
  INDEX idx_monitors_owner (owner_id),
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
`;

export const dropTablesSQL = `
DROP TABLE IF EXISTS alert_silences;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS check_logs;
DROP TABLE IF EXISTS monitors;
DROP TABLE IF EXISTS webhooks;
DROP TABLE IF EXISTS users;
`;

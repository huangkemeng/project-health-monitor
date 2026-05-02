import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date
export function formatDate(date: string | Date, formatStr = 'yyyy-MM-dd HH:mm:ss'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr, { locale: zhCN });
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
}

// Format duration
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
  }
}

// Format response time
export function formatResponseTime(ms: number | null): string {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Truncate URL
export function truncateUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

// Get status color
export function getStatusColor(status: string): string {
  switch (status) {
    case 'normal':
    case 'active':
    case 'success':
      return 'text-status-normal bg-status-normal/10';
    case 'warning':
      return 'text-status-warning bg-status-warning/10';
    case 'critical':
    case 'failure':
      return 'text-status-critical bg-status-critical/10';
    case 'paused':
    case 'resolved':
      return 'text-status-paused bg-status-paused/10';
    default:
      return 'text-gray-500 bg-gray-100';
  }
}

// Get status label
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    normal: '正常',
    warning: '警告',
    critical: '严重',
    active: '活跃',
    paused: '暂停',
    archived: '归档',
    success: '成功',
    failure: '失败',
    firing: '告警中',
    resolved: '已恢复',
    pending: '待发送',
    sent: '已发送',
  };
  return labels[status] || status;
}

// Validate URL
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Validate webhook URL
export function isValidWebhookUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  return url.startsWith('https://qyapi.weixin.qq.com/cgi-bin/webhook/send');
}

// Safe JSON parse
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

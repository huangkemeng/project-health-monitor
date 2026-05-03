import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a date string or Date object and return a Date object
 * Handles both UTC and local time inputs
 */
function parseDate(date: string | Date): Date {
  if (date instanceof Date) {
    return date
  }
  // If the string ends with Z or contains timezone info, parse as-is
  // Otherwise, assume it's UTC
  if (date.endsWith('Z') || date.match(/[+-]\d{2}:\d{2}$/)) {
    return new Date(date)
  }
  // Append Z to treat as UTC
  return new Date(date + 'Z')
}

export function formatDate(date: string | Date): string {
  const d = parseDate(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  const d = parseDate(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatFullDateTime(date: string | Date): string {
  const d = parseDate(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = parseDate(date)
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000)

  if (diffInSeconds < 60) return '刚刚'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} 分钟前`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} 小时前`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} 天前`
  
  return formatDate(date)
}

export function formatTimeOnly(date: string | Date): string {
  const d = parseDate(date)
  return d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分钟`
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    const remainingMinutes = Math.floor((seconds % 3600) / 60)
    return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分` : `${hours}小时`
  }
  const days = Math.floor(seconds / 86400)
  const remainingHours = Math.floor((seconds % 86400) / 3600)
  return remainingHours > 0 ? `${days}天${remainingHours}小时` : `${days}天`
}

export function truncateUrl(url: string, maxLength: number = 30): string {
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength) + '...'
}

export function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: '运行中',
    paused: '已暂停',
    archived: '已归档',
    success: '成功',
    failure: '失败',
    firing: '告警中',
    resolved: '已恢复',
    normal: '正常',
    warning: '警告',
    critical: '严重',
    pending: '待处理',
    acknowledged: '已确认',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    failure: 'bg-red-100 text-red-800',
    firing: 'bg-red-100 text-red-800',
    resolved: 'bg-green-100 text-green-800',
    normal: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800',
    pending: 'bg-blue-100 text-blue-800',
    acknowledged: 'bg-purple-100 text-purple-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

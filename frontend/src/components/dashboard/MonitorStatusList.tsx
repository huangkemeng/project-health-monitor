'use client';

import Link from 'next/link';
import { DashboardMonitorItem, HealthStatus } from '@/types';
import { formatRelativeTime, formatResponseTime, truncateUrl } from '@/lib/utils';
import { Activity, AlertTriangle, AlertCircle, PauseCircle, LucideIcon } from 'lucide-react';

interface MonitorStatusListProps {
  monitors: DashboardMonitorItem[];
}

interface StatusConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  label: string;
}

const statusConfig: Record<HealthStatus, StatusConfig> = {
  normal: {
    icon: Activity,
    color: 'text-status-normal',
    bgColor: 'bg-green-50',
    label: '正常',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-status-warning',
    bgColor: 'bg-yellow-50',
    label: '警告',
  },
  critical: {
    icon: AlertCircle,
    color: 'text-status-critical',
    bgColor: 'bg-red-50',
    label: '严重',
  },
};

export default function MonitorStatusList({ monitors }: MonitorStatusListProps) {
  if (monitors.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>暂无监控项</p>
        <Link
          href="/monitors/new"
          className="text-brand-600 hover:text-brand-500 font-medium mt-2 inline-block"
        >
          创建第一个监控项
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {monitors.map((monitor) => {
          const config = statusConfig[monitor.health_status];
          const StatusIcon = config.icon;

          return (
            <li key={monitor.id}>
              <Link
                href={`/monitors/${monitor.id}`}
                className="block hover:bg-gray-50 transition-colors"
              >
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                        <StatusIcon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="ml-4 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {monitor.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {truncateUrl(monitor.url, 40)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="text-right hidden sm:block">
                        <p>响应时间</p>
                        <p className="font-medium text-gray-900">
                          {monitor.last_response_time ? formatResponseTime(monitor.last_response_time) : '-'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p>最后检查</p>
                        <p className="font-medium text-gray-900">
                          {monitor.last_check_at
                            ? formatRelativeTime(monitor.last_check_at)
                            : '从未'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

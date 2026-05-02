'use client';

import Link from 'next/link';
import { AlertResponse, AlertLevel, AlertStatus } from '@/types';
import { formatRelativeTime, getStatusLabel } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Bell, LucideIcon } from 'lucide-react';

interface RecentAlertsProps {
  alerts: AlertResponse[];
}

interface LevelConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  label: string;
}

interface StatusConfig {
  color: string;
  bgColor: string;
  label: string;
}

const levelConfig: Record<AlertLevel, LevelConfig> = {
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

const statusConfig: Record<AlertStatus, StatusConfig> = {
  firing: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: '告警中',
  },
  resolved: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: '已恢复',
  },
};

export default function RecentAlerts({ alerts }: RecentAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Bell className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p>最近没有告警</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {alerts.map((alert) => {
          const level = levelConfig[alert.alert_level];
          const status = statusConfig[alert.status];
          const LevelIcon = level.icon;

          return (
            <li key={alert.id}>
              <Link
                href={`/monitors/${alert.monitor_id}`}
                className="block hover:bg-gray-50 transition-colors"
              >
                <div className="px-4 py-3 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-8 w-8 rounded-full ${level.bgColor} flex items-center justify-center`}>
                        <LevelIcon className={`h-4 w-4 ${level.color}`} />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {alert.monitor_name || '未知监控项'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatRelativeTime(alert.started_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                      {getStatusLabel(alert.status)}
                    </span>
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

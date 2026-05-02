'use client';

import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import StatCard from '@/components/dashboard/StatCard';
import MonitorStatusList from '@/components/dashboard/MonitorStatusList';
import RecentAlerts from '@/components/dashboard/RecentAlerts';
import { dashboardApi } from '@/lib/api';
import { DashboardData } from '@/types';
import { Activity, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // AbortController for canceling requests
    const abortController = new AbortController();
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await dashboardApi.get();
        // Only update state if component is still mounted
        if (isMounted) {
          setData(response);
          setError(null);
        }
      } catch (err) {
        // Only update state if component is still mounted and not aborted
        if (isMounted && !abortController.signal.aborted) {
          setError('获取数据失败');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Auto refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    // Cleanup function
    return () => {
      isMounted = false;
      abortController.abort();
      clearInterval(interval);
    };
  }, []);

  if (loading && !data) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (error && !data) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 text-brand-600 hover:text-brand-500"
          >
            重试
          </button>
        </div>
      </MainLayout>
    );
  }

  const stats = data?.stats || {
    total_monitors: 0,
    active_monitors: 0,
    warning_monitors: 0,
    critical_monitors: 0,
    total_checks_24h: 0,
    success_rate_24h: 0,
    avg_response_time_24h: 0,
    recent_alerts: []
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">监控大盘</h1>
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="总监控数"
            value={stats.total_monitors}
            icon={Activity}
            color="blue"
          />
          <StatCard
            title="正常"
            value={stats.total_monitors - stats.warning_monitors - stats.critical_monitors}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="警告"
            value={stats.warning_monitors}
            icon={AlertTriangle}
            color="yellow"
          />
          <StatCard
            title="严重"
            value={stats.critical_monitors}
            icon={AlertCircle}
            color="red"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monitor Status List */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-medium text-gray-900">监控项状态</h2>
              </div>
              <MonitorStatusList monitors={data?.monitors || []} />
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-medium text-gray-900">最近告警</h2>
              </div>
              <RecentAlerts alerts={stats.recent_alerts || []} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

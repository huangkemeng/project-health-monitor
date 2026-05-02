'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { historyApi, monitorsApi } from '@/lib/api';
import { Alert, Monitor } from '@/types';
import { formatDate, formatDuration, getStatusLabel } from '@/lib/utils';
import { Search } from 'lucide-react';
import Link from 'next/link';

export default function AlertHistoryPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    monitor_id: '',
    status: '',
    alert_level: '',
  });

  // Fetch monitors for filter
  useEffect(() => {
    const fetchMonitors = async () => {
      try {
        const response = await monitorsApi.list({ page_size: 100 });
        setMonitors(response.items);
      } catch (error) {
        console.error('Failed to fetch monitors:', error);
      }
    };
    fetchMonitors();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await historyApi.getAlerts({
        monitor_id: filters.monitor_id || undefined,
        status: filters.status || undefined,
        page_size: 50,
      });
      // Filter by alert_level if specified
      let filteredAlerts = response.items;
      if (filters.alert_level) {
        filteredAlerts = filteredAlerts.filter(a => a.alert_level === filters.alert_level);
      }
      setAlerts(filteredAlerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchAlerts();
  };

  // Initial load
  useEffect(() => {
    fetchAlerts();
  }, []);

  // Get monitor name by id
  const getMonitorName = (monitorId: string) => {
    const monitor = monitors.find(m => m.id === monitorId);
    return monitor?.name || monitorId;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">告警历史</h1>
            <nav className="flex space-x-4">
              <Link
                href="/history/checks"
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                探测记录
              </Link>
              <Link
                href="/history/alerts"
                className="px-3 py-2 text-sm font-medium text-brand-600 border-b-2 border-brand-500"
              >
                告警记录
              </Link>
            </nav>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="card-body">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="label">监控项</label>
                <select
                  className="input"
                  value={filters.monitor_id}
                  onChange={(e) => setFilters({ ...filters, monitor_id: e.target.value })}
                >
                  <option value="">全部</option>
                  {monitors.map((monitor) => (
                    <option key={monitor.id} value={monitor.id}>
                      {monitor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-40">
                <label className="label">告警级别</label>
                <select
                  className="input"
                  value={filters.alert_level}
                  onChange={(e) => setFilters({ ...filters, alert_level: e.target.value })}
                >
                  <option value="">全部</option>
                  <option value="warning">警告</option>
                  <option value="critical">严重</option>
                </select>
              </div>
              <div className="w-40">
                <label className="label">状态</label>
                <select
                  className="input"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">全部</option>
                  <option value="firing">触发中</option>
                  <option value="resolved">已恢复</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  className="btn-primary inline-flex items-center gap-2"
                  disabled={loading}
                >
                  <Search className="h-4 w-4" />
                  查询
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">监控项</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">级别</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">开始时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">结束时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">持续时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">发送状态</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : alerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      暂无告警记录
                    </td>
                  </tr>
                ) : (
                  alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getMonitorName(alert.monitor_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          alert.alert_level === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getStatusLabel(alert.alert_level)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          alert.status === 'firing' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {getStatusLabel(alert.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(alert.started_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {alert.ended_at ? formatDate(alert.ended_at) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {alert.duration ? formatDuration(alert.duration) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getStatusLabel(alert.send_status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

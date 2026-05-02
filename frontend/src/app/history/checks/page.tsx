'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { historyApi, monitorsApi } from '@/lib/api';
import { CheckLog, Monitor } from '@/types';
import { formatDate, getStatusLabel, formatResponseTime } from '@/lib/utils';
import { Search } from 'lucide-react';
import Link from 'next/link';

export default function CheckHistoryPage() {
  const [checks, setChecks] = useState<CheckLog[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    monitor_id: '',
    status: '',
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

  const fetchChecks = async () => {
    try {
      setLoading(true);
      const response = await historyApi.getChecks({
        monitor_id: filters.monitor_id || undefined,
        status: filters.status || undefined,
        page_size: 50,
      });
      setChecks(response.items);
    } catch (error) {
      console.error('Failed to fetch checks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchChecks();
  };

  // Initial load
  useEffect(() => {
    fetchChecks();
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
            <h1 className="text-2xl font-bold text-gray-900">探测历史</h1>
            <nav className="flex space-x-4">
              <Link
                href="/history/checks"
                className="px-3 py-2 text-sm font-medium text-brand-600 border-b-2 border-brand-500"
              >
                探测记录
              </Link>
              <Link
                href="/history/alerts"
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
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
                <label className="label">状态</label>
                <select
                  className="input"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">全部</option>
                  <option value="success">成功</option>
                  <option value="failure">失败</option>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HTTP 状态码</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">响应时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">错误信息</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">检查时间</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : checks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      暂无探测记录
                    </td>
                  </tr>
                ) : (
                  checks.map((check) => (
                    <tr key={check.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getMonitorName(check.monitor_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          check.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {getStatusLabel(check.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {check.http_code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatResponseTime(check.response_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {check.error_msg || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(check.checked_at)}
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

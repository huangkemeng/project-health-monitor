'use client';

import { useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { historyApi, monitorsApi } from '@/lib/api';
import { CheckLogResponse, AlertResponse, Monitor } from '@/types';
import { formatDate, formatDuration, getStatusLabel, formatResponseTime } from '@/lib/utils';
import { Search, Filter } from 'lucide-react';

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<'checks' | 'alerts'>('checks');
  const [checks, setChecks] = useState<CheckLogResponse[]>([]);
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    monitor_id: '',
    status: '',
  });

  // Fetch monitors for filter
  useState(() => {
    const fetchMonitors = async () => {
      try {
        const response = await monitorsApi.list({ page_size: 100 });
        setMonitors(response.items);
      } catch (error) {
        console.error('Failed to fetch monitors:', error);
      }
    };
    fetchMonitors();
  });

  const fetchChecks = async () => {
    try {
      setLoading(true);
      const response = await historyApi.getChecks({
        ...filters,
        page_size: 50,
      });
      // Map CheckLog to CheckLogResponse
      const mappedChecks: CheckLogResponse[] = response.items.map(item => ({
        id: item.id,
        monitor_id: item.monitor_id,
        monitor_name: item.monitor_id, // Use monitor_id as fallback
        status: item.status,
        http_code: item.http_code,
        response_time: item.response_time,
        error_msg: item.error_msg,
        checked_at: item.checked_at,
      }));
      setChecks(mappedChecks);
    } catch (error) {
      console.error('Failed to fetch checks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await historyApi.getAlerts({
        ...filters,
        page_size: 50,
      });
      // Map Alert to AlertResponse
      const mappedAlerts: AlertResponse[] = response.items.map(item => ({
        id: item.id,
        monitor_id: item.monitor_id,
        monitor_name: item.monitor_id, // Use monitor_id as fallback
        alert_level: item.alert_level,
        status: item.status,
        started_at: item.started_at,
        ended_at: item.ended_at,
        duration: item.duration,
        send_status: item.send_status,
        created_at: item.created_at,
      }));
      setAlerts(mappedAlerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (activeTab === 'checks') {
      fetchChecks();
    } else {
      fetchAlerts();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">历史记录</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('checks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'checks'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              探测记录
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'alerts'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              告警记录
            </button>
          </nav>
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
                  {activeTab === 'checks' ? (
                    <>
                      <option value="success">成功</option>
                      <option value="failure">失败</option>
                    </>
                  ) : (
                    <>
                      <option value="firing">触发中</option>
                      <option value="resolved">已恢复</option>
                    </>
                  )}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  className="btn-primary inline-flex items-center gap-2"
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
          {activeTab === 'checks' ? (
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
                  {checks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        暂无探测记录
                      </td>
                    </tr>
                  ) : (
                    checks.map((check) => (
                      <tr key={check.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {check.monitor_name || check.monitor_id}
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
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">监控项</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">级别</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">开始时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">持续时间</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {alerts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        暂无告警记录
                      </td>
                    </tr>
                  ) : (
                    alerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {alert.monitor_name || alert.monitor_id}
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
                          {alert.duration ? formatDuration(alert.duration) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { monitorsApi } from '@/lib/api';
import { Monitor, MonitorStatus, HealthStatus } from '@/types';
import { formatRelativeTime, formatResponseTime, getStatusLabel, truncateUrl } from '@/lib/utils';
import { useToastContext } from '@/components/common/ToastProvider';
import { Plus, Search, Filter, Play, Pause, MoreVertical, Trash2, Edit } from 'lucide-react';

export default function MonitorsPage() {
  const { success, error } = useToastContext();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    health_status: '',
    keyword: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  });

  const fetchMonitors = async () => {
    try {
      setLoading(true);
      const response = await monitorsApi.list({
        page: pagination.page,
        page_size: pagination.page_size,
        ...filters,
      });
      setMonitors(response.items);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Failed to fetch monitors:', err);
      error('获取监控项失败', '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
  }, [pagination.page, filters.status, filters.health_status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchMonitors();
  };

  const handlePause = async (id: string) => {
    try {
      await monitorsApi.pause(id);
      success('监控已暂停', '监控项已成功暂停');
      fetchMonitors();
    } catch (err) {
      console.error('Failed to pause monitor:', err);
      error('暂停监控失败', '请稍后重试');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await monitorsApi.resume(id);
      success('监控已恢复', '监控项已成功恢复');
      fetchMonitors();
    } catch (err) {
      console.error('Failed to resume monitor:', err);
      error('恢复监控失败', '请稍后重试');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个监控项吗？')) return;
    try {
      await monitorsApi.delete(id);
      success('监控项已删除', '监控项已成功删除');
      fetchMonitors();
    } catch (err) {
      console.error('Failed to delete monitor:', err);
      error('删除监控项失败', '请稍后重试');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthBadgeClass = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">监控项</h1>
          <Link
            href="/monitors/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            新建监控项
          </Link>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索监控项..."
                    className="input pl-10"
                    value={filters.keyword}
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                  />
                </div>
              </div>
              <select
                className="input sm:w-40"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">所有状态</option>
                <option value="active">活跃</option>
                <option value="paused">暂停</option>
                <option value="archived">归档</option>
              </select>
              <select
                className="input sm:w-40"
                value={filters.health_status}
                onChange={(e) => setFilters({ ...filters, health_status: e.target.value })}
              >
                <option value="">所有健康状态</option>
                <option value="normal">正常</option>
                <option value="warning">警告</option>
                <option value="critical">严重</option>
              </select>
              <button type="submit" className="btn-secondary">
                搜索
              </button>
            </form>
          </div>
        </div>

        {/* Monitors List */}
        <div className="card">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : monitors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>暂无监控项</p>
              <Link
                href="/monitors/new"
                className="text-brand-600 hover:text-brand-500 font-medium mt-2 inline-block"
              >
                创建第一个监控项
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      健康
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      响应时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      最后检查
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monitors.map((monitor) => (
                    <tr key={monitor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <Link
                            href={`/monitors/${monitor.id}`}
                            className="text-sm font-medium text-brand-600 hover:text-brand-500"
                          >
                            {monitor.name}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {truncateUrl(monitor.url, 30)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(monitor.status)}`}>
                          {getStatusLabel(monitor.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getHealthBadgeClass(monitor.health_status)}`}>
                          {getStatusLabel(monitor.health_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatResponseTime(monitor.last_response_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {monitor.last_check_at
                          ? formatRelativeTime(monitor.last_check_at)
                          : '从未'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {monitor.status === 'active' ? (
                            <button
                              onClick={() => handlePause(monitor.id)}
                              className="text-gray-400 hover:text-gray-600"
                              title="暂停"
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleResume(monitor.id)}
                              className="text-gray-400 hover:text-green-600"
                              title="恢复"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          <Link
                            href={`/monitors/${monitor.id}/edit`}
                            className="text-gray-400 hover:text-brand-600"
                            title="编辑"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(monitor.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="card-body border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  共 {pagination.total} 条记录
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-gray-600">
                    {pagination.page} / {pagination.total_pages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.total_pages}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { monitorsApi } from '@/lib/api';
import { MonitorResponse } from '@/types';
import { formatDate, formatResponseTime, getStatusLabel } from '@/lib/utils';
import { ArrowLeft, Edit, Play, Pause, Trash2 } from 'lucide-react';

export default function MonitorDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [monitor, setMonitor] = useState<MonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMonitor = async () => {
      try {
        const data = await monitorsApi.get(params.id);
        setMonitor(data);
      } catch (error) {
        console.error('Failed to fetch monitor:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMonitor();
  }, [params.id]);

  const handlePause = async () => {
    try {
      await monitorsApi.pause(params.id);
      const data = await monitorsApi.get(params.id);
      setMonitor(data);
    } catch (error) {
      console.error('Failed to pause monitor:', error);
    }
  };

  const handleResume = async () => {
    try {
      await monitorsApi.resume(params.id);
      const data = await monitorsApi.get(params.id);
      setMonitor(data);
    } catch (error) {
      console.error('Failed to resume monitor:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个监控项吗？')) return;
    try {
      await monitorsApi.delete(params.id);
      router.push('/monitors');
    } catch (error) {
      console.error('Failed to delete monitor:', error);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (!monitor) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">监控项不存在</p>
          <Link href="/monitors" className="text-brand-600 hover:text-brand-500 mt-2 inline-block">
            返回列表
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/monitors"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回列表
          </Link>
          <div className="flex items-center gap-2">
            {monitor.status === 'active' ? (
              <button
                onClick={handlePause}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                暂停
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                恢复
              </button>
            )}
            <Link
              href={`/monitors/${params.id}/edit`}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              编辑
            </Link>
            <button
              onClick={handleDelete}
              className="btn-danger inline-flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              删除
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="card">
            <div className="card-header">
              <h1 className="text-xl font-bold text-gray-900">{monitor.name}</h1>
            </div>
            <div className="card-body">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">URL</dt>
                  <dd className="mt-1 text-sm text-gray-900">{monitor.url}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">方法</dt>
                  <dd className="mt-1 text-sm text-gray-900">{monitor.method}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">状态</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      monitor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusLabel(monitor.status)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">健康状态</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      monitor.health_status === 'normal' ? 'bg-green-100 text-green-800' :
                      monitor.health_status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {getStatusLabel(monitor.health_status)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">探测间隔</dt>
                  <dd className="mt-1 text-sm text-gray-900">{monitor.interval} 秒</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">超时时间</dt>
                  <dd className="mt-1 text-sm text-gray-900">{monitor.timeout} 秒</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">期望状态码</dt>
                  <dd className="mt-1 text-sm text-gray-900">{monitor.expected_status}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">连续失败次数</dt>
                  <dd className="mt-1 text-sm text-gray-900">{monitor.consecutive_failures} / {monitor.retry_times}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">最后检查时间</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {monitor.last_check_at ? formatDate(monitor.last_check_at) : '从未'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">最后响应时间</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatResponseTime(monitor.last_response_time)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Stats */}
          {monitor.stats && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-medium text-gray-900">24小时统计</h2>
              </div>
              <div className="card-body">
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <dt className="text-sm font-medium text-gray-500">总探测次数</dt>
                    <dd className="mt-1 text-2xl font-semibold text-gray-900">{monitor.stats.total_checks}</dd>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <dt className="text-sm font-medium text-green-600">成功次数</dt>
                    <dd className="mt-1 text-2xl font-semibold text-green-700">{monitor.stats.success_checks}</dd>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <dt className="text-sm font-medium text-red-600">失败次数</dt>
                    <dd className="mt-1 text-2xl font-semibold text-red-700">{monitor.stats.failed_checks}</dd>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <dt className="text-sm font-medium text-blue-600">可用率</dt>
                    <dd className="mt-1 text-2xl font-semibold text-blue-700">{monitor.stats.success_rate}%</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <dt className="text-sm font-medium text-gray-500">平均响应时间</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {formatResponseTime(monitor.stats.avg_response_time)}
                  </dd>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

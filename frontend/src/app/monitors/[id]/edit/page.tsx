'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import { monitorsApi, webhooksApi } from '@/lib/api';
import { Monitor, Webhook, HttpMethod } from '@/types';
import { ArrowLeft } from 'lucide-react';

export default function EditMonitorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'GET' as HttpMethod,
    headers: '{}',
    body: '',
    interval: 60,
    timeout: 10,
    expected_status: 200,
    retry_times: 5,
    warning_threshold: 3000,
    webhook_id: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [monitorData, webhooksData] = await Promise.all([
          monitorsApi.get(params.id),
          webhooksApi.list(),
        ]);
        setMonitor(monitorData);
        setWebhooks(webhooksData.items);
        setFormData({
          name: monitorData.name,
          url: monitorData.url,
          method: monitorData.method,
          headers: JSON.stringify(monitorData.headers || {}, null, 2),
          body: monitorData.body || '',
          interval: monitorData.interval,
          timeout: monitorData.timeout,
          expected_status: monitorData.expected_status,
          retry_times: monitorData.retry_times,
          warning_threshold: monitorData.warning_threshold,
          webhook_id: monitorData.webhook_id || '',
        });
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let headers = {};
      try {
        headers = JSON.parse(formData.headers);
      } catch {
        setError('Headers 必须是有效的 JSON 格式');
        setLoading(false);
        return;
      }

      await monitorsApi.update(params.id, {
        name: formData.name,
        url: formData.url,
        method: formData.method,
        headers,
        body: formData.body || undefined,
        interval: formData.interval,
        timeout: formData.timeout,
        expected_status: formData.expected_status,
        retry_times: formData.retry_times,
        warning_threshold: formData.warning_threshold,
        webhook_id: formData.webhook_id || undefined,
      });

      router.push(`/monitors/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
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
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/monitors/${params.id}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回详情
          </Link>
        </div>

        <div className="card">
          <div className="card-header">
            <h1 className="text-xl font-bold text-gray-900">编辑监控项</h1>
          </div>

          <form onSubmit={handleSubmit} className="card-body space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="label">名称 *</label>
              <input
                type="text"
                required
                maxLength={50}
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="label">URL *</label>
              <input
                type="url"
                required
                className="input"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">HTTP 方法</label>
                <select
                  className="input"
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value as HttpMethod })}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div>
                <label className="label">期望状态码</label>
                <input
                  type="number"
                  min={100}
                  max={599}
                  className="input"
                  value={formData.expected_status}
                  onChange={(e) => setFormData({ ...formData, expected_status: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">探测间隔 (秒)</label>
                <input
                  type="number"
                  min={30}
                  max={300}
                  className="input"
                  value={formData.interval}
                  onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="label">超时时间 (秒)</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  className="input"
                  value={formData.timeout}
                  onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">连续失败次数 (触发告警)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="input"
                  value={formData.retry_times}
                  onChange={(e) => setFormData({ ...formData, retry_times: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="label">响应时间警告阈值 (ms)</label>
                <input
                  type="number"
                  min={1000}
                  max={30000}
                  className="input"
                  value={formData.warning_threshold}
                  onChange={(e) => setFormData({ ...formData, warning_threshold: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="label">Headers (JSON 格式)</label>
              <textarea
                className="input font-mono text-sm"
                rows={3}
                value={formData.headers}
                onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
              />
            </div>

            {formData.method !== 'GET' && (
              <div>
                <label className="label">请求体</label>
                <textarea
                  className="input font-mono text-sm"
                  rows={3}
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="label">告警 Webhook</label>
              <select
                className="input"
                value={formData.webhook_id}
                onChange={(e) => setFormData({ ...formData, webhook_id: e.target.value })}
              >
                <option value="">不发送告警</option>
                {webhooks.map((webhook) => (
                  <option key={webhook.id} value={webhook.id}>
                    {webhook.name} {webhook.is_default ? '(默认)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <Link
                href={`/monitors/${params.id}`}
                className="btn-secondary"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}

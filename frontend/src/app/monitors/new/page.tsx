'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { monitorsApi, webhooksApi } from '@/lib/api';
import { Webhook, HttpMethod } from '@/types';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function NewMonitorPage() {
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlConfirm, setShowUrlConfirm] = useState(false);
  const [urlTestResult, setUrlTestResult] = useState<{ success: boolean; message: string } | null>(null);
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
    const fetchWebhooks = async () => {
      try {
        const response = await webhooksApi.list();
        setWebhooks(response.items);
        // Set default webhook if exists
        const defaultWebhook = response.items.find(w => w.is_default);
        if (defaultWebhook) {
          setFormData(prev => ({ ...prev, webhook_id: defaultWebhook.id }));
        }
      } catch (error) {
        console.error('Failed to fetch webhooks:', error);
      }
    };
    fetchWebhooks();
  }, []);

  // Test URL reachability
  const testUrlReachability = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const fetchOptions: RequestInit = {
        method: formData.method,
        signal: controller.signal,
        headers: {
          'User-Agent': 'ProjectHealthMonitor/1.0',
          ...safeJsonParse(formData.headers, {}),
        },
      };

      if (formData.body && ['POST', 'PUT'].includes(formData.method)) {
        fetchOptions.body = formData.body;
      }

      const response = await fetch(formData.url, fetchOptions);
      clearTimeout(timeoutId);

      if (response.status === formData.expected_status) {
        return { success: true, message: 'URL 可访问' };
      } else {
        return {
          success: false,
          message: `URL 返回状态码 ${response.status}，期望 ${formData.expected_status}`,
        };
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          return { success: false, message: 'URL 测试超时（5秒）' };
        }
        return { success: false, message: `无法访问: ${err.message}` };
      }
      return { success: false, message: 'URL 不可达' };
    }
  };

  const safeJsonParse = (json: string, defaultValue: Record<string, string>): Record<string, string> => {
    try {
      return JSON.parse(json) as Record<string, string>;
    } catch {
      return defaultValue;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate headers JSON
      let headers = {};
      try {
        headers = JSON.parse(formData.headers);
      } catch {
        setError('Headers 必须是有效的 JSON 格式');
        setLoading(false);
        return;
      }

      // Test URL reachability before saving
      if (!showUrlConfirm) {
        const testResult = await testUrlReachability();
        if (!testResult.success) {
          setUrlTestResult(testResult);
          setShowUrlConfirm(true);
          setLoading(false);
          return;
        }
      }

      await monitorsApi.create({
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

      router.push('/monitors');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmContinue = () => {
    setShowUrlConfirm(false);
    setLoading(true);
    // Re-submit the form, skipping the URL test
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(fakeEvent);
  };

  const handleCancelConfirm = () => {
    setShowUrlConfirm(false);
    setUrlTestResult(null);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/monitors"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回列表
          </Link>
        </div>

        <div className="card">
          <div className="card-header">
            <h1 className="text-xl font-bold text-gray-900">新建监控项</h1>
          </div>

          <form onSubmit={handleSubmit} className="card-body space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* URL Test Confirmation Modal */}
            {showUrlConfirm && urlTestResult && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                      URL 不可达
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      {urlTestResult.message}，是否继续保存？
                    </p>
                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={handleConfirmContinue}
                        className="px-3 py-1.5 text-sm font-medium text-yellow-800 bg-yellow-100 rounded-md hover:bg-yellow-200"
                      >
                        继续保存
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelConfirm}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800"
                      >
                        返回修改
                      </button>
                    </div>
                  </div>
                </div>
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
                placeholder="例如：用户服务API"
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
                placeholder="https://api.example.com/health"
              />
              <p className="mt-1 text-xs text-gray-500">
                保存前将自动测试 URL 是否可达
              </p>
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
                placeholder='{"Authorization": "Bearer token"}'
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
                  placeholder='{"key": "value"}'
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
                href="/monitors"
                className="btn-secondary"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}

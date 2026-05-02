'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { webhooksApi } from '@/lib/api';
import { Webhook } from '@/types';
import { ArrowLeft } from 'lucide-react';

export default function EditWebhookPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    webhook_url: '',
    at_users: '',
    is_default: false,
  });

  useEffect(() => {
    const fetchWebhook = async () => {
      try {
        const data = await webhooksApi.get(params.id);
        setWebhook(data);
        setFormData({
          name: data.name,
          webhook_url: data.webhook_url,
          at_users: data.at_users || '',
          is_default: data.is_default,
        });
      } catch (error) {
        console.error('Failed to fetch webhook:', error);
      } finally {
        setFetchLoading(false);
      }
    };
    fetchWebhook();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate webhook URL
    if (!formData.webhook_url.startsWith('https://qyapi.weixin.qq.com/cgi-bin/webhook/send')) {
      setError('Webhook URL 必须是企业微信机器人地址');
      setLoading(false);
      return;
    }

    try {
      await webhooksApi.update(params.id, formData);
      router.push('/webhooks');
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

  if (!webhook) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Webhook 不存在</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/webhooks"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回列表
          </Link>
        </div>

        <div className="card">
          <div className="card-header">
            <h1 className="text-xl font-bold text-gray-900">编辑 Webhook</h1>
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
              <label className="label">Webhook URL *</label>
              <input
                type="url"
                required
                className="input"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              />
            </div>

            <div>
              <label className="label">@成员手机号</label>
              <input
                type="text"
                className="input"
                value={formData.at_users}
                onChange={(e) => setFormData({ ...formData, at_users: e.target.value })}
                placeholder="13800138000,13800138001"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              />
              <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                设为默认 Webhook
              </label>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <Link
                href="/webhooks"
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

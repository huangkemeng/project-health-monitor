'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { webhooksApi } from '@/lib/api';
import { Webhook } from '@/types';
import { Plus, Edit, Trash2, Send, Star } from 'lucide-react';

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await webhooksApi.list();
      setWebhooks(response.items);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleTest = async (id: string) => {
    try {
      await webhooksApi.test(id);
      alert('测试消息已发送');
    } catch (error) {
      alert('测试失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个 Webhook 吗？')) return;
    try {
      await webhooksApi.delete(id);
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Webhook 配置</h1>
          <Link
            href="/webhooks/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            新建 Webhook
          </Link>
        </div>

        {/* Webhooks List */}
        <div className="card">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>暂无 Webhook 配置</p>
              <Link
                href="/webhooks/new"
                className="text-brand-600 hover:text-brand-500 font-medium mt-2 inline-block"
              >
                创建第一个 Webhook
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Send className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            {webhook.name}
                          </h3>
                          {webhook.is_default && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1" />
                              默认
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate max-w-md">
                          {webhook.webhook_url}
                        </p>
                        {webhook.at_users && (
                          <p className="text-xs text-gray-400 mt-1">
                            @成员: {webhook.at_users}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTest(webhook.id)}
                        className="btn-ghost text-sm"
                      >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">测试</span>
                      </button>
                      <Link
                        href={`/webhooks/${webhook.id}/edit`}
                        className="btn-ghost text-sm"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">编辑</span>
                      </Link>
                      <button
                        onClick={() => handleDelete(webhook.id)}
                        className="btn-ghost text-sm text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">删除</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

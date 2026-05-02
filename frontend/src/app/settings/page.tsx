'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { User, Lock } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' });
      setLoading(false);
      return;
    }

    if (passwordData.new_password.length < 8) {
      setMessage({ type: 'error', text: '新密码长度至少为8位' });
      setLoading(false);
      return;
    }

    try {
      await authApi.changePassword(passwordData);
      setMessage({ type: 'success', text: '密码修改成功' });
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '密码修改失败' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">个人设置</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 ${
                activeTab === 'profile'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="h-4 w-4" />
              个人信息
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 ${
                activeTab === 'password'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Lock className="h-4 w-4" />
              修改密码
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="card">
          <div className="card-body">
            {activeTab === 'profile' ? (
              <div className="space-y-6">
                <div>
                  <label className="label">用户名</label>
                  <input
                    type="text"
                    disabled
                    className="input bg-gray-50"
                    value={user?.username || ''}
                  />
                </div>
                <div>
                  <label className="label">邮箱</label>
                  <input
                    type="email"
                    disabled
                    className="input bg-gray-50"
                    value={user?.email || ''}
                  />
                </div>
                <div>
                  <label className="label">注册时间</label>
                  <input
                    type="text"
                    disabled
                    className="input bg-gray-50"
                    value={user?.created_at ? formatDate(user.created_at) : ''}
                  />
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-6">
                {message && (
                  <div className={`rounded-md p-4 text-sm ${
                    message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div>
                  <label className="label">原密码</label>
                  <input
                    type="password"
                    required
                    className="input"
                    value={passwordData.old_password}
                    onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">新密码</label>
                  <input
                    type="password"
                    required
                    className="input"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    placeholder="8-32字符，包含字母和数字"
                  />
                </div>

                <div>
                  <label className="label">确认新密码</label>
                  <input
                    type="password"
                    required
                    className="input"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? '保存中...' : '修改密码'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

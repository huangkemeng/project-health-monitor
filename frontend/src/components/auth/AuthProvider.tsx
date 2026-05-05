'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';

/**
 * AuthProvider - 认证状态恢复提供者
 * 在应用启动时从 localStorage 恢复认证状态
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const { token, fetchUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      // 如果有 token 但没有用户信息，尝试获取用户信息
      if (token && !isAuthenticated) {
        try {
          await fetchUser();
        } catch (error) {
          console.error('[Auth] Failed to restore session:', error);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [token, isAuthenticated, fetchUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}

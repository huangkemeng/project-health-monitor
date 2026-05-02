'use client';

import { useEffect } from 'react';

// Error classification
enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

interface ErrorInfo {
  type: ErrorType;
  title: string;
  message: string;
  action: string;
}

function classifyError(error: Error): ErrorInfo {
  const message = error.message?.toLowerCase() || '';

  // Network errors
  if (message.includes('fetch') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('failed to fetch')) {
    return {
      type: ErrorType.NETWORK,
      title: '网络连接失败',
      message: '无法连接到服务器，请检查您的网络连接',
      action: '重试'
    };
  }

  // Authentication errors
  if (message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('401') ||
      message.includes('403')) {
    return {
      type: ErrorType.AUTH,
      title: '会话已过期',
      message: '您的登录会话已过期，请重新登录',
      action: '重新登录'
    };
  }

  // Server errors
  if (message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('server error')) {
    return {
      type: ErrorType.SERVER,
      title: '服务器错误',
      message: '服务器暂时不可用，请稍后再试',
      action: '重试'
    };
  }

  // Unknown errors
  return {
    type: ErrorType.UNKNOWN,
    title: '出错了',
    message: error.message || '页面加载时发生错误',
    action: '重试'
  };
}

// Send error to logging service (placeholder for Sentry or similar)
function reportError(error: Error, errorInfo?: { componentStack?: string }) {
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with Sentry or other error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  // Always log to console in development
  console.error('Error Boundary caught an error:', error);
  if (errorInfo?.componentStack) {
    console.error('Component stack:', errorInfo.componentStack);
  }
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const errorInfo = classifyError(error);

  useEffect(() => {
    reportError(error);
  }, [error]);

  // Handle auth errors by redirecting to login
  const handleAction = () => {
    if (errorInfo.type === ErrorType.AUTH) {
      window.location.href = '/login';
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {errorInfo.title}
        </h2>

        {/* Error Message */}
        <p className="text-gray-600 mb-2">
          {errorInfo.message}
        </p>

        {/* Error ID (for support) */}
        {error.digest && (
          <p className="text-xs text-gray-400 mb-6">
            错误ID: {error.digest}
          </p>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleAction}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
          >
            {errorInfo.action}
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
          >
            返回首页
          </button>
        </div>

        {/* Support Link */}
        <p className="mt-6 text-sm text-gray-500">
          如果问题持续存在，请联系技术支持
        </p>
      </div>
    </div>
  );
}

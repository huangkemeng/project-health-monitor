'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEvents } from '@/lib/error-events';

export function GlobalErrorHandler() {
  const { toast } = useToast();
  const toastRef = useRef(toast);

  // 保持 toast 引用的最新值
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    const unsubscribe = errorEvents.subscribe((message, type) => {
      toastRef.current({
        title: type === 'warning' ? '请求过于频繁' : '错误',
        description: message,
        variant: type === 'warning' ? 'default' : 'destructive',
      });
    });

    return () => {
      unsubscribe();
    };
  }, []); // 空依赖数组，只在挂载时订阅一次

  return null;
}

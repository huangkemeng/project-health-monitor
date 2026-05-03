'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEvents } from '@/lib/error-events';

export function GlobalErrorHandler() {
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = errorEvents.subscribe((message, type) => {
      toast({
        title: type === 'warning' ? '请求过于频繁' : '错误',
        description: message,
        variant: type === 'warning' ? 'default' : 'destructive',
      });
    });

    return () => {
      unsubscribe();
    };
  }, [toast]);

  return null;
}

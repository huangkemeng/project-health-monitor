'use client';

import { useCallback, useRef } from 'react';

/**
 * Throttle hook - limits the callback to be called at most once per delay period
 * @param callback The callback to throttle
 * @param delay The delay in milliseconds
 * @returns The throttled callback
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRun = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRun.current >= delay) {
        // Execute immediately if enough time has passed
        lastRun.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        // Schedule execution at the end of the delay period
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now();
          timeoutRef.current = null;
          callback(...args);
        }, delay - (now - lastRun.current));
      }
    },
    [callback, delay]
  );
}

/**
 * Throttle with leading and trailing options
 * @param callback The callback to throttle
 * @param delay The delay in milliseconds
 * @param options.leading Execute on the leading edge
 * @param options.trailing Execute on the trailing edge
 * @returns The throttled callback
 */
export function useThrottleWithOptions<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = { leading: true, trailing: false }
): (...args: Parameters<T>) => void {
  const lastRun = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgs = useRef<Parameters<T> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      lastArgs.current = args;

      const execute = () => {
        lastRun.current = Date.now();
        timeoutRef.current = null;
        callback(...(lastArgs.current || args));
      };

      if (now - lastRun.current >= delay) {
        if (options.leading !== false) {
          execute();
        } else {
          lastRun.current = now;
        }
      }

      if (options.trailing !== false && !timeoutRef.current) {
        timeoutRef.current = setTimeout(execute, delay);
      }
    },
    [callback, delay, options.leading, options.trailing]
  );
}

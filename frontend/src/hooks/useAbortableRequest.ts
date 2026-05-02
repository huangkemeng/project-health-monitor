'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing abortable requests
 * Automatically aborts pending requests when component unmounts
 * or when a new request is initiated
 */
export function useAbortableRequest() {
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Get a new AbortSignal, aborting any previous request
   */
  const getSignal = useCallback((): AbortSignal => {
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);

  /**
   * Abort the current request
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Check if the current request was aborted
   */
  const isAborted = useCallback((): boolean => {
    return abortControllerRef.current?.signal.aborted ?? false;
  }, []);

  return {
    getSignal,
    abort,
    isAborted,
  };
}

/**
 * Hook for managing multiple abortable requests with different keys
 */
export function useAbortableRequests() {
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  // Cleanup all on unmount
  useEffect(() => {
    return () => {
      controllersRef.current.forEach((controller) => {
        controller.abort();
      });
      controllersRef.current.clear();
    };
  }, []);

  /**
   * Get a new AbortSignal for a specific key
   */
  const getSignal = useCallback((key: string): AbortSignal => {
    // Abort existing request for this key
    const existingController = controllersRef.current.get(key);
    if (existingController) {
      existingController.abort();
    }

    // Create new controller
    const newController = new AbortController();
    controllersRef.current.set(key, newController);
    return newController.signal;
  }, []);

  /**
   * Abort a specific request by key
   */
  const abort = useCallback((key: string) => {
    const controller = controllersRef.current.get(key);
    if (controller) {
      controller.abort();
      controllersRef.current.delete(key);
    }
  }, []);

  /**
   * Abort all requests
   */
  const abortAll = useCallback(() => {
    controllersRef.current.forEach((controller) => {
      controller.abort();
    });
    controllersRef.current.clear();
  }, []);

  return {
    getSignal,
    abort,
    abortAll,
  };
}

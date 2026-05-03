import { AxiosError } from 'axios';

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return '发生未知错误，请稍后重试';
}

export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'RateLimitError' || 
           (typeof error.message === 'string' && error.message.includes('请求过于频繁'));
  }
  
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    return axiosError.response?.status === 429 ||
           axiosError.response?.data?.code === 'RATE_LIMIT_EXCEEDED';
  }
  
  return false;
}

export function isAuthError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as AxiosError;
    return axiosError.response?.status === 401;
  }
  return false;
}

export function getErrorTitle(error: unknown): string {
  if (isRateLimitError(error)) {
    return '请求过于频繁';
  }
  
  if (isAuthError(error)) {
    return '登录已过期';
  }
  
  return '操作失败';
}

export function getErrorDescription(error: unknown): string {
  const message = getErrorMessage(error);
  
  if (isRateLimitError(error)) {
    return message || '您的操作过于频繁，请稍后再试';
  }
  
  if (isAuthError(error)) {
    return '您的登录已过期，请重新登录';
  }
  
  return message || '操作未能完成，请稍后重试';
}

export function getErrorVariant(error: unknown): 'default' | 'destructive' | 'success' {
  if (isRateLimitError(error)) {
    return 'default'; // Use default (blue) for rate limit, not red
  }
  
  return 'destructive';
}

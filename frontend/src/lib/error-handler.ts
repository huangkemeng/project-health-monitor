import { AxiosError } from 'axios';

export interface ApiError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: ApiError[];
}

// Custom API exception
export class ApiException extends Error {
  constructor(
    message: string,
    public code: number,
    public errors?: ApiError[]
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

export function getErrorMessage(error: unknown): string {
  // 优先处理 ApiException，获取字段级错误信息
  if (error instanceof ApiException) {
    if (error.errors && error.errors.length > 0) {
      return error.errors.map(e => e.message).join('\n');
    }
    return error.message;
  }

  // 处理 AxiosError，尝试从响应中提取字段级错误
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const responseData = axiosError.response?.data;
    if (responseData?.errors && responseData.errors.length > 0) {
      return responseData.errors.map(e => e.message).join('\n');
    }
    if (responseData?.message) {
      return responseData.message;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return '发生未知错误，请稍后重试';
}

export function getFieldErrors(error: unknown): ApiError[] | undefined {
  if (error instanceof ApiException) {
    return error.errors;
  }

  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    return axiosError.response?.data?.errors;
  }

  return undefined;
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
    // 排除登录接口的 401 错误（用户名或密码错误），只处理 token 过期的 401
    const isLoginEndpoint = axiosError.config?.url?.includes('/auth/login');
    return axiosError.response?.status === 401 && !isLoginEndpoint;
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

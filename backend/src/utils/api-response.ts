import type { Response } from 'express';
import type { ApiResponse, ApiError } from '../types';

/**
 * Send success response
 */
export function success<T>(res: Response, data: T, message = 'success', code = 200): void {
  const response: ApiResponse<T> = {
    code,
    message,
    data
  };
  res.status(code).json(response);
}

/**
 * Send error response
 */
export function error(
  res: Response, 
  message: string, 
  code = 400, 
  errors?: ApiError[]
): void {
  const response: ApiResponse = {
    code,
    message,
    errors
  };
  res.status(code).json(response);
}

/**
 * Send created response
 */
export function created<T>(res: Response, data: T, message = '创建成功'): void {
  success(res, data, message, 201);
}

/**
 * Send not found response
 */
export function notFound(res: Response, message = '资源不存在'): void {
  error(res, message, 404);
}

/**
 * Send unauthorized response
 */
export function unauthorized(res: Response, message = '未认证'): void {
  error(res, message, 401);
}

/**
 * Send forbidden response
 */
export function forbidden(res: Response, message = '无权访问'): void {
  error(res, message, 403);
}

/**
 * Send validation error response
 */
export function validationError(res: Response, errors: ApiError[]): void {
  error(res, '请求参数错误', 400, errors);
}

/**
 * Send internal server error response
 */
export function serverError(res: Response, message = '服务器内部错误'): void {
  error(res, message, 500);
}

import type { Request, Response, NextFunction } from 'express';
import { serverError } from '../utils/api-response';

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      code: 400,
      message: '验证错误',
      errors: [{ field: 'unknown', message: err.message }]
    });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      code: 401,
      message: '未授权'
    });
    return;
  }

  // Default server error
  serverError(res, process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误');
}

/**
 * 404 handler middleware
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    code: 404,
    message: '接口不存在'
  });
}

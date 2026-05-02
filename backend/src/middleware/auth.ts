import type { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../lib/auth';
import { unauthorized } from '../utils/api-response';
import type { JwtPayload } from '../types';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    unauthorized(res, '未提供认证令牌');
    return;
  }

  const payload = await verifyToken(token);
  
  if (!payload) {
    unauthorized(res, '认证令牌无效或已过期');
    return;
  }

  req.user = payload;
  next();
}

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't require it
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}

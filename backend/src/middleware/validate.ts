import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { validationError } from '../utils/api-response';

/**
 * Validation middleware
 * Checks for validation errors from express-validator
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    validationError(
      res,
      errors.array().map((e) => ({
        field: e.type === 'field' ? e.path : 'unknown',
        message: e.msg,
      }))
    );
    return;
  }
  next();
}

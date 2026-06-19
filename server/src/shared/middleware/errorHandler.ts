import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, field: err.field },
    });
    return;
  }

  if (err instanceof ZodError) {
    const zodErr = err as ZodError;
    const first = zodErr.errors[0];
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: first.message,
        field: first.path.join('.') || null,
      },
    });
    return;
  }

  interface MongoServerError { code?: number; keyPattern?: Record<string, unknown>; }
  if ((err as MongoServerError).code === 11000) {
    const field = Object.keys(((err as MongoServerError).keyPattern) ?? {})[0] ?? null;
    res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `A record with this ${field} already exists.`,
        field,
      },
    });
    return;
  }

  console.error('[INTERNAL ERROR]', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: 'An unexpected error occurred.', field: null },
  });
}

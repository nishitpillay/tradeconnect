/**
 * Global Error Handler Middleware
 *
 * Must be registered LAST in Express (after all routes).
 * Converts AppError and unexpected errors into consistent JSON responses.
 *
 * Response format:
 * {
 *   "error": {
 *     "code": "EMAIL_ALREADY_EXISTS",
 *     "message": "An account with this email already exists.",
 *     "details": {},          // optional
 *     "request_id": "uuid"    // from X-Request-ID header
 *   }
 * }
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string | undefined;

  // ── AppError (known, intentional) ─────────────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code:       err.code,
        message:    err.message,
        ...(err.details && { details: err.details }),
        ...(requestId && { request_id: requestId }),
      },
    });
    return;
  }

  // ── Zod validation error (schema mismatch — should be caught by middleware) ─
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code:    'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: {
          fields: err.errors.map((e) => ({
            path:    e.path.join('.'),
            message: e.message,
          })),
        },
        ...(requestId && { request_id: requestId }),
      },
    });
    return;
  }

  // ── PostgreSQL errors ──────────────────────────────────────────────────────
  const pgError = err as { code?: string; constraint?: string; detail?: string };
  if (pgError.code) {
    switch (pgError.code) {
      case '23505': { // unique_violation
        res.status(409).json({
          error: {
            code:    'CONFLICT',
            message: 'A record with this value already exists.',
            ...(env.NODE_ENV !== 'production' && { detail: pgError.detail }),
            ...(requestId && { request_id: requestId }),
          },
        });
        return;
      }
      case '23503': { // foreign_key_violation
        res.status(400).json({
          error: {
            code:    'INVALID_REFERENCE',
            message: 'Referenced record does not exist.',
            ...(requestId && { request_id: requestId }),
          },
        });
        return;
      }
      case 'P0001': { // raise_exception (from our DB triggers, e.g. invalid status transition)
        res.status(422).json({
          error: {
            code:    'DB_CONSTRAINT',
            message: err.message,
            ...(requestId && { request_id: requestId }),
          },
        });
        return;
      }
    }
  }

  // ── Unknown / unexpected error ─────────────────────────────────────────────
  console.error('[ERROR]', {
    message:    err.message,
    stack:      err.stack,
    request_id: requestId,
    method:     req.method,
    path:       req.path,
  });

  res.status(500).json({
    error: {
      code:    'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again.'
        : err.message,
      ...(requestId && { request_id: requestId }),
    },
  });
}

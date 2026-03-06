import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { env } from '../config/env';
import { contextualLogger } from '../observability/logger';
import { Sentry } from '../observability/sentry';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId;
  const correlationId = req.correlationId;

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
        ...(requestId && { request_id: requestId }),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: {
          fields: err.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        ...(requestId && { request_id: requestId }),
      },
    });
    return;
  }

  const pgError = err as { code?: string; detail?: string };
  if (pgError.code === '23505') {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A record with this value already exists.',
        ...(env.NODE_ENV !== 'production' && { detail: pgError.detail }),
        ...(requestId && { request_id: requestId }),
      },
    });
    return;
  }

  if (pgError.code === '23503') {
    res.status(400).json({
      error: {
        code: 'INVALID_REFERENCE',
        message: 'Referenced record does not exist.',
        ...(requestId && { request_id: requestId }),
      },
    });
    return;
  }

  if (pgError.code === 'P0001') {
    res.status(422).json({
      error: {
        code: 'DB_CONSTRAINT',
        message: err.message,
        ...(requestId && { request_id: requestId }),
      },
    });
    return;
  }

  contextualLogger({ component: 'error-handler' }).error(
    {
      err,
      requestId,
      correlationId,
      method: req.method,
      path: req.path,
    },
    'Unhandled API error'
  );

  Sentry.captureException(err, {
    tags: {
      requestId: requestId ?? 'unknown',
      correlationId: correlationId ?? 'unknown',
    },
    extra: {
      method: req.method,
      path: req.path,
    },
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again.'
        : err.message,
      ...(requestId && { request_id: requestId }),
    },
  });
}

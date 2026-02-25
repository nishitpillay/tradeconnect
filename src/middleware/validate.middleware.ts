/**
 * Request Validation Middleware
 *
 * Wraps Zod schemas to validate req.body, req.query, or req.params.
 * On failure: throws a structured 400 error directly (no next(err) for Zod —
 * the response is immediate so the client gets clear field-level feedback).
 *
 * Usage:
 *   router.post('/jobs', validate(CreateJobSchema), jobsController.create)
 *   router.get('/jobs',  validateQuery(JobFeedQuerySchema), jobsController.list)
 */

import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodTypeDef, ZodError } from 'zod';

function formatZodError(err: ZodError): { path: string; message: string }[] {
  return err.errors.map((e) => ({
    path:    e.path.join('.') || 'root',
    message: e.message,
  }));
}

/** Validate req.body */
export function validate<T>(schema: ZodType<T, ZodTypeDef, unknown>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: {
          code:    'VALIDATION_ERROR',
          message: 'Request body validation failed.',
          details: { fields: formatZodError(result.error) },
        },
      });
      return;
    }
    // Replace body with coerced/transformed values
    req.body = result.data;
    next();
  };
}

/** Validate req.query */
export function validateQuery<T>(schema: ZodType<T, ZodTypeDef, unknown>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: {
          code:    'VALIDATION_ERROR',
          message: 'Query parameter validation failed.',
          details: { fields: formatZodError(result.error) },
        },
      });
      return;
    }
    // Attach parsed query to req for downstream use
    (req as Request & { parsedQuery: T }).parsedQuery = result.data;
    next();
  };
}

/** Validate req.params */
export function validateParams<T>(schema: ZodType<T, ZodTypeDef, unknown>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: {
          code:    'VALIDATION_ERROR',
          message: 'Path parameter validation failed.',
          details: { fields: formatZodError(result.error) },
        },
      });
      return;
    }
    next();
  };
}

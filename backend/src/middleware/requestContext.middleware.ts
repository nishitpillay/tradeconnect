import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { withRequestContext } from '../observability/request-context';

function getHeader(req: Request, key: string): string | undefined {
  const value = req.headers[key];
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return undefined;
}

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = getHeader(req, 'x-request-id') ?? randomUUID();
  const correlationId = getHeader(req, 'x-correlation-id') ?? requestId;

  req.requestId = requestId;
  req.correlationId = correlationId;

  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Correlation-Id', correlationId);

  withRequestContext({ requestId, correlationId }, () => next());
}

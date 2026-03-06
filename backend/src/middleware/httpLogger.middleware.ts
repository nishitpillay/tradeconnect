import pinoHttp from 'pino-http';
import { logger } from '../observability/logger';

export const httpLoggerMiddleware = pinoHttp({
  logger,
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'durationMs',
  },
  customProps: (req) => ({
    requestId: (req as unknown as Express.Request).requestId,
    correlationId: (req as unknown as Express.Request).correlationId,
  }),
  customSuccessMessage: (req, res) => `${req.method} ${req.url} completed with ${res.statusCode}`,
  customErrorMessage: (req, res, error) =>
    `${req.method} ${req.url} failed with ${res.statusCode}: ${error.message}`,
});

import pino from 'pino';
import { env } from '../config/env';
import { getRequestContext } from './request-context';

const isProd = env.NODE_ENV === 'production';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: 'tradeconnect-backend',
    env: env.NODE_ENV,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.x-csrf-token',
      '*.password',
      '*.token',
      '*.refresh_token',
      '*.csrf_token',
    ],
    remove: true,
  },
  ...(isProd ? {} : {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: true,
      },
    },
  }),
});

export function contextualLogger(bindings?: Record<string, unknown>) {
  const ctx = getRequestContext();
  return logger.child({
    ...(ctx ? { requestId: ctx.requestId, correlationId: ctx.correlationId } : {}),
    ...(bindings ?? {}),
  });
}

import * as Sentry from '@sentry/node';
import { env } from '../config/env';

let initialized = false;

export function initSentry(serviceName: string): void {
  if (initialized || !env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: process.env.npm_package_version,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    profilesSampleRate: env.SENTRY_PROFILES_SAMPLE_RATE,
    serverName: serviceName,
  });

  initialized = true;
}

export { Sentry };

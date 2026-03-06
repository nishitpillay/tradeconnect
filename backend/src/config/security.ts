import cors, { CorsOptions } from 'cors';
import helmet, { HelmetOptions } from 'helmet';

type RuntimeMode = 'development' | 'staging' | 'production' | 'test';

export interface SecurityEnv {
  NODE_ENV: RuntimeMode;
  CORS_ORIGINS: string;
  CORS_ORIGINS_DEVELOPMENT?: string;
  CORS_ORIGINS_STAGING?: string;
  CORS_ORIGINS_PRODUCTION?: string;
}

const CORS_ENV_MAP: Record<RuntimeMode, keyof SecurityEnv | null> = {
  development: 'CORS_ORIGINS_DEVELOPMENT',
  staging: 'CORS_ORIGINS_STAGING',
  production: 'CORS_ORIGINS_PRODUCTION',
  test: null,
};

export function parseOriginList(originsCsv: string): string[] {
  return originsCsv
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => origin.replace(/\/+$/, ''));
}

export function resolveCorsAllowedOrigins(securityEnv: SecurityEnv): string[] {
  const envKey = CORS_ENV_MAP[securityEnv.NODE_ENV];
  const envSpecific =
    envKey && typeof securityEnv[envKey] === 'string'
      ? String(securityEnv[envKey] ?? '').trim()
      : '';

  const source = envSpecific || securityEnv.CORS_ORIGINS;
  return parseOriginList(source);
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    // Allow requests with no browser-origin header (CLI/health checks/server-to-server).
    return true;
  }
  const normalized = origin.replace(/\/+$/, '');
  return allowedOrigins.includes(normalized);
}

export function buildCorsOptions(allowedOrigins: string[]): CorsOptions {
  return {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Correlation-Id',
      'X-CSRF-Token',
      'X-Device-Id',
    ],
    exposedHeaders: ['X-Request-Id', 'X-Correlation-Id', 'Retry-After'],
    maxAge: 600,
    optionsSuccessStatus: 204,
  };
}

export function buildHelmetConfig(
  nodeEnv: RuntimeMode,
  allowedOrigins: string[]
): HelmetOptions {
  const connectSrc = ["'self'", ...allowedOrigins];

  return {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc,
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    frameguard: { action: 'deny' },
    hsts: nodeEnv === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    noSniff: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    hidePoweredBy: true,
    xDnsPrefetchControl: { allow: false },
  };
}

export function securityMiddlewares(nodeEnv: RuntimeMode, allowedOrigins: string[]) {
  return {
    helmet: helmet(buildHelmetConfig(nodeEnv, allowedOrigins)),
    cors: cors(buildCorsOptions(allowedOrigins)),
  };
}


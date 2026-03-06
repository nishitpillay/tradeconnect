import 'dotenv/config';
import { z } from 'zod';

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value === 'string' && value.trim() === '') return undefined;
    return value;
  },
  z.string().url().optional()
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_BASE_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  SLOW_QUERY_MS: z.coerce.number().int().min(0).default(300),
  DB_ENCRYPTION_KEY: z.string().min(32),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('1h'),
  REFRESH_TOKEN_EXPIRY: z.string().default('30d'),

  AWS_REGION: z.string().default('ap-southeast-2'),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  CDN_BASE_URL: z.string().url(),
  S3_ENDPOINT: optionalUrl,
  S3_PRESIGN_EXPIRY_SECONDS: z.coerce.number().int().default(3600),

  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),

  GOOGLE_MAPS_API_KEY: z.string().min(1),

  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  QUEUE_PREFIX: z.string().default('tc:'),

  RATE_LIMIT_JOB_POST_DAILY: z.coerce.number().int().default(3),
  RATE_LIMIT_JOB_POST_WEEKLY: z.coerce.number().int().default(10),
  RATE_LIMIT_QUOTE_DAILY: z.coerce.number().int().default(20),
  RATE_LIMIT_QUOTE_WEEKLY: z.coerce.number().int().default(100),
  RATE_LIMIT_MESSAGE_PER_HOUR: z.coerce.number().int().default(60),
  RATE_LIMIT_LOGIN_PER_15MIN: z.coerce.number().int().default(5),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SENTRY_DSN: optionalUrl,
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.2),
  SENTRY_PROFILES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.0),
  OTEL_ENABLED: z.coerce.boolean().default(true),
  OTEL_SERVICE_NAME: z.string().default('tradeconnect-backend'),
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl,
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
  NOTIFICATIONS_USE_QUEUE: z.coerce.boolean().default(true),

  JOB_EXPIRY_DAYS: z.coerce.number().int().default(30),
  QUOTE_EXPIRY_DAYS: z.coerce.number().int().default(14),
  REVIEW_WINDOW_DAYS: z.coerce.number().int().default(60),
  MESSAGE_RETENTION_MONTHS: z.coerce.number().int().default(24),

  PII_VIOLATIONS_BEFORE_FLAG: z.coerce.number().int().default(3),
  PII_VIOLATIONS_BEFORE_SUSPEND: z.coerce.number().int().default(5),
});

let _env: z.infer<typeof envSchema>;

try {
  _env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const formatted = error.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
    console.error(`\nEnvironment configuration invalid:\n${formatted}\n`);
  } else {
    console.error('Environment parse error:', error);
  }
  process.exit(1);
}

export const env = _env;
export type Env = typeof _env;

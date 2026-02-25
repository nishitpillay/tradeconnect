/**
 * Environment Configuration
 *
 * Validated at process startup with Zod.
 * The app will THROW and refuse to start if any required variable is missing
 * or malformed. This prevents silent misconfiguration in production.
 *
 * Import `env` (not process.env) everywhere in the application.
 */

import 'dotenv/config';
import { z } from 'zod';

// ─── Schema ───────────────────────────────────────────────────────────────────

const envSchema = z.object({
  // App
  NODE_ENV:   z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT:       z.coerce.number().int().min(1).max(65535).default(3000),
  API_BASE_URL: z.string().url(),

  // Database
  DATABASE_URL:       z.string().min(1, 'DATABASE_URL is required'),
  DB_POOL_MAX:        z.coerce.number().int().min(1).max(100).default(10),
  SLOW_QUERY_MS:      z.coerce.number().int().min(0).default(300),
  DB_ENCRYPTION_KEY:  z.string().min(32, 'DB_ENCRYPTION_KEY must be >= 32 characters'),

  // Auth
  JWT_SECRET:           z.string().min(32, 'JWT_SECRET must be >= 32 characters'),
  JWT_EXPIRY:           z.string().default('1h'),
  REFRESH_TOKEN_EXPIRY: z.string().default('30d'),

  // AWS
  AWS_REGION:         z.string().default('ap-southeast-2'),
  AWS_ACCESS_KEY_ID:  z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME:     z.string().min(1),
  CDN_BASE_URL:       z.string().url(),
  S3_ENDPOINT:        z.string().url().optional(),
  S3_PRESIGN_EXPIRY_SECONDS: z.coerce.number().int().default(3600),

  // Firebase
  FIREBASE_PROJECT_ID:   z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY:  z.string().min(1),

  // Google Maps
  GOOGLE_MAPS_API_KEY: z.string().min(1),

  // Redis
  REDIS_URL:    z.string().url().default('redis://localhost:6379'),
  QUEUE_PREFIX: z.string().default('tc:'),

  // Rate limits
  RATE_LIMIT_JOB_POST_DAILY:    z.coerce.number().int().default(3),
  RATE_LIMIT_JOB_POST_WEEKLY:   z.coerce.number().int().default(10),
  RATE_LIMIT_QUOTE_DAILY:       z.coerce.number().int().default(20),
  RATE_LIMIT_QUOTE_WEEKLY:      z.coerce.number().int().default(100),
  RATE_LIMIT_MESSAGE_PER_HOUR:  z.coerce.number().int().default(60),
  RATE_LIMIT_LOGIN_PER_15MIN:   z.coerce.number().int().default(5),

  // Observability
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SENTRY_DSN: z.string().url().optional(),

  // Job lifecycle
  JOB_EXPIRY_DAYS:          z.coerce.number().int().default(30),
  QUOTE_EXPIRY_DAYS:        z.coerce.number().int().default(14),
  REVIEW_WINDOW_DAYS:       z.coerce.number().int().default(60),
  MESSAGE_RETENTION_MONTHS: z.coerce.number().int().default(24),

  // PII detection
  PII_VIOLATIONS_BEFORE_FLAG:    z.coerce.number().int().default(3),
  PII_VIOLATIONS_BEFORE_SUSPEND: z.coerce.number().int().default(5),
});

// ─── Parse + export ───────────────────────────────────────────────────────────

let _env: z.infer<typeof envSchema>;

try {
  _env = envSchema.parse(process.env);
} catch (err) {
  if (err instanceof z.ZodError) {
    const formatted = err.errors
      .map(e => `  • ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    console.error(`\n❌ Environment configuration invalid:\n${formatted}\n`);
  } else {
    console.error('❌ Environment parse error:', err);
  }
  process.exit(1);
}

export const env = _env;
export type Env = typeof _env;

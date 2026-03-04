/**
 * Rate Limiting Middleware
 *
 * Two-layer approach:
 *   1. Redis-based IP rate limiting (pre-auth, fast)     — for login/register
 *   2. DB-based per-user action counting (authenticated) — for jobs/quotes/messages
 *
 * DB layer uses the rate_limit_events table (sliding window via upsert).
 * Window size is calculated by truncating NOW() to the window duration.
 *
 * On limit exceeded: 429 with Retry-After header.
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { redisRateLimit } from '../config/redis';
import { env } from '../config/env';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionKey =
  | 'post_job'
  | 'post_job_weekly'
  | 'submit_quote'
  | 'submit_quote_weekly'
  | 'send_message'
  | 'send_message_global'
  | 'login_attempt'
  | 'register'
  | 'password_reset'
  | 'phone_otp'
  | 'submit_report'
  | 'upload_file';

interface RateLimitConfig {
  actionKey: ActionKey;
  max:       number;
  windowMs:  number;  // milliseconds
}

// ─── DB-based rate limiter (authenticated users) ──────────────────────────────

async function checkDbRateLimit(
  userId: string,
  actionKey: ActionKey,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; count: number; windowStart: Date }> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const result = await db.query<{ count: string }>(
    `INSERT INTO rate_limit_events (user_id, action_key, window_start, count)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (user_id, action_key, window_start)
     DO UPDATE SET count = rate_limit_events.count + 1
     RETURNING count`,
    [userId, actionKey, windowStart]
  );

  const count = parseInt(result.rows[0].count, 10);
  return { allowed: count <= max, count, windowStart };
}

/** Factory: create an Express middleware for a specific authenticated action. */
export function dbRateLimit(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next();
      return;
    }

    try {
      const { allowed, windowStart } = await checkDbRateLimit(
        req.user.userId,
        config.actionKey,
        config.max,
        config.windowMs
      );

      if (!allowed) {
        const windowEndMs = windowStart.getTime() + config.windowMs;
        const retryAfterSeconds = Math.ceil((windowEndMs - Date.now()) / 1000);

        res.set('Retry-After', String(retryAfterSeconds));
        res.status(429).json({
          error: {
            code:    'RATE_LIMIT_EXCEEDED',
            message: `Too many ${config.actionKey.replace(/_/g, ' ')} requests. ` +
                     `Please wait ${retryAfterSeconds} seconds.`,
            details: { retry_after_seconds: retryAfterSeconds },
          },
        });
        return;
      }

      next();
    } catch (err) {
      // If rate limit check fails (DB down), allow the request through
      // (fail open) — don't block users due to infrastructure issues.
      console.error('[RateLimit] DB check failed, allowing request:', err);
      next();
    }
  };
}

// ─── Redis-based IP rate limiter (for auth endpoints) ─────────────────────────

/** IP-level rate limiter using Redis. Used for login, register, OTP. */
export function ipRateLimit(
  actionKey: string,
  maxRequests: number,
  windowSeconds: number
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? 'unknown';

    try {
      const { allowed, remaining, resetAt } = await redisRateLimit(
        `ip:${ip}:${actionKey}`,
        windowSeconds,
        maxRequests
      );

      res.set({
        'X-RateLimit-Limit':     String(maxRequests),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset':     String(Math.ceil(resetAt.getTime() / 1000)),
      });

      if (!allowed) {
        const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
        res.set('Retry-After', String(retryAfter));
        res.status(429).json({
          error: {
            code:    'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Please wait ${retryAfter} seconds.`,
            details: { retry_after_seconds: retryAfter },
          },
        });
        return;
      }

      next();
    } catch {
      // Redis down: fail open
      next();
    }
  };
}

// ─── Pre-configured limiters ──────────────────────────────────────────────────

const ONE_DAY_MS  = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;
const ONE_HOUR_MS = 60 * 60 * 1000;

/** POST /jobs — customer posting jobs */
export const jobPostDailyLimit  = dbRateLimit({
  actionKey: 'post_job',
  max:       env.RATE_LIMIT_JOB_POST_DAILY,
  windowMs:  ONE_DAY_MS,
});

export const jobPostWeeklyLimit = dbRateLimit({
  actionKey: 'post_job_weekly',
  max:       env.RATE_LIMIT_JOB_POST_WEEKLY,
  windowMs:  ONE_WEEK_MS,
});

/** POST /jobs/:id/quotes — provider submitting quotes */
export const quoteSubmitDailyLimit  = dbRateLimit({
  actionKey: 'submit_quote',
  max:       env.RATE_LIMIT_QUOTE_DAILY,
  windowMs:  ONE_DAY_MS,
});

export const quoteSubmitWeeklyLimit = dbRateLimit({
  actionKey: 'submit_quote_weekly',
  max:       env.RATE_LIMIT_QUOTE_WEEKLY,
  windowMs:  ONE_WEEK_MS,
});

/** POST /conversations/:id/messages — per-conversation hourly limit */
export const messageHourlyLimit = dbRateLimit({
  actionKey: 'send_message',
  max:       env.RATE_LIMIT_MESSAGE_PER_HOUR,
  windowMs:  ONE_HOUR_MS,
});

/** POST /auth/login — IP-based */
export const loginIpLimit = ipRateLimit(
  'login',
  env.RATE_LIMIT_LOGIN_PER_15MIN,
  15 * 60   // 15 minutes
);

/** POST /auth/register — IP-based */
export const registerIpLimit = ipRateLimit('register', 5, 60 * 60);

/** POST /auth/forgot-password — email-scoped */
export const passwordResetLimit = dbRateLimit({
  actionKey: 'password_reset',
  max:       3,
  windowMs:  ONE_HOUR_MS,
});

/** POST /auth/request-phone-otp — phone-scoped (handled in service) */
export const phoneOtpLimit = dbRateLimit({
  actionKey: 'phone_otp',
  max:       3,
  windowMs:  10 * 60 * 1000,   // 10 minutes
});

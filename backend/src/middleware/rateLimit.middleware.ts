import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { redisRateLimit } from '../config/redis';
import { env } from '../config/env';

type ActionKey =
  | 'post_job'
  | 'post_job_weekly'
  | 'submit_quote'
  | 'submit_quote_weekly'
  | 'send_message'
  | 'list_messages'
  | 'list_conversations'
  | 'browse_feed'
  | 'phone_otp';

interface DbRateLimitConfig {
  actionKey: ActionKey;
  max: number;
  windowMs: number;
}

interface PolicyItem {
  route: string;
  bucket: 'ip' | 'user';
  actionKey: string;
  limit: number;
  windowSeconds: number;
  purpose: string;
}

const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

export const rateLimitPolicyMatrix: PolicyItem[] = [
  {
    route: 'POST /api/v1/auth/login',
    bucket: 'ip',
    actionKey: 'login',
    limit: env.RATE_LIMIT_LOGIN_PER_15MIN,
    windowSeconds: 15 * 60,
    purpose: 'Brute-force login protection',
  },
  {
    route: 'POST /api/v1/auth/register',
    bucket: 'ip',
    actionKey: 'register',
    limit: env.RATE_LIMIT_REGISTER_PER_HOUR,
    windowSeconds: 60 * 60,
    purpose: 'Abuse prevention for account creation',
  },
  {
    route: 'POST /api/v1/auth/forgot-password',
    bucket: 'ip',
    actionKey: 'password_reset',
    limit: env.RATE_LIMIT_PASSWORD_RESET_PER_HOUR,
    windowSeconds: 60 * 60,
    purpose: 'Password-reset abuse protection',
  },
  {
    route: 'POST /api/v1/auth/phone/request-otp',
    bucket: 'user',
    actionKey: 'phone_otp',
    limit: env.RATE_LIMIT_PHONE_OTP_PER_10MIN,
    windowSeconds: 10 * 60,
    purpose: 'OTP abuse protection',
  },
  {
    route: 'GET /api/v1/jobs/feed',
    bucket: 'user',
    actionKey: 'browse_feed',
    limit: env.RATE_LIMIT_FEED_BROWSE_PER_MIN,
    windowSeconds: 60,
    purpose: 'Protect feed browsing from scraping bursts',
  },
  {
    route: 'GET /api/v1/conversations',
    bucket: 'user',
    actionKey: 'list_conversations',
    limit: env.RATE_LIMIT_CONVERSATION_LIST_PER_MIN,
    windowSeconds: 60,
    purpose: 'Protect conversation index from polling abuse',
  },
  {
    route: 'GET /api/v1/conversations/:id/messages',
    bucket: 'user',
    actionKey: 'list_messages',
    limit: env.RATE_LIMIT_MESSAGE_LIST_PER_MIN,
    windowSeconds: 60,
    purpose: 'Protect message reads from high-frequency polling',
  },
  {
    route: 'POST /api/v1/jobs',
    bucket: 'user',
    actionKey: 'post_job',
    limit: env.RATE_LIMIT_JOB_POST_DAILY,
    windowSeconds: 24 * 60 * 60,
    purpose: 'Limit job posting churn',
  },
  {
    route: 'POST /api/v1/jobs',
    bucket: 'user',
    actionKey: 'post_job_weekly',
    limit: env.RATE_LIMIT_JOB_POST_WEEKLY,
    windowSeconds: 7 * 24 * 60 * 60,
    purpose: 'Limit weekly posting volume',
  },
  {
    route: 'POST /api/v1/jobs/:id/quotes',
    bucket: 'user',
    actionKey: 'submit_quote',
    limit: env.RATE_LIMIT_QUOTE_DAILY,
    windowSeconds: 24 * 60 * 60,
    purpose: 'Limit provider quote spam',
  },
  {
    route: 'POST /api/v1/jobs/:id/quotes',
    bucket: 'user',
    actionKey: 'submit_quote_weekly',
    limit: env.RATE_LIMIT_QUOTE_WEEKLY,
    windowSeconds: 7 * 24 * 60 * 60,
    purpose: 'Limit weekly quote volume',
  },
  {
    route: 'POST /api/v1/conversations/:id/messages',
    bucket: 'user',
    actionKey: 'send_message',
    limit: env.RATE_LIMIT_MESSAGE_PER_HOUR,
    windowSeconds: 60 * 60,
    purpose: 'Limit chat flood behavior',
  },
];

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim();
  }
  if (typeof forwarded === 'string' && forwarded.trim() !== '') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}

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

export function dbRateLimit(config: DbRateLimitConfig) {
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
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests for ${config.actionKey.replace(/_/g, ' ')}.`,
            details: { retry_after_seconds: retryAfterSeconds },
          },
        });
        return;
      }

      next();
    } catch (error) {
      // Fail-open on infrastructure issues to avoid broad outages.
      console.error('[RateLimit] DB limiter check failed, allowing request:', error);
      next();
    }
  };
}

export function ipRateLimit(actionKey: string, maxRequests: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = getClientIp(req);
    try {
      const { allowed, remaining, resetAt } = await redisRateLimit(
        `ip:${ip}:${actionKey}`,
        windowSeconds,
        maxRequests
      );

      res.set({
        'X-RateLimit-Limit': String(maxRequests),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(Math.ceil(resetAt.getTime() / 1000)),
      });

      if (!allowed) {
        const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
        res.set('Retry-After', String(retryAfter));
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests.',
            details: { retry_after_seconds: retryAfter },
          },
        });
        return;
      }

      next();
    } catch {
      // Fail-open when Redis is unavailable.
      next();
    }
  };
}

export const jobPostDailyLimit = dbRateLimit({
  actionKey: 'post_job',
  max: env.RATE_LIMIT_JOB_POST_DAILY,
  windowMs: ONE_DAY_MS,
});

export const jobPostWeeklyLimit = dbRateLimit({
  actionKey: 'post_job_weekly',
  max: env.RATE_LIMIT_JOB_POST_WEEKLY,
  windowMs: ONE_WEEK_MS,
});

export const quoteSubmitDailyLimit = dbRateLimit({
  actionKey: 'submit_quote',
  max: env.RATE_LIMIT_QUOTE_DAILY,
  windowMs: ONE_DAY_MS,
});

export const quoteSubmitWeeklyLimit = dbRateLimit({
  actionKey: 'submit_quote_weekly',
  max: env.RATE_LIMIT_QUOTE_WEEKLY,
  windowMs: ONE_WEEK_MS,
});

export const messageHourlyLimit = dbRateLimit({
  actionKey: 'send_message',
  max: env.RATE_LIMIT_MESSAGE_PER_HOUR,
  windowMs: ONE_HOUR_MS,
});

export const feedBrowsePerMinuteLimit = dbRateLimit({
  actionKey: 'browse_feed',
  max: env.RATE_LIMIT_FEED_BROWSE_PER_MIN,
  windowMs: ONE_MINUTE_MS,
});

export const conversationListPerMinuteLimit = dbRateLimit({
  actionKey: 'list_conversations',
  max: env.RATE_LIMIT_CONVERSATION_LIST_PER_MIN,
  windowMs: ONE_MINUTE_MS,
});

export const messageListPerMinuteLimit = dbRateLimit({
  actionKey: 'list_messages',
  max: env.RATE_LIMIT_MESSAGE_LIST_PER_MIN,
  windowMs: ONE_MINUTE_MS,
});

export const loginIpLimit = ipRateLimit('login', env.RATE_LIMIT_LOGIN_PER_15MIN, 15 * 60);
export const registerIpLimit = ipRateLimit('register', env.RATE_LIMIT_REGISTER_PER_HOUR, 60 * 60);

export const passwordResetLimit = ipRateLimit(
  'password_reset',
  env.RATE_LIMIT_PASSWORD_RESET_PER_HOUR,
  60 * 60
);

export const phoneOtpLimit = dbRateLimit({
  actionKey: 'phone_otp',
  max: env.RATE_LIMIT_PHONE_OTP_PER_10MIN,
  windowMs: 10 * ONE_MINUTE_MS,
});

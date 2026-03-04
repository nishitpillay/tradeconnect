/**
 * Redis Client
 *
 * Single ioredis instance for:
 *   - Rate-limit sliding window counters (key-value, TTL)
 *   - BullMQ job queues (notification fanout, media processing)
 *   - WebSocket room tracking (conversation participants)
 *   - Short-lived caches (category list, provider feed)
 *
 * All keys are prefixed with env.QUEUE_PREFIX to isolate environments
 * sharing the same Redis instance.
 */

import Redis from 'ioredis';
import { env } from './env';

const redis = new Redis(env.REDIS_URL, {
  keyPrefix:        env.QUEUE_PREFIX,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect:      false,
  retryStrategy: (times) => {
    if (times > 5) return null; // stop retrying after 5 attempts
    return Math.min(times * 200, 2000);
  },
});

redis.on('connect', () => {
  console.info('[Redis] Connected');
});

redis.on('error', (err) => {
  console.error('[Redis] Error:', err.message);
});

redis.on('reconnecting', () => {
  console.warn('[Redis] Reconnecting...');
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Category list cache: 10-minute TTL */
export const CACHE_KEYS = {
  categories:        () => 'cache:categories',
  providerProfile:   (id: string) => `cache:provider:${id}`,
  jobFeed:           (hash: string) => `cache:feed:${hash}`,
} as const;

/** Atomic rate-limit counter using Redis (alternative to DB rate_limit_events).
 *  Uses sliding-window approximation via INCR + EXPIRE.
 *  DB-backed rate limiting in rateLimit.middleware.ts is the primary enforcer;
 *  this Redis helper is used for IP-level protection before DB auth.
 */
export async function redisRateLimit(
  key: string,
  windowSeconds: number,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const fullKey = `rl:${key}`;
  const pipeline = redis.pipeline();
  pipeline.incr(fullKey);
  pipeline.ttl(fullKey);

  const [[, count], [, ttl]] = (await pipeline.exec()) as [[null, number], [null, number]];

  if (count === 1) {
    // First request in window — set expiry
    await redis.expire(fullKey, windowSeconds);
  }

  const resetAt = new Date(Date.now() + (ttl > 0 ? ttl : windowSeconds) * 1000);
  const remaining = Math.max(0, maxRequests - count);
  const allowed = count <= maxRequests;

  return { allowed, remaining, resetAt };
}

export { redis };

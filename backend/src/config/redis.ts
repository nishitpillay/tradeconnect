import Redis from 'ioredis';
import { env } from './env';
import { contextualLogger } from '../observability/logger';

const log = contextualLogger({ component: 'redis' });

const redis = new Redis(env.REDIS_URL, {
  keyPrefix: env.QUEUE_PREFIX,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times) => {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
});

redis.on('connect', () => {
  log.info('Redis connected');
});

redis.on('error', (err) => {
  log.error({ err }, 'Redis connection error');
});

redis.on('reconnecting', () => {
  log.warn('Redis reconnecting');
});

export const CACHE_KEYS = {
  categories: () => 'cache:categories',
  providerProfile: (id: string) => `cache:provider:${id}`,
  jobFeed: (hash: string) => `cache:feed:${hash}`,
} as const;

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
    await redis.expire(fullKey, windowSeconds);
  }

  const resetAt = new Date(Date.now() + (ttl > 0 ? ttl : windowSeconds) * 1000);
  const remaining = Math.max(0, maxRequests - count);
  const allowed = count <= maxRequests;

  return { allowed, remaining, resetAt };
}

export { redis };

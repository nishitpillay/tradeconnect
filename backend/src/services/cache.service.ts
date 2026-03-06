import { createHash } from 'crypto';
import { CACHE_KEYS, redis } from '../config/redis';
import { env } from '../config/env';
import { contextualLogger } from '../observability/logger';

const log = contextualLogger({ component: 'cache' });

const METRICS_KEY = 'cache:metrics';
const TAG_SET_PREFIX = 'cache:tag:';

type CacheNamespace = 'category_directory' | 'provider_profile' | 'feed_summary';

interface CacheSetOptions {
  namespace: CacheNamespace;
  tags: string[];
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `"${key}":${stableSerialize(item)}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function hashParams(params: unknown): string {
  return createHash('sha1').update(stableSerialize(params)).digest('hex').slice(0, 16);
}

async function incrementCacheMetric(namespace: CacheNamespace, outcome: 'hit' | 'miss'): Promise<void> {
  const field = `${namespace}:${outcome}`;
  await redis
    .pipeline()
    .hincrby(METRICS_KEY, field, 1)
    .expire(METRICS_KEY, env.CACHE_METRICS_TTL_SECONDS)
    .exec();
}

async function addKeyTags(key: string, tags: string[]): Promise<void> {
  if (tags.length === 0) return;
  const pipeline = redis.pipeline();
  for (const tag of tags) {
    pipeline.sadd(`${TAG_SET_PREFIX}${tag}`, key);
    pipeline.expire(`${TAG_SET_PREFIX}${tag}`, env.CACHE_METRICS_TTL_SECONDS);
  }
  await pipeline.exec();
}

export async function getOrSetJson<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
  options: CacheSetOptions
): Promise<T> {
  if (!env.CACHE_ENABLED || env.NODE_ENV === 'test') {
    return loader();
  }

  const cached = await redis.get(key);
  if (cached) {
    await incrementCacheMetric(options.namespace, 'hit');
    log.debug({ namespace: options.namespace, key }, 'Cache hit');
    return JSON.parse(cached) as T;
  }

  await incrementCacheMetric(options.namespace, 'miss');
  const value = await loader();
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  await addKeyTags(key, options.tags);
  return value;
}

export async function invalidateTag(tag: string): Promise<void> {
  if (!env.CACHE_ENABLED) return;
  const tagKey = `${TAG_SET_PREFIX}${tag}`;
  const keys = await redis.smembers(tagKey);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.del(tagKey);
  log.info({ tag, keys: keys.length }, 'Cache invalidated by tag');
}

export async function invalidateTags(tags: string[]): Promise<void> {
  for (const tag of tags) {
    await invalidateTag(tag);
  }
}

export function providerDirectoryCacheKey(slug: string, limit: number): string {
  return `cache:providers-by-category:${slug}:${limit}`;
}

export function providerProfileCacheKey(userId: string): string {
  return CACHE_KEYS.providerProfile(userId);
}

export function providerFeedSummaryCacheKey(providerId: string, query: unknown): string {
  return CACHE_KEYS.jobFeed(`${providerId}:${hashParams(query)}`);
}

export function cacheTagForProvider(providerId: string): string {
  return `provider:${providerId}`;
}

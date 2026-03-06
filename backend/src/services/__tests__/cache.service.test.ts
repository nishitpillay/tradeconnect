const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  smembers: jest.fn(),
  del: jest.fn(),
  pipeline: jest.fn(),
};

jest.mock('../../config/env', () => ({
  env: {
    CACHE_ENABLED: true,
    CACHE_METRICS_TTL_SECONDS: 3600,
    NODE_ENV: 'development',
    LOG_LEVEL: 'info',
  },
}));

jest.mock('../../config/redis', () => ({
  CACHE_KEYS: {
    providerProfile: (id: string) => `cache:provider:${id}`,
    jobFeed: (hash: string) => `cache:feed:${hash}`,
  },
  redis: mockRedis,
}));

import {
  getOrSetJson,
  providerFeedSummaryCacheKey,
  providerProfileCacheKey,
} from '../cache.service';

function makePipeline() {
  return {
    hincrby: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    sadd: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };
}

describe('cache service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached value on hit', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ ok: true }));
    const loader = jest.fn(async () => ({ ok: false }));
    mockRedis.pipeline.mockReturnValue(makePipeline());

    const value = await getOrSetJson('cache:test', 60, loader, {
      namespace: 'feed_summary',
      tags: ['feed-summaries'],
    });

    expect(value).toEqual({ ok: true });
    expect(loader).not.toHaveBeenCalled();
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('loads and sets cache on miss', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockRedis.pipeline.mockReturnValue(makePipeline());
    const loader = jest.fn(async () => ({ ok: true }));

    const value = await getOrSetJson('cache:test', 120, loader, {
      namespace: 'provider_profile',
      tags: ['provider-directory', 'provider:abc'],
    });

    expect(value).toEqual({ ok: true });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenCalledWith('cache:test', JSON.stringify({ ok: true }), 'EX', 120);
  });

  it('builds stable cache keys for feed and provider profile', () => {
    expect(providerProfileCacheKey('u1')).toBe('cache:provider:u1');

    const keyA = providerFeedSummaryCacheKey('p1', { limit: 10, sort: 'newest' });
    const keyB = providerFeedSummaryCacheKey('p1', { sort: 'newest', limit: 10 });
    expect(keyA).toEqual(keyB);
  });
});

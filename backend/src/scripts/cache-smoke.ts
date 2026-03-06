import { db } from '../config/database';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { getCacheMetricsSnapshot } from '../services/cache.service';

function buildApiUrl(pathname: string): string {
  const base = env.API_BASE_URL.replace(/\/+$/, '');
  return `${base}${pathname}`;
}

async function getSampleCategorySlug(): Promise<string | null> {
  const { rows } = await db.query<{ slug: string }>(
    `SELECT jc.slug
       FROM job_categories jc
       JOIN provider_categories pc ON pc.category_id = jc.id
      ORDER BY jc.slug ASC
      LIMIT 1`
  );
  return rows[0]?.slug ?? null;
}

async function getSampleProviderId(): Promise<string | null> {
  const { rows } = await db.query<{ user_id: string }>(
    `SELECT pp.user_id
       FROM provider_profiles pp
       JOIN users u ON u.id = pp.user_id
      WHERE u.status = 'active'
      ORDER BY pp.created_at ASC
      LIMIT 1`
  );
  return rows[0]?.user_id ?? null;
}

async function warmEndpoint(url: string): Promise<void> {
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}`);
  }
}

function delta(after: number, before: number): number {
  return after - before;
}

async function run(): Promise<void> {
  if (!env.CACHE_ENABLED) {
    console.log('CACHE_SMOKE_SKIPPED cache is disabled');
    return;
  }

  const categorySlug = await getSampleCategorySlug();
  const providerId = await getSampleProviderId();
  if (!categorySlug || !providerId) {
    throw new Error('Unable to find sample category/provider rows for cache smoke');
  }

  const providerDirectoryUrl = buildApiUrl(`/api/v1/profiles/categories/${encodeURIComponent(categorySlug)}/providers`);
  const providerProfileUrl = buildApiUrl(`/api/v1/profiles/providers/${providerId}`);
  const feedUrl = buildApiUrl('/api/v1/jobs/feed?limit=5');

  const before = await getCacheMetricsSnapshot();

  await warmEndpoint(providerDirectoryUrl);
  await warmEndpoint(providerProfileUrl);

  // Feed requires provider auth, so we only check directory/profile in this smoke.
  // A second call should register hits.
  await warmEndpoint(providerDirectoryUrl);
  await warmEndpoint(providerProfileUrl);

  const after = await getCacheMetricsSnapshot();

  const categoryMissDelta = delta(after.counters['category_directory:miss'], before.counters['category_directory:miss']);
  const categoryHitDelta = delta(after.counters['category_directory:hit'], before.counters['category_directory:hit']);
  const profileMissDelta = delta(after.counters['provider_profile:miss'], before.counters['provider_profile:miss']);
  const profileHitDelta = delta(after.counters['provider_profile:hit'], before.counters['provider_profile:hit']);

  const failures: string[] = [];
  if (categoryMissDelta < 1) failures.push('category_directory miss did not increase');
  if (categoryHitDelta < 1) failures.push('category_directory hit did not increase');
  if (profileMissDelta < 1) failures.push('provider_profile miss did not increase');
  if (profileHitDelta < 1) failures.push('provider_profile hit did not increase');

  console.log('CACHE_SMOKE_RESULT', JSON.stringify({
    providerDirectoryUrl,
    providerProfileUrl,
    feedUrl,
    deltas: {
      categoryMissDelta,
      categoryHitDelta,
      profileMissDelta,
      profileHitDelta,
    },
  }));

  if (failures.length > 0) {
    throw new Error(`Cache smoke failed: ${failures.join('; ')}`);
  }
}

run()
  .then(async () => {
    await Promise.allSettled([db.end(), redis.quit()]);
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('CACHE_SMOKE_FAILED', (error as Error).message);
    await Promise.allSettled([db.end(), redis.quit()]);
    process.exit(1);
  });

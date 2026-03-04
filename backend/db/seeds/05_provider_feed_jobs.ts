import { PoolClient } from 'pg';
import { CATEGORY_FIXTURES } from './03_dummy_providers';

const OPEN_JOBS_PER_CATEGORY = 3;

function buildCustomerUuid(customerIndex: number): string {
  const hex = (customerIndex + 1).toString(16).padStart(4, '0');
  return `ccccdddd-${hex}-4000-a000-00000000${hex}`;
}

function buildFeedEntityUuid(prefix: string, categoryIndex: number, jobIndex: number): string {
  const categoryHex = (categoryIndex + 1).toString(16).padStart(2, '0');
  const jobHex = (jobIndex + 1).toString(16).padStart(2, '0');
  return `${prefix}-${categoryHex}${jobHex}-4000-a000-00000000${categoryHex}${jobHex}`;
}

export async function seedProviderFeedJobs(client: PoolClient): Promise<void> {
  console.log('  -> Seeding open provider-feed jobs...');

  let jobCount = 0;
  let quoteCount = 0;

  for (const [categoryIndex, category] of CATEGORY_FIXTURES.entries()) {
    for (let jobIndex = 0; jobIndex < OPEN_JOBS_PER_CATEGORY; jobIndex++) {
      const customerId = buildCustomerUuid((categoryIndex * OPEN_JOBS_PER_CATEGORY + jobIndex) % 20);
      const jobId = buildFeedEntityUuid('f4444444', categoryIndex, jobIndex);
      const quoteId = buildFeedEntityUuid('f5555555', categoryIndex, jobIndex);
      const providerIndex = (jobIndex + 1) % 5;
      const providerUserId = `dddddddd-${String(categoryIndex + 1).padStart(2, '0')}${String(providerIndex + 1).padStart(2, '0')}-4000-a000-00000000${String(categoryIndex + 1).padStart(2, '0')}${String(providerIndex + 1).padStart(2, '0')}`;
      const isQuotingJob = jobIndex === OPEN_JOBS_PER_CATEGORY - 1;
      const publishedAt = new Date(Date.UTC(2026, 2, 1 + categoryIndex, 9 + jobIndex, 15, 0));
      const expiresAt = new Date(publishedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
      const startDate = new Date(publishedAt.getTime() + (2 + jobIndex) * 24 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);
      const lat = Number((category.lat + jobIndex * 0.0025).toFixed(7));
      const lng = Number((category.lng + jobIndex * 0.0025).toFixed(7));

      await client.query(
        `INSERT INTO jobs (
           id, customer_id, category_id, subcategory_id,
           title, description, status, urgency, property_type,
           suburb, postcode, state,
           suburb_lat, suburb_lng, job_location,
           budget_min, budget_max, budget_is_gst,
           preferred_start_date, preferred_end_date, time_window_notes,
           quote_count, published_at, expires_at,
           is_flagged, view_count, created_at, updated_at
         ) VALUES (
           $1, $2, $3, NULL,
           $4, $5, $6, $7, 'house',
           $8, $9, 'NSW',
           $10, $11, ST_SetSRID(ST_MakePoint($12, $13), 4326),
           $14, $15, FALSE,
           $16, $17, $18,
           $19, $20, $21,
           FALSE, 0, $22, $22
         )
         ON CONFLICT (id) DO UPDATE SET
           customer_id = EXCLUDED.customer_id,
           category_id = EXCLUDED.category_id,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           urgency = EXCLUDED.urgency,
           suburb = EXCLUDED.suburb,
           postcode = EXCLUDED.postcode,
           suburb_lat = EXCLUDED.suburb_lat,
           suburb_lng = EXCLUDED.suburb_lng,
           job_location = EXCLUDED.job_location,
           budget_min = EXCLUDED.budget_min,
           budget_max = EXCLUDED.budget_max,
           preferred_start_date = EXCLUDED.preferred_start_date,
           preferred_end_date = EXCLUDED.preferred_end_date,
           time_window_notes = EXCLUDED.time_window_notes,
           quote_count = EXCLUDED.quote_count,
           published_at = EXCLUDED.published_at,
           expires_at = EXCLUDED.expires_at,
           updated_at = EXCLUDED.updated_at`,
        [
          jobId,
          customerId,
          category.categoryId,
          `${category.label} availability request ${jobIndex + 1}`,
          `Open ${category.label.toLowerCase()} job seeded for provider feed testing in ${category.suburb}.`,
          isQuotingJob ? 'quoting' : 'posted',
          jobIndex === 0 ? 'within_48h' : jobIndex === 1 ? 'this_week' : 'flexible',
          category.suburb,
          category.postcode,
          lat,
          lng,
          lng,
          lat,
          category.rateMin + jobIndex * 1500,
          category.rateMax + jobIndex * 2000,
          startDate.toISOString().slice(0, 10),
          endDate.toISOString().slice(0, 10),
          `Seeded open ${category.label.toLowerCase()} request for provider feed coverage.`,
          isQuotingJob ? 1 : 0,
          publishedAt.toISOString(),
          expiresAt.toISOString(),
          publishedAt.toISOString(),
        ]
      );

      if (isQuotingJob) {
        await client.query(
          `INSERT INTO quotes (
             id, job_id, provider_id, status, quote_type,
             price_fixed, is_gst_included,
             scope_notes, inclusions, exclusions,
             timeline_days, warranty_months,
             viewed_at, expires_at,
             is_flagged, created_at, updated_at
           ) VALUES (
             $1, $2, $3, 'pending', 'fixed',
             $4, FALSE,
             $5, $6, $7,
             $8, $9,
             $10, $11,
             FALSE, $12, $12
           )
           ON CONFLICT (id) DO UPDATE SET
             provider_id = EXCLUDED.provider_id,
             status = EXCLUDED.status,
             price_fixed = EXCLUDED.price_fixed,
             scope_notes = EXCLUDED.scope_notes,
             inclusions = EXCLUDED.inclusions,
             exclusions = EXCLUDED.exclusions,
             timeline_days = EXCLUDED.timeline_days,
             warranty_months = EXCLUDED.warranty_months,
             viewed_at = EXCLUDED.viewed_at,
             expires_at = EXCLUDED.expires_at,
             updated_at = EXCLUDED.updated_at`,
          [
            quoteId,
            jobId,
            providerUserId,
            category.rateMin + 2200,
            `Seeded ${category.label.toLowerCase()} quote to keep this job in quoting state.`,
            'Labour and standard materials included.',
            'Specialist extras excluded.',
            3 + categoryIndex % 4,
            6 + jobIndex,
            new Date(publishedAt.getTime() + 8 * 60 * 60 * 1000).toISOString(),
            expiresAt.toISOString(),
            publishedAt.toISOString(),
          ]
        );
        quoteCount++;
      }

      jobCount++;
    }
  }

  console.log(`  OK ${jobCount} open feed jobs upserted across ${CATEGORY_FIXTURES.length} categories.`);
  console.log(`  OK ${quoteCount} seeded quotes keep quoting jobs visible in the provider feed.`);
}

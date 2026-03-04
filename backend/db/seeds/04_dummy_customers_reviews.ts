import bcrypt from 'bcrypt';
import { PoolClient } from 'pg';
import { CATEGORY_FIXTURES, buildUuid } from './03_dummy_providers';

const BCRYPT_ROUNDS = 12;
const CUSTOMER_COUNT = 20;
const REVIEWS_PER_CATEGORY = 10;
const CUSTOMER_FIRST_NAMES = [
  'Sam', 'Riley', 'Jamie', 'Avery', 'Quinn',
  'Dakota', 'Harper', 'Logan', 'Peyton', 'Cameron',
] as const;
const CUSTOMER_LAST_NAMES = [
  'Brown', 'Wilson', 'Taylor', 'Hall', 'Young',
  'King', 'Scott', 'Green', 'Adams', 'Wright',
] as const;
const REVIEW_OPENERS = [
  'Very reliable from first contact.',
  'Turned up on time and explained everything clearly.',
  'Easy to deal with and finished the work properly.',
  'Good communication throughout the whole job.',
  'Professional job and the site was left tidy.',
] as const;
const REVIEW_CLOSERS = [
  'I would book this contractor again.',
  'Happy to recommend them for similar work.',
  'The final result matched what was promised.',
  'Worth hiring if you need this trade done well.',
  'The job was completed without any hassles.',
] as const;

function getDummyPassword(): string {
  return process.env.SEED_DUMMY_CUSTOMER_PASSWORD
    ?? process.env.SEED_DEMO_PASSWORD
    ?? 'DemoPass123!';
}

function buildCustomerUuid(customerIndex: number): string {
  const hex = (customerIndex + 1).toString(16).padStart(4, '0');
  return `ccccdddd-${hex}-4000-a000-00000000${hex}`;
}

function buildCustomerProfileUuid(customerIndex: number): string {
  const hex = (customerIndex + 1).toString(16).padStart(4, '0');
  return `cccceeee-${hex}-4000-a000-00000000${hex}`;
}

function buildReviewEntityUuid(prefix: string, categoryIndex: number, reviewIndex: number): string {
  const categoryHex = (categoryIndex + 1).toString(16).padStart(2, '0');
  const reviewHex = (reviewIndex + 1).toString(16).padStart(2, '0');
  return `${prefix}-${categoryHex}${reviewHex}-4000-a000-00000000${categoryHex}${reviewHex}`;
}

function buildCustomerIdentity(customerIndex: number): {
  fullName: string;
  displayName: string;
  email: string;
  phone: string;
  referralCode: string;
} {
  const first = CUSTOMER_FIRST_NAMES[customerIndex % CUSTOMER_FIRST_NAMES.length];
  const last = CUSTOMER_LAST_NAMES[(customerIndex * 3) % CUSTOMER_LAST_NAMES.length];
  return {
    fullName: `${first} ${last}`,
    displayName: first,
    email: `customer${customerIndex + 1}@dummy.tradeconnect.com.au`,
    phone: `+614${String(81000000 + customerIndex + 1).padStart(8, '0')}`,
    referralCode: `CUS-${String(customerIndex + 1).padStart(3, '0')}`,
  };
}

function buildReviewScore(categoryIndex: number, reviewIndex: number): number {
  return ((categoryIndex * 5 + reviewIndex * 3) % 10) + 1;
}

function buildReviewBody(categoryLabel: string, reviewIndex: number): string {
  const opener = REVIEW_OPENERS[reviewIndex % REVIEW_OPENERS.length];
  const closer = REVIEW_CLOSERS[(reviewIndex + 2) % REVIEW_CLOSERS.length];
  return `${opener} ${categoryLabel} work was handled well and the pricing was fair. ${closer}`;
}

async function upsertCustomerUser(
  client: PoolClient,
  params: {
    id: string;
    email: string;
    fullName: string;
    displayName: string;
    phone: string;
    passwordHash: string;
    referralCode: string;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO users (
       id, email, email_verified, phone, phone_verified,
       password_hash, role, status,
       full_name, display_name,
       timezone, push_enabled, email_notifications,
       terms_accepted_at, privacy_accepted_at, marketing_consent,
       referral_code,
       created_at, updated_at
     ) VALUES (
       $1, $2, TRUE, $3, TRUE,
       $4, 'customer', 'active',
       $5, $6,
       'Australia/Sydney', TRUE, TRUE,
       NOW(), NOW(), FALSE,
       $7,
       NOW(), NOW()
     )
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       phone = EXCLUDED.phone,
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       display_name = EXCLUDED.display_name,
       updated_at = NOW()`,
    [
      params.id,
      params.email,
      params.phone,
      params.passwordHash,
      params.fullName,
      params.displayName,
      params.referralCode,
    ]
  );
}

async function upsertCustomerProfile(
  client: PoolClient,
  params: {
    id: string;
    userId: string;
    suburb: string;
    postcode: string;
    jobsPosted: number;
    jobsCompleted: number;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO customer_profiles (
       id, user_id, suburb, postcode, state,
       jobs_posted, jobs_completed, total_reviews
     ) VALUES (
       $1, $2, $3, $4, 'NSW',
       $5, $6, 0
     )
     ON CONFLICT (user_id) DO UPDATE SET
       suburb = EXCLUDED.suburb,
       postcode = EXCLUDED.postcode,
       jobs_posted = EXCLUDED.jobs_posted,
       jobs_completed = EXCLUDED.jobs_completed,
       updated_at = NOW()`,
    [
      params.id,
      params.userId,
      params.suburb,
      params.postcode,
      params.jobsPosted,
      params.jobsCompleted,
    ]
  );
}

export async function seedDummyCustomersAndReviews(client: PoolClient): Promise<void> {
  console.log('  -> Seeding dummy customers...');

  const passwordHash = await bcrypt.hash(getDummyPassword(), BCRYPT_ROUNDS);
  const reviewCountByCustomer = new Array<number>(CUSTOMER_COUNT).fill(0);

  for (let customerIndex = 0; customerIndex < CUSTOMER_COUNT; customerIndex++) {
    const identity = buildCustomerIdentity(customerIndex);
    const baseCategory = CATEGORY_FIXTURES[customerIndex % CATEGORY_FIXTURES.length];

    await upsertCustomerUser(client, {
      id: buildCustomerUuid(customerIndex),
      passwordHash,
      ...identity,
    });

    await upsertCustomerProfile(client, {
      id: buildCustomerProfileUuid(customerIndex),
      userId: buildCustomerUuid(customerIndex),
      suburb: baseCategory.suburb,
      postcode: baseCategory.postcode,
      jobsPosted: 4,
      jobsCompleted: 4,
    });
  }

  console.log(`  OK ${CUSTOMER_COUNT} dummy customers upserted.`);
  console.log('  -> Seeding completed jobs, awarded quotes, and reviews...');

  let reviewRows = 0;

  for (const [categoryIndex, category] of CATEGORY_FIXTURES.entries()) {
    for (let reviewIndex = 0; reviewIndex < REVIEWS_PER_CATEGORY; reviewIndex++) {
      const customerIndex = (categoryIndex * REVIEWS_PER_CATEGORY + reviewIndex) % CUSTOMER_COUNT;
      const providerIndex = reviewIndex % 5;
      const customerId = buildCustomerUuid(customerIndex);
      const providerUserId = buildUuid('dddddddd', categoryIndex, providerIndex);
      const providerProfileId = buildUuid('eeeeeeee', categoryIndex, providerIndex);
      const jobId = buildReviewEntityUuid('f1111111', categoryIndex, reviewIndex);
      const quoteId = buildReviewEntityUuid('f2222222', categoryIndex, reviewIndex);
      const reviewId = buildReviewEntityUuid('f3333333', categoryIndex, reviewIndex);
      const score = buildReviewScore(categoryIndex, reviewIndex);
      const publishedAt = new Date(Date.UTC(2026, 0, 1 + categoryIndex, 8 + providerIndex, reviewIndex, 0));
      const awardedAt = new Date(publishedAt.getTime() + 2 * 24 * 60 * 60 * 1000);
      const completedAt = new Date(awardedAt.getTime() + 5 * 24 * 60 * 60 * 1000);

      await client.query(
        `INSERT INTO jobs (
           id, customer_id, category_id, subcategory_id,
           title, description, status, urgency, property_type,
           suburb, postcode, state,
           suburb_lat, suburb_lng, job_location,
           budget_min, budget_max, budget_is_gst,
           preferred_start_date, preferred_end_date, time_window_notes,
           quote_count, awarded_provider_id, awarded_at,
           published_at, expires_at, completed_at,
           is_flagged, view_count, created_at, updated_at
         ) VALUES (
           $1, $2, $3, NULL,
           $4, $5, 'completed', 'this_week', 'house',
           $6, $7, 'NSW',
           $8, $9, ST_SetSRID(ST_MakePoint($10, $11), 4326),
           $12, $13, FALSE,
           $14, $15, $16,
           1, $17, $18,
           $19, $20, $21,
           FALSE, 0, $22, $22
         )
         ON CONFLICT (id) DO UPDATE SET
           customer_id = EXCLUDED.customer_id,
           category_id = EXCLUDED.category_id,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
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
           status = EXCLUDED.status,
           quote_count = EXCLUDED.quote_count,
           awarded_provider_id = EXCLUDED.awarded_provider_id,
           awarded_at = EXCLUDED.awarded_at,
           published_at = EXCLUDED.published_at,
           expires_at = EXCLUDED.expires_at,
           completed_at = EXCLUDED.completed_at,
           updated_at = EXCLUDED.updated_at`,
        [
          jobId,
          customerId,
          category.categoryId,
          `${category.label} project ${reviewIndex + 1}`,
          `Customer requested ${category.label.toLowerCase()} work in ${category.suburb} and later completed the job successfully.`,
          category.suburb,
          category.postcode,
          category.lat + reviewIndex * 0.001,
          category.lng + reviewIndex * 0.001,
          category.lng + reviewIndex * 0.001,
          category.lat + reviewIndex * 0.001,
          category.rateMin,
          category.rateMax,
          publishedAt.toISOString().slice(0, 10),
          awardedAt.toISOString().slice(0, 10),
          `Dummy completed ${category.label.toLowerCase()} job used for seeded provider reviews.`,
          providerUserId,
          awardedAt.toISOString(),
          publishedAt.toISOString(),
          new Date(publishedAt.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt.toISOString(),
          publishedAt.toISOString(),
        ]
      );

      await client.query(
        `INSERT INTO quotes (
           id, job_id, provider_id, status, quote_type,
           price_fixed, is_gst_included,
           scope_notes, inclusions, exclusions,
           timeline_days, warranty_months,
           awarded_at, viewed_at, shortlisted_at, expires_at,
           is_flagged, created_at, updated_at
         ) VALUES (
           $1, $2, $3, 'awarded', 'fixed',
           $4, FALSE,
           $5, $6, $7,
           $8, $9,
           $10, $11, $12, $13,
           FALSE, $14, $14
         )
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           price_fixed = EXCLUDED.price_fixed,
           scope_notes = EXCLUDED.scope_notes,
           inclusions = EXCLUDED.inclusions,
           exclusions = EXCLUDED.exclusions,
           timeline_days = EXCLUDED.timeline_days,
           warranty_months = EXCLUDED.warranty_months,
           awarded_at = EXCLUDED.awarded_at,
           viewed_at = EXCLUDED.viewed_at,
           shortlisted_at = EXCLUDED.shortlisted_at,
           expires_at = EXCLUDED.expires_at,
           updated_at = EXCLUDED.updated_at`,
        [
          quoteId,
          jobId,
          providerUserId,
          category.rateMin + reviewIndex * 2500,
          `${category.label} quote accepted for seeded review scenario.`,
          'Labour and basic materials included.',
          'Specialist extras excluded.',
          2 + (reviewIndex % 6),
          6 + (reviewIndex % 12),
          awardedAt.toISOString(),
          new Date(publishedAt.getTime() + 12 * 60 * 60 * 1000).toISOString(),
          new Date(publishedAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          new Date(publishedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          publishedAt.toISOString(),
        ]
      );

      await client.query(
        `UPDATE jobs
         SET awarded_quote_id = $1,
             awarded_provider_id = $2,
             awarded_at = $3,
             updated_at = $4
         WHERE id = $5`,
        [quoteId, providerUserId, awardedAt.toISOString(), completedAt.toISOString(), jobId]
      );

      await client.query(
        `INSERT INTO reviews (
           id, job_id, quote_id,
           reviewer_id, reviewee_id,
           rating, rating_quality, rating_timeliness, rating_communication, rating_value,
           body, provider_response, provider_responded_at,
           is_verified, is_flagged, is_hidden,
           created_at, updated_at
         ) VALUES (
           $1, $2, $3,
           $4, $5,
           $6, $7, $8, $9, $10,
           $11, NULL, NULL,
           TRUE, FALSE, FALSE,
           $12, $12
         )
         ON CONFLICT (id) DO UPDATE SET
           rating = EXCLUDED.rating,
           rating_quality = EXCLUDED.rating_quality,
           rating_timeliness = EXCLUDED.rating_timeliness,
           rating_communication = EXCLUDED.rating_communication,
           rating_value = EXCLUDED.rating_value,
           body = EXCLUDED.body,
           updated_at = EXCLUDED.updated_at`,
        [
          reviewId,
          jobId,
          quoteId,
          customerId,
          providerUserId,
          score,
          Math.min(10, score + 1),
          Math.max(1, score - 1),
          score,
          Math.min(10, score + ((reviewIndex % 2) === 0 ? 0 : 1)),
          buildReviewBody(category.label, reviewIndex),
          new Date(completedAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        ]
      );

      await client.query(
        `UPDATE provider_profiles
         SET jobs_completed = GREATEST(jobs_completed, $1),
             quotes_submitted = GREATEST(quotes_submitted, $2),
             jobs_won = GREATEST(jobs_won, $3)
         WHERE id = $4`,
        [
          2 + Math.floor(REVIEWS_PER_CATEGORY / 5),
          6 + reviewIndex,
          2 + (reviewIndex % 5),
          providerProfileId,
        ]
      );

      reviewCountByCustomer[customerIndex] += 1;
      reviewRows++;
    }
  }

  for (let customerIndex = 0; customerIndex < CUSTOMER_COUNT; customerIndex++) {
    await client.query(
      `UPDATE customer_profiles
       SET jobs_posted = $1,
           jobs_completed = $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [reviewCountByCustomer[customerIndex], buildCustomerUuid(customerIndex)]
    );
  }

  console.log(`  OK ${reviewRows} seeded reviews created across ${CATEGORY_FIXTURES.length} categories.`);
  console.log('  Credentials: customer*@dummy.tradeconnect.com.au / default DemoPass123! unless SEED_DUMMY_CUSTOMER_PASSWORD is set');
}

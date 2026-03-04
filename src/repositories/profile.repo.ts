import { QueryResult, QueryResultRow } from 'pg';
import { db } from '../config/database';
import type { User, CustomerProfile, ProviderProfile } from './user.repo';

// Matches the db pool wrapper — allows unknown[] params (same pattern as other repos)
type QueryRunner = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
};

const q = db as unknown as QueryRunner;

// ── Dynamic SET helpers ────────────────────────────────────────────────────────

export async function updateUserFields(
  userId: string,
  fields: Partial<Pick<User, 'full_name' | 'display_name' | 'avatar_url' | 'timezone'>>
): Promise<User | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, val] of Object.entries(fields)) {
    setClauses.push(`${key} = $${idx++}`);
    values.push(val);
  }

  if (setClauses.length === 0) return null;

  values.push(userId);
  const { rows } = await q.query<User>(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function updateProviderFields(
  userId: string,
  fields: Partial<Pick<ProviderProfile, 'bio' | 'years_experience' | 'service_radius_km' | 'business_name' | 'abn' | 'available'>>
): Promise<ProviderProfile | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, val] of Object.entries(fields)) {
    setClauses.push(`${key} = $${idx++}`);
    values.push(val);
  }

  if (setClauses.length === 0) return null;

  values.push(userId);
  const { rows } = await q.query<ProviderProfile>(
    `UPDATE provider_profiles SET ${setClauses.join(', ')} WHERE user_id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function updateCustomerFields(
  userId: string,
  fields: Partial<Pick<CustomerProfile, 'suburb' | 'state' | 'postcode'>>
): Promise<CustomerProfile | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, val] of Object.entries(fields)) {
    setClauses.push(`${key} = $${idx++}`);
    values.push(val);
  }

  if (setClauses.length === 0) return null;

  values.push(userId);
  const { rows } = await q.query<CustomerProfile>(
    `UPDATE customer_profiles SET ${setClauses.join(', ')} WHERE user_id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function updateNotificationPrefs(
  userId: string,
  prefs: { push_enabled?: boolean; email_notifications?: boolean }
): Promise<User | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (prefs.push_enabled !== undefined) {
    setClauses.push(`push_enabled = $${idx++}`);
    values.push(prefs.push_enabled);
  }
  if (prefs.email_notifications !== undefined) {
    setClauses.push(`email_notifications = $${idx++}`);
    values.push(prefs.email_notifications);
  }

  if (setClauses.length === 0) return null;

  values.push(userId);
  const { rows } = await q.query<User>(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

// ── Provider verification flags ───────────────────────────────────────────────

export async function updateProviderVerificationFlags(
  providerId: string,
  flags: {
    identity_verified?:  boolean;
    license_verified?:   boolean;
    insurance_verified?: boolean;
    abn_verified?:       boolean;
    verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
  }
): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, val] of Object.entries(flags)) {
    if (val !== undefined) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(val);
    }
  }

  if (setClauses.length === 0) return;

  values.push(providerId);
  await q.query(
    `UPDATE provider_profiles SET ${setClauses.join(', ')} WHERE user_id = $${idx}`,
    values
  );
}

// ── Public profile queries ─────────────────────────────────────────────────────

export interface PublicProviderProfile {
  user_id: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  business_name: string;
  bio: string | null;
  years_experience: number | null;
  verification_status: string;
  identity_verified: boolean;
  license_verified: boolean;
  avg_rating: string | null;  // NUMERIC comes back as string from pg
  total_reviews: number;
  jobs_completed: number;
  available: boolean;
  service_radius_km: number;
  categories: string[];
  member_since: Date;
}

export interface PublicProviderReviewSummary {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  reviewer_name: string;
}

export interface PublicCategoryProvider {
  user_id: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  business_name: string;
  bio: string | null;
  years_experience: number | null;
  avg_rating: string | null;
  total_reviews: number;
  jobs_completed: number;
  available: boolean;
  categories: string[];
  recent_reviews: PublicProviderReviewSummary[];
}

export async function getProviderPublicProfile(
  userId: string
): Promise<PublicProviderProfile | null> {
  const { rows } = await db.query<PublicProviderProfile>(
    `SELECT
       pp.user_id,
       u.full_name,
       u.display_name,
       u.avatar_url,
       pp.business_name,
       pp.bio,
       pp.years_experience,
       pp.verification_status,
       pp.identity_verified,
       pp.license_verified,
       pp.avg_rating,
       pp.total_reviews,
       pp.jobs_completed,
       pp.available,
       pp.service_radius_km,
       COALESCE(
         ARRAY_AGG(jc.name ORDER BY jc.name) FILTER (WHERE jc.name IS NOT NULL),
         '{}'
       ) AS categories,
       u.created_at AS member_since
     FROM provider_profiles pp
     JOIN users u ON u.id = pp.user_id
     LEFT JOIN provider_categories pc ON pc.provider_id = pp.id
     LEFT JOIN job_categories jc ON jc.id = pc.category_id
     WHERE pp.user_id = $1
       AND u.status = 'active'
     GROUP BY
       pp.user_id, u.full_name, u.display_name, u.avatar_url,
       pp.business_name, pp.bio, pp.years_experience, pp.verification_status,
       pp.identity_verified, pp.license_verified, pp.avg_rating, pp.total_reviews,
       pp.jobs_completed, pp.available, pp.service_radius_km, u.created_at`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function listProvidersByCategorySlug(
  slug: string,
  limit = 12
): Promise<PublicCategoryProvider[]> {
  const { rows } = await db.query<PublicCategoryProvider>(
    `SELECT
       pp.user_id,
       u.full_name,
       u.display_name,
       u.avatar_url,
       pp.business_name,
       pp.bio,
       pp.years_experience,
       pp.avg_rating,
       pp.total_reviews,
       pp.jobs_completed,
       pp.available,
       COALESCE(categories.categories, '{}') AS categories,
       COALESCE(recent_reviews.reviews, '[]'::json) AS recent_reviews
     FROM provider_profiles pp
     JOIN users u ON u.id = pp.user_id
     JOIN provider_categories pc ON pc.provider_id = pp.id
     JOIN job_categories jc ON jc.id = pc.category_id
     LEFT JOIN LATERAL (
       SELECT ARRAY_AGG(cat.name ORDER BY cat.name) AS categories
       FROM provider_categories provider_cat
       JOIN job_categories cat ON cat.id = provider_cat.category_id
       WHERE provider_cat.provider_id = pp.id
     ) categories ON TRUE
     LEFT JOIN LATERAL (
       SELECT JSON_AGG(
         JSON_BUILD_OBJECT(
           'id', review_rows.id,
           'rating', review_rows.rating,
           'body', review_rows.body,
           'created_at', review_rows.created_at,
           'reviewer_name', review_rows.reviewer_name
         )
         ORDER BY review_rows.created_at DESC
       ) AS reviews
       FROM (
         SELECT
           r.id,
           r.rating,
           r.body,
           r.created_at,
           COALESCE(reviewer.display_name, reviewer.full_name) AS reviewer_name
         FROM reviews r
         JOIN users reviewer ON reviewer.id = r.reviewer_id
         WHERE r.reviewee_id = pp.user_id
           AND r.is_hidden = FALSE
         ORDER BY r.created_at DESC
         LIMIT 3
       ) review_rows
     ) recent_reviews ON TRUE
     WHERE jc.slug = $1
       AND u.status = 'active'
     GROUP BY
       pp.id,
       pp.user_id,
       u.full_name,
       u.display_name,
       u.avatar_url,
       pp.business_name,
       pp.bio,
       pp.years_experience,
       pp.avg_rating,
       pp.total_reviews,
       pp.jobs_completed,
       pp.available,
       categories.categories,
       recent_reviews.reviews
     ORDER BY
       pp.available DESC,
       pp.avg_rating DESC NULLS LAST,
       pp.total_reviews DESC,
       pp.jobs_completed DESC,
       pp.business_name ASC
     LIMIT $2`,
    [slug, limit]
  );

  return rows;
}

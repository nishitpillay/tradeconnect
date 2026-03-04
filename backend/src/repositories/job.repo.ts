import { PoolClient, QueryResult, QueryResultRow } from 'pg';
import axios from 'axios';
import { db } from '../config/database';

// Allows passing either a PoolClient (for transactions) or the db pool wrapper
type QueryRunner = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
};
import { redis } from '../config/redis';
import { env } from '../config/env';

// ── Types ─────────────────────────────────────────────────────────────────────

export type JobStatus =
  | 'draft' | 'posted' | 'quoting' | 'awarded' | 'in_progress'
  | 'completed' | 'cancelled' | 'expired' | 'closed' | 'disputed';

export type QuoteStatus =
  | 'pending' | 'viewed' | 'shortlisted' | 'awarded' | 'rejected' | 'withdrawn' | 'expired';

export interface Job {
  id: string;
  customer_id: string;
  category_id: string;
  subcategory_id: string | null;
  title: string;
  description: string;
  status: JobStatus;
  urgency: string;
  property_type: string | null;
  suburb: string;
  state: string;
  postcode: string;
  suburb_lat: number | null;
  suburb_lng: number | null;
  exact_address_enc: Buffer | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_is_gst: boolean;
  preferred_start_date: string | null;
  preferred_end_date: string | null;
  time_window_notes: string | null;
  quote_count: number;
  awarded_quote_id: string | null;
  awarded_at: Date | null;
  published_at: Date | null;
  expires_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  cancellation_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Quote {
  id: string;
  job_id: string;
  provider_id: string;
  status: QuoteStatus;
  quote_type: string;
  price_fixed: number | null;
  price_min: number | null;
  price_max: number | null;
  hourly_rate: number | null;
  is_gst_included: boolean;
  scope_notes: string | null;
  inclusions: string | null;
  exclusions: string | null;
  timeline_days: number | null;
  warranty_months: number | null;
  awarded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateJobInput {
  customer_id: string;
  category_id: string;
  subcategory_id?: string;
  title: string;
  description: string;
  urgency?: string;
  property_type?: string;
  suburb: string;
  state: string;
  postcode: string;
  exact_address?: string;
  budget_min?: number;
  budget_max?: number;
  budget_is_gst?: boolean;
  preferred_start_date?: string;
  preferred_end_date?: string;
  time_window_notes?: string;
}

export interface PatchJobInput {
  category_id?: string;
  subcategory_id?: string | null;
  title?: string;
  description?: string;
  urgency?: string;
  property_type?: string | null;
  suburb?: string;
  state?: string;
  postcode?: string;
  exact_address?: string;
  budget_min?: number | null;
  budget_max?: number | null;
  budget_is_gst?: boolean;
  preferred_start_date?: string | null;
  preferred_end_date?: string | null;
  time_window_notes?: string | null;
}

export interface CreateQuoteInput {
  job_id: string;
  provider_id: string;
  quote_type: string;
  price_fixed?: number;
  price_min?: number;
  price_max?: number;
  hourly_rate?: number;
  is_gst_included?: boolean;
  scope_notes?: string;
  inclusions?: string;
  exclusions?: string;
  timeline_days?: number;
  warranty_months?: number;
}

export interface FeedQuery {
  provider_id: string;
  category_id?: string;
  state?: string;
  urgency?: string[];
  max_distance_km?: number;
  budget_min?: number;
  budget_max?: number;
  sort?: 'recommended' | 'newest' | 'budget_high' | 'budget_low' | 'distance';
  cursor?: string;   // base64-encoded { created_at, id }
  limit?: number;
}

export interface FeedCursor {
  created_at: string;
  id: string;
}

// ── Job CRUD ──────────────────────────────────────────────────────────────────

export async function createJob(
  input: CreateJobInput,
  client?: PoolClient
): Promise<Job> {
  const q = (client ?? db) as QueryRunner;

  // Encrypt exact address if provided
  let exactAddressEnc: Buffer | null = null;
  if (input.exact_address) {
    exactAddressEnc = await db.encryptValue(input.exact_address);
  }

  // Get suburb centroid for PostGIS job_location field (fails gracefully)
  const centroid = await getSuburbCentroid(input.suburb, input.state);

  const { rows } = await q.query<Job>(
    `INSERT INTO jobs
       (customer_id, category_id, subcategory_id, title, description,
        urgency, property_type, suburb, state, postcode,
        exact_address_enc, job_location,
        budget_min, budget_max, budget_is_gst,
        preferred_start_date, preferred_end_date, time_window_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             $11,
             CASE WHEN $12::float8 IS NOT NULL
                  THEN ST_SetSRID(ST_MakePoint($12::float8, $13::float8), 4326)::geography
                  ELSE NULL END,
             $14, $15, $16, $17, $18, $19)
     RETURNING *`,
    [
      input.customer_id,
      input.category_id,
      input.subcategory_id ?? null,
      input.title,
      input.description,
      input.urgency ?? 'flexible',
      input.property_type ?? null,
      input.suburb,
      input.state,
      input.postcode,
      exactAddressEnc,              // $11
      centroid?.lng ?? null,        // $12 (lng = X for MakePoint)
      centroid?.lat ?? null,        // $13 (lat = Y for MakePoint)
      input.budget_min ?? null,     // $14
      input.budget_max ?? null,     // $15
      input.budget_is_gst ?? false, // $16
      input.preferred_start_date ?? null, // $17
      input.preferred_end_date ?? null,   // $18
      input.time_window_notes ?? null,    // $19
    ]
  );
  return rows[0];
}

export async function findJobById(id: string): Promise<Job | null> {
  const { rows } = await db.query<Job>(
    'SELECT * FROM jobs WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function findJobsByCustomer(customerId: string): Promise<Job[]> {
  const { rows } = await db.query<Job>(
    'SELECT * FROM jobs WHERE customer_id = $1 ORDER BY created_at DESC',
    [customerId]
  );
  return rows;
}

export async function findJobsByCustomerPaginated(
  customerId: string,
  query: { status?: string; cursor?: string; limit: number }
): Promise<{ jobs: Job[]; nextCursor: string | null }> {
  const pageSize = Math.min(query.limit, 50);
  const conditions: string[] = ['customer_id = $1'];
  const values: (string | number)[] = [customerId];
  let idx = 2;

  if (query.status) {
    conditions.push(`status = $${idx++}`);
    values.push(query.status);
  }

  if (query.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      conditions.push(
        `(created_at < $${idx} OR (created_at = $${idx + 1} AND id > $${idx + 2}))`
      );
      idx += 3;
      values.push(decoded.created_at, decoded.created_at, decoded.id);
    }
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const { rows } = await db.query<Job>(
    `SELECT * FROM jobs ${where} ORDER BY created_at DESC, id ASC LIMIT $${idx}`,
    [...values, pageSize + 1]
  );

  const hasMore = rows.length > pageSize;
  const jobs = hasMore ? rows.slice(0, pageSize) : rows;
  const last = jobs[jobs.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.id })
    : null;
  return { jobs, nextCursor };
}

export async function patchJob(
  id: string,
  input: PatchJobInput,
  client?: PoolClient
): Promise<Job | null> {
  const q = (client ?? db) as QueryRunner;
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.exact_address !== undefined) {
    const enc = input.exact_address ? await db.encryptValue(input.exact_address) : null;
    setClauses.push(`exact_address_enc = $${idx++}`);
    values.push(enc);
  }

  if (input.suburb !== undefined || input.state !== undefined) {
    // Re-derive centroid if location changes
    const suburb = input.suburb;
    const state  = input.state;
    if (suburb && state) {
      const centroid = await getSuburbCentroid(suburb, state);
      if (centroid) {
        setClauses.push(`job_location = ST_SetSRID(ST_MakePoint($${idx++}::float8, $${idx++}::float8), 4326)::geography`);
        values.push(centroid.lng, centroid.lat);
      }
    }
  }

  const simpleFields: (keyof PatchJobInput)[] = [
    'category_id', 'subcategory_id', 'title', 'description', 'urgency',
    'property_type', 'suburb', 'state', 'postcode',
    'budget_min', 'budget_max', 'budget_is_gst',
    'preferred_start_date', 'preferred_end_date', 'time_window_notes',
  ];

  for (const field of simpleFields) {
    if (field in input) {
      setClauses.push(`${field} = $${idx++}`);
      values.push(input[field] ?? null);
    }
  }

  if (setClauses.length === 0) return findJobById(id);

  values.push(id);
  const { rows } = await q.query<Job>(
    `UPDATE jobs SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function updateJobStatus(
  id: string,
  status: JobStatus,
  extra?: Record<string, unknown>,
  client?: PoolClient
): Promise<Job | null> {
  const q = (client ?? db) as QueryRunner;
  const setClauses = ['status = $1'];
  const values: unknown[] = [status];
  let idx = 2;

  if (extra) {
    for (const [key, val] of Object.entries(extra)) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(val);
    }
  }

  values.push(id);
  const { rows } = await q.query<Job>(
    `UPDATE jobs SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

// ── Provider Feed ─────────────────────────────────────────────────────────────

/**
 * Proximity-based job feed for providers.
 * Uses PostGIS ST_DWithin for efficient distance filtering.
 * Cursor pagination: encode { created_at, id } as base64 JSON for stable ordering.
 */
export async function findProviderFeed(query: FeedQuery): Promise<{
  jobs: Job[];
  nextCursor: string | null;
}> {
  const limit = Math.min(query.limit ?? 20, 50);
  const maxDistanceM = (query.max_distance_km ?? 50) * 1000;

  // Get provider service location
  const { rows: provRows } = await db.query<{ service_location: string }>(
    'SELECT ST_AsText(service_location) as service_location FROM provider_profiles WHERE user_id = $1',
    [query.provider_id]
  );

  // Active job statuses visible to providers
  const conditions: string[] = [`j.status IN ('posted', 'quoting')`];
  const values: (string | number)[] = [];
  let idx = 1;

  // PostGIS distance filter (only if provider has a service location set)
  const provLocation = provRows[0]?.service_location;
  if (provLocation && provLocation !== 'POINT EMPTY') {
    conditions.push(
      `ST_DWithin(j.job_location, (SELECT service_location FROM provider_profiles WHERE user_id = $${idx++}), $${idx++})`
    );
    values.push(query.provider_id, maxDistanceM);
  }

  if (query.category_id) {
    conditions.push(`j.category_id = $${idx++}`);
    values.push(query.category_id);
  }

  if (query.state) {
    conditions.push(`j.state = $${idx++}`);
    values.push(query.state);
  }

  if (query.urgency && query.urgency.length > 0) {
    const placeholders = query.urgency.map(() => `$${idx++}`).join(', ');
    conditions.push(`j.urgency IN (${placeholders})`);
    values.push(...query.urgency);
  }

  if (query.budget_min != null) {
    conditions.push(`(j.budget_max IS NULL OR j.budget_max >= $${idx++})`);
    values.push(query.budget_min);
  }

  if (query.budget_max != null) {
    conditions.push(`(j.budget_min IS NULL OR j.budget_min <= $${idx++})`);
    values.push(query.budget_max);
  }

  // Cursor-based pagination (keyset on published_at DESC, id ASC)
  if (query.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      conditions.push(
        `(j.published_at < $${idx++} OR (j.published_at = $${idx++} AND j.id > $${idx++}))`
      );
      values.push(decoded.created_at, decoded.created_at, decoded.id);
    }
  }

  // Sort order
  const orderBy = (() => {
    switch (query.sort) {
      case 'budget_high': return 'j.budget_max DESC NULLS LAST, j.published_at DESC, j.id ASC';
      case 'budget_low':  return 'j.budget_min ASC NULLS LAST, j.published_at DESC, j.id ASC';
      case 'distance':
        return provLocation && provLocation !== 'POINT EMPTY'
          ? `ST_Distance(j.job_location, (SELECT service_location FROM provider_profiles WHERE user_id = '${query.provider_id}')) ASC, j.published_at DESC, j.id ASC`
          : 'j.published_at DESC, j.id ASC';
      case 'newest':
      case 'recommended':
      default:
        return 'j.published_at DESC, j.id ASC';
    }
  })();

  const where = conditions.join(' AND ');
  const { rows } = await db.query<Job>(
    `SELECT j.* FROM jobs j
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT $${idx}`,
    [...values, limit + 1]
  );

  const hasMore = rows.length > limit;
  const jobs = hasMore ? rows.slice(0, limit) : rows;
  const last = jobs[jobs.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor({ created_at: last.published_at!.toISOString(), id: last.id })
    : null;

  return { jobs, nextCursor };
}

// ── Award Job Transaction ─────────────────────────────────────────────────────

/**
 * Award a job to a quote inside a DEFERRABLE FK transaction.
 */
export async function awardJob(
  jobId: string,
  quoteId: string,
  client: PoolClient
): Promise<{ job: Job; decryptedAddress: string | null }> {
  // Defer the FK check until COMMIT
  await client.query('SET CONSTRAINTS jobs_awarded_quote_id_fkey DEFERRED');

  // 1. Update job → awarded
  const { rows: jobRows } = await client.query<Job>(
    `UPDATE jobs
     SET status = 'awarded', awarded_quote_id = $1, awarded_at = NOW()
     WHERE id = $2 AND status = 'quoting'
     RETURNING *`,
    [quoteId, jobId]
  );

  if (jobRows.length === 0) throw new Error('Job not found or not in quoting state');

  // 2. Award the selected quote
  await client.query(
    `UPDATE quotes SET status = 'awarded', awarded_at = NOW() WHERE id = $1`,
    [quoteId]
  );

  // 3. Reject all other quotes for this job
  await client.query(
    `UPDATE quotes SET status = 'rejected'
     WHERE job_id = $1 AND id <> $2 AND status IN ('pending', 'viewed', 'shortlisted')`,
    [jobId, quoteId]
  );

  const job = jobRows[0];

  // Decrypt exact address for one-time reveal in response
  let decryptedAddress: string | null = null;
  if (job.exact_address_enc) {
    decryptedAddress = await db.decryptValue(job.exact_address_enc);
  }

  return { job, decryptedAddress };
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export async function createQuote(
  input: CreateQuoteInput,
  client?: PoolClient
): Promise<Quote> {
  const q = (client ?? db) as QueryRunner;
  const { rows } = await q.query<Quote>(
    `INSERT INTO quotes
       (job_id, provider_id, quote_type,
        price_fixed, price_min, price_max, hourly_rate,
        is_gst_included, scope_notes, inclusions, exclusions,
        timeline_days, warranty_months)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      input.job_id,
      input.provider_id,
      input.quote_type,
      input.price_fixed ?? null,
      input.price_min ?? null,
      input.price_max ?? null,
      input.hourly_rate ?? null,
      input.is_gst_included ?? false,
      input.scope_notes ?? null,
      input.inclusions ?? null,
      input.exclusions ?? null,
      input.timeline_days ?? null,
      input.warranty_months ?? null,
    ]
  );
  return rows[0];
}

export async function findQuoteById(id: string): Promise<Quote | null> {
  const { rows } = await db.query<Quote>('SELECT * FROM quotes WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function findQuotesByJob(jobId: string): Promise<Quote[]> {
  const { rows } = await db.query<Quote>(
    'SELECT * FROM quotes WHERE job_id = $1 ORDER BY created_at ASC',
    [jobId]
  );
  return rows;
}

export async function updateQuoteStatus(
  quoteId: string,
  status: QuoteStatus,
  extra?: Record<string, unknown>,
  client?: PoolClient
): Promise<Quote | null> {
  const q = (client ?? db) as QueryRunner;
  const setClauses = ['status = $1'];
  const values: unknown[] = [status];
  let idx = 2;

  if (extra) {
    for (const [key, val] of Object.entries(extra)) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(val);
    }
  }

  values.push(quoteId);
  const { rows } = await q.query<Quote>(
    `UPDATE quotes SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function findQuoteByJobAndProvider(
  jobId: string,
  providerId: string
): Promise<Quote | null> {
  const { rows } = await db.query<Quote>(
    'SELECT * FROM quotes WHERE job_id = $1 AND provider_id = $2',
    [jobId, providerId]
  );
  return rows[0] ?? null;
}

// ── Suburb Centroid ───────────────────────────────────────────────────────────

const GEOCODE_CACHE_TTL_S = 30 * 24 * 60 * 60; // 30 days

/**
 * Geocode a suburb to a lat/lng centroid via Google Geocoding API.
 * Results are cached in Redis for 30 days (suburb centroids rarely change).
 */
export async function getSuburbCentroid(
  suburb: string,
  state: string
): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `geocode:${suburb.toLowerCase()}:${state.toLowerCase()}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as { lat: number; lng: number };
  }

  try {
    const address = encodeURIComponent(`${suburb} ${state} Australia`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${env.GOOGLE_MAPS_API_KEY}`;

    const response = await axios.get<{
      status: string;
      results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    }>(url, { timeout: 5000 });

    if (response.data.status !== 'OK' || response.data.results.length === 0) {
      console.warn('[Geocode] No results for', suburb, state);
      return null;
    }

    const { lat, lng } = response.data.results[0].geometry.location;
    const centroid = { lat, lng };

    await redis.set(cacheKey, JSON.stringify(centroid), 'EX', GEOCODE_CACHE_TTL_S);
    return centroid;
  } catch (err) {
    console.error('[Geocode] Error:', (err as Error).message);
    return null;
  }
}

// ── Cursor Helpers ────────────────────────────────────────────────────────────

function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

function decodeCursor(encoded: string): FeedCursor | null {
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    return JSON.parse(json) as FeedCursor;
  } catch {
    return null;
  }
}

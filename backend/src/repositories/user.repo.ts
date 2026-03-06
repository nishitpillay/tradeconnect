import { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { db } from '../config/database';
import { redis } from '../config/redis';

// Allows passing either a PoolClient (for transactions) or the db pool wrapper
type QueryRunner = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole   = 'customer' | 'provider' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'banned' | 'deleted' | 'pending_verification';

export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  phone: string | null;
  phone_verified: boolean;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  push_enabled: boolean;
  email_notifications: boolean;
  terms_accepted_at: Date | null;
  privacy_accepted_at: Date | null;
  marketing_consent: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerProfile {
  id: string;
  user_id: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  jobs_posted: number;
  jobs_completed: number;
  avg_rating: number | null;
  total_reviews: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProviderProfile {
  id: string;
  user_id: string;
  business_name: string;
  abn: string | null;
  abn_verified: boolean;
  bio: string | null;
  years_experience: number | null;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  identity_verified: boolean;
  license_verified: boolean;
  insurance_verified: boolean;
  service_radius_km: number;
  avg_rating: number | null;
  total_reviews: number;
  jobs_completed: number;
  featured: boolean;
  available: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  terms_accepted_at?: Date;
  privacy_accepted_at?: Date;
  marketing_consent?: boolean;
  email_verified?: boolean;
}

export interface CreateCustomerProfileInput {
  user_id: string;
  suburb?: string;
  state?: string;
  postcode?: string;
}

export interface CreateProviderProfileInput {
  user_id: string;
  business_name: string;
  abn?: string;
  service_radius_km?: number;
}

// ── User CRUD ─────────────────────────────────────────────────────────────────

export async function findById(id: string): Promise<User | null> {
  const { rows } = await db.query<User>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function findByEmail(email: string): Promise<User | null> {
  const { rows } = await db.query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return rows[0] ?? null;
}

export async function findPrimaryActiveAdmin(excludeUserId?: string): Promise<User | null> {
  const params: string[] = ['admin', 'active'];
  let whereClause = 'WHERE role = $1 AND status = $2';

  if (excludeUserId) {
    params.push(excludeUserId);
    whereClause += ` AND id <> $${params.length}`;
  }

  const { rows } = await db.query<User>(
    `SELECT *
     FROM users
     ${whereClause}
     ORDER BY created_at ASC
     LIMIT 1`,
    params
  );

  return rows[0] ?? null;
}

export async function createUser(
  input: CreateUserInput,
  client?: PoolClient
): Promise<User> {
  const q = (client ?? db) as QueryRunner;
  const { rows } = await q.query<User>(
    `INSERT INTO users
       (email, password_hash, role, full_name, phone, terms_accepted_at, privacy_accepted_at, marketing_consent, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.email,
      input.password_hash,
      input.role,
      input.full_name,
      input.phone ?? null,
      input.terms_accepted_at ?? null,
      input.privacy_accepted_at ?? null,
      input.marketing_consent ?? false,
      input.email_verified ?? false,
    ]
  );
  return rows[0];
}

export async function updateUser(
  id: string,
  fields: Partial<Pick<User, 'phone' | 'status' | 'email_verified' | 'phone_verified' | 'last_login_at'>>,
  client?: PoolClient
): Promise<User | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(fields)) {
    setClauses.push(`${key} = $${idx++}`);
    values.push(value);
  }

  if (setClauses.length === 0) return findById(id);

  values.push(id);
  const q = (client ?? db) as QueryRunner;
  const { rows } = await q.query<User>(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function updateUserStatus(
  id: string,
  status: UserStatus
): Promise<void> {
  await db.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
}

// ── Profile CRUD ──────────────────────────────────────────────────────────────

export async function createCustomerProfile(
  input: CreateCustomerProfileInput,
  client?: PoolClient
): Promise<CustomerProfile> {
  const q = (client ?? db) as QueryRunner;
  const { rows } = await q.query<CustomerProfile>(
    `INSERT INTO customer_profiles (user_id, suburb, state, postcode)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.user_id, input.suburb ?? null, input.state ?? null, input.postcode ?? null]
  );
  return rows[0];
}

export async function createProviderProfile(
  input: CreateProviderProfileInput,
  client?: PoolClient
): Promise<ProviderProfile> {
  const q = (client ?? db) as QueryRunner;
  const { rows } = await q.query<ProviderProfile>(
    `INSERT INTO provider_profiles (user_id, business_name, abn, service_radius_km)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      input.user_id,
      input.business_name,
      input.abn ?? null,
      input.service_radius_km ?? 50,
    ]
  );
  return rows[0];
}

export async function findCustomerProfile(userId: string): Promise<CustomerProfile | null> {
  const { rows } = await db.query<CustomerProfile>(
    'SELECT * FROM customer_profiles WHERE user_id = $1',
    [userId]
  );
  return rows[0] ?? null;
}

export async function findProviderProfile(userId: string): Promise<ProviderProfile | null> {
  const { rows } = await db.query<ProviderProfile>(
    'SELECT * FROM provider_profiles WHERE user_id = $1',
    [userId]
  );
  return rows[0] ?? null;
}

// ── Token Invalidation ────────────────────────────────────────────────────────

/**
 * Signal that all JWTs for this user issued before now are invalid.
 * Used on password change or account compromise.
 * The JWT middleware checks this Redis key on every request.
 */
export async function invalidateAllTokens(userId: string): Promise<void> {
  await redis.set(`token:invalidate:${userId}`, Date.now().toString(), 'EX', 3600);
  await db.query(
    `UPDATE auth_tokens SET revoked_at = NOW()
     WHERE user_id = $1 AND token_type = 'refresh' AND revoked_at IS NULL`,
    [userId]
  );
}

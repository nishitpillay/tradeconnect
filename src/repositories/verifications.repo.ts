import { QueryResult, QueryResultRow } from 'pg';
import { db } from '../config/database';

// Allows unknown[] params — same pattern as profile.repo.ts
type QueryRunner = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
};

const q = db as unknown as QueryRunner;

// ── Types ─────────────────────────────────────────────────────────────────────

export type VerificationStatus   = 'pending' | 'verified' | 'rejected' | 'unverified';
export type VerificationType     = 'identity' | 'trade_license' | 'insurance' | 'abn';
export type DocumentType         =
  | 'passport'
  | 'drivers_licence'
  | 'medicare_card'
  | 'birth_certificate'
  | 'license_certificate'
  | 'insurance_policy'
  | 'abn_registration'
  | 'other';

export interface Verification {
  id:               string;
  provider_id:      string;
  verification_type: VerificationType;
  document_type:    DocumentType;
  s3_key:           string;
  status:           VerificationStatus;
  expires_at:       Date | null;
  reviewed_by:      string | null;
  reviewed_at:      Date | null;
  rejection_reason: string | null;
  admin_notes:      string | null;
  created_at:       Date;
  updated_at:       Date;
}

export interface CreateVerificationInput {
  provider_id:       string;
  verification_type: VerificationType;
  document_type:     DocumentType;
  s3_key:            string;
  expires_at?:       string;
}

export interface UpdateVerificationStatusInput {
  status:           VerificationStatus;
  reviewed_by:      string;
  rejection_reason?: string;
  admin_notes?:     string;
}

export interface VerificationsPage {
  verifications: Verification[];
  nextCursor:    string | null;
}

interface VerificationCursor {
  created_at: string;
  id:         string;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function createVerification(
  input: CreateVerificationInput
): Promise<Verification> {
  const { rows } = await db.query<Verification>(
    `INSERT INTO verifications
       (provider_id, verification_type, document_type, s3_key, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.provider_id,
      input.verification_type,
      input.document_type,
      input.s3_key,
      input.expires_at ?? null,
    ]
  );
  return rows[0];
}

export async function findById(id: string): Promise<Verification | null> {
  const { rows } = await db.query<Verification>(
    'SELECT * FROM verifications WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function findByProviderAndType(
  providerId: string,
  type: string
): Promise<Verification[]> {
  const { rows } = await db.query<Verification>(
    'SELECT * FROM verifications WHERE provider_id = $1 AND verification_type = $2',
    [providerId, type]
  );
  return rows;
}

export async function hasPendingForType(
  providerId: string,
  type: string
): Promise<boolean> {
  const { rows } = await db.query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM verifications
       WHERE provider_id = $1 AND verification_type = $2 AND status = 'pending'
     ) AS exists`,
    [providerId, type]
  );
  return rows[0]?.exists ?? false;
}

export async function listByProvider(
  providerId: string,
  query: { status?: string; cursor?: string; limit: number }
): Promise<VerificationsPage> {
  const pageSize = Math.min(query.limit, 100);
  const conditions: string[] = ['provider_id = $1'];
  const values: unknown[] = [providerId];
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
  const { rows } = await q.query<Verification>(
    `SELECT * FROM verifications
     ${where}
     ORDER BY created_at DESC, id ASC
     LIMIT $${idx}`,
    [...values, pageSize + 1]
  );

  return buildPage(rows, pageSize);
}

export async function listAll(
  query: { status?: string; provider_id?: string; cursor?: string; limit: number }
): Promise<VerificationsPage> {
  const pageSize = Math.min(query.limit, 100);
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (query.provider_id) {
    conditions.push(`provider_id = $${idx++}`);
    values.push(query.provider_id);
  }

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

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await q.query<Verification>(
    `SELECT * FROM verifications
     ${where}
     ORDER BY created_at DESC, id ASC
     LIMIT $${idx}`,
    [...values, pageSize + 1]
  );

  return buildPage(rows, pageSize);
}

export async function updateVerificationStatus(
  id: string,
  input: UpdateVerificationStatusInput
): Promise<Verification | null> {
  const setClauses: string[] = [
    'status = $2',
    'reviewed_by = $3',
    'reviewed_at = NOW()',
  ];
  const values: unknown[] = [id, input.status, input.reviewed_by];
  let idx = 4;

  if (input.rejection_reason !== undefined) {
    setClauses.push(`rejection_reason = $${idx++}`);
    values.push(input.rejection_reason);
  }

  if (input.admin_notes !== undefined) {
    setClauses.push(`admin_notes = $${idx++}`);
    values.push(input.admin_notes);
  }

  const { rows } = await q.query<Verification>(
    `UPDATE verifications
     SET ${setClauses.join(', ')}
     WHERE id = $1
     RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPage(rows: Verification[], pageSize: number): VerificationsPage {
  const hasMore = rows.length > pageSize;
  const verifications = hasMore ? rows.slice(0, pageSize) : rows;
  const last = verifications[verifications.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.id })
    : null;
  return { verifications, nextCursor };
}

function encodeCursor(cursor: VerificationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

function decodeCursor(encoded: string): VerificationCursor | null {
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    return JSON.parse(json) as VerificationCursor;
  } catch {
    return null;
  }
}

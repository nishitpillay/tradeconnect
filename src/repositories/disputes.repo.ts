import { db } from '../config/database';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DisputeStatus     = 'open' | 'investigating' | 'resolved' | 'closed';
export type DisputeResolution = 'customer_favour' | 'provider_favour' | 'mutual' | 'no_action';

export interface Dispute {
  id:            string;
  job_id:        string;
  raised_by:     string;
  against_user:  string;
  status:        DisputeStatus;
  resolution:    DisputeResolution | null;
  reason:        string;
  evidence_urls: string[];
  admin_notes:   string | null;
  resolved_by:   string | null;
  resolved_at:   Date | null;
  created_at:    Date;
  updated_at:    Date;
}

export interface CreateDisputeInput {
  job_id:        string;
  raised_by:     string;
  against_user:  string;
  reason:        string;
  evidence_urls: string[];
}

interface UpdateDisputeStatusInput {
  status:       DisputeStatus;
  resolution?:  DisputeResolution;
  admin_notes?: string;
  resolved_by?: string;
}

interface DisputeCursor {
  created_at: string;
  id:         string;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function findDisputeById(id: string): Promise<Dispute | null> {
  const { rows } = await db.query<Dispute>(
    'SELECT * FROM disputes WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function createDispute(input: CreateDisputeInput): Promise<Dispute> {
  const { rows } = await db.query<Dispute>(
    `INSERT INTO disputes (job_id, raised_by, against_user, reason, evidence_urls)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.job_id,
      input.raised_by,
      input.against_user,
      input.reason,
      input.evidence_urls,
    ]
  );
  return rows[0];
}

export async function findOpenDisputeByJobAndRaiser(
  jobId: string,
  raisedBy: string
): Promise<Dispute | null> {
  const { rows } = await db.query<Dispute>(
    `SELECT * FROM disputes
     WHERE job_id = $1 AND raised_by = $2 AND status IN ('open', 'investigating')
     LIMIT 1`,
    [jobId, raisedBy]
  );
  return rows[0] ?? null;
}

export async function updateDisputeStatus(
  id: string,
  input: UpdateDisputeStatusInput
): Promise<Dispute | null> {
  const setClauses: string[] = ['status = $2'];
  const values: (string | null)[] = [id, input.status];
  let idx = 3;

  if (input.resolution !== undefined) {
    setClauses.push(`resolution = $${idx++}`);
    values.push(input.resolution);
  }

  if (input.admin_notes !== undefined) {
    setClauses.push(`admin_notes = $${idx++}`);
    values.push(input.admin_notes);
  }

  if (input.resolved_by !== undefined) {
    setClauses.push(`resolved_by = $${idx++}`);
    values.push(input.resolved_by);
  }

  if (input.status === 'resolved') {
    setClauses.push('resolved_at = NOW()');
  }

  const { rows } = await db.query<Dispute>(
    `UPDATE disputes
     SET ${setClauses.join(', ')}
     WHERE id = $1
     RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function findDisputesByUser(
  userId: string,
  cursor?: string,
  limit = 20,
  status?: DisputeStatus
): Promise<{ disputes: Dispute[]; nextCursor: string | null }> {
  const pageSize = Math.min(limit, 50);
  const conditions: string[] = ['(raised_by = $1 OR against_user = $1)'];
  const values: (string | number)[] = [userId];
  let idx = 2;

  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      conditions.push(
        `(created_at < $${idx++} OR (created_at = $${idx++} AND id > $${idx++}))`
      );
      values.push(decoded.created_at, decoded.created_at, decoded.id);
    }
  }

  const where = conditions.join(' AND ');
  const { rows } = await db.query<Dispute>(
    `SELECT * FROM disputes
     WHERE ${where}
     ORDER BY created_at DESC, id ASC
     LIMIT $${idx}`,
    [...values, pageSize + 1]
  );

  return buildPage(rows, pageSize);
}

export async function findAllDisputes(
  cursor?: string,
  limit = 20,
  status?: DisputeStatus
): Promise<{ disputes: Dispute[]; nextCursor: string | null }> {
  const pageSize = Math.min(limit, 50);
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let idx = 1;

  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      conditions.push(
        `(created_at < $${idx++} OR (created_at = $${idx++} AND id > $${idx++}))`
      );
      values.push(decoded.created_at, decoded.created_at, decoded.id);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await db.query<Dispute>(
    `SELECT * FROM disputes
     ${where}
     ORDER BY created_at DESC, id ASC
     LIMIT $${idx}`,
    [...values, pageSize + 1]
  );

  return buildPage(rows, pageSize);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPage(
  rows: Dispute[],
  pageSize: number
): { disputes: Dispute[]; nextCursor: string | null } {
  const hasMore = rows.length > pageSize;
  const disputes = hasMore ? rows.slice(0, pageSize) : rows;
  const last = disputes[disputes.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.id })
    : null;
  return { disputes, nextCursor };
}

function encodeCursor(cursor: DisputeCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

function decodeCursor(encoded: string): DisputeCursor | null {
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    return JSON.parse(json) as DisputeCursor;
  } catch {
    return null;
  }
}

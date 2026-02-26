import { QueryResult, QueryResultRow } from 'pg';
import { db } from '../config/database';
import type { User } from './user.repo';
import type { Job } from './job.repo';

// Allows unknown[] params — same pattern as other repos
type QueryRunner = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
};

const q = db as unknown as QueryRunner;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  total_users:           number;
  active_users:          number;
  total_jobs:            number;
  active_jobs:           number;
  pending_reports:       number;
  pending_verifications: number;
}

export interface Report {
  id:            string;
  reporter_id:   string;
  entity_type:   string;
  entity_id:     string;
  reason_code:   string;
  reason_detail: string | null;
  status:        string;
  reviewed_by:   string | null;
  reviewed_at:   Date | null;
  action_taken:  string | null;
  created_at:    Date;
}

export interface AuditLog {
  id:           number;
  action:       string;
  actor_id:     string | null;
  target_type:  string | null;
  target_id:    string | null;
  before_state: Record<string, unknown> | null;
  after_state:  Record<string, unknown> | null;
  ip_address:   string | null;
  user_agent:   string | null;
  created_at:   Date;
}

// ── Cursor helpers ────────────────────────────────────────────────────────────

interface StandardCursor { created_at: string; id: string; }

function encodeCursor(c: StandardCursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64');
}

function decodeCursor(s: string): StandardCursor | null {
  try { return JSON.parse(Buffer.from(s, 'base64').toString('utf8')); }
  catch { return null; }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getStats(): Promise<AdminStats> {
  const { rows } = await db.query<{
    total_users:           string;
    active_users:          string;
    total_jobs:            string;
    active_jobs:           string;
    pending_reports:       string;
    pending_verifications: string;
  }>(`
    SELECT
      (SELECT COUNT(*)::text FROM users)                                    AS total_users,
      (SELECT COUNT(*)::text FROM users WHERE status = 'active')            AS active_users,
      (SELECT COUNT(*)::text FROM jobs)                                     AS total_jobs,
      (SELECT COUNT(*)::text FROM jobs
         WHERE status IN ('posted','quoting','awarded','in_progress'))       AS active_jobs,
      (SELECT COUNT(*)::text FROM reports WHERE status = 'pending')         AS pending_reports,
      (SELECT COUNT(*)::text FROM verifications WHERE status = 'pending')   AS pending_verifications
  `);
  const r = rows[0];
  return {
    total_users:           parseInt(r.total_users,           10),
    active_users:          parseInt(r.active_users,          10),
    total_jobs:            parseInt(r.total_jobs,            10),
    active_jobs:           parseInt(r.active_jobs,           10),
    pending_reports:       parseInt(r.pending_reports,       10),
    pending_verifications: parseInt(r.pending_verifications, 10),
  };
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface UsersPage {
  users:      User[];
  nextCursor: string | null;
}

export async function listUsers(query: {
  role?: string;
  status?: string;
  search?: string;
  cursor?: string;
  limit: number;
}): Promise<UsersPage> {
  const pageSize = Math.min(query.limit, 100);
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (query.role) {
    conditions.push(`role = $${idx++}`);
    values.push(query.role);
  }

  if (query.status) {
    conditions.push(`status = $${idx++}`);
    values.push(query.status);
  }

  if (query.search) {
    conditions.push(`(full_name ILIKE $${idx} OR email ILIKE $${idx})`);
    values.push(`%${query.search}%`);
    idx++;
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
  const { rows } = await q.query<User>(
    `SELECT * FROM users ${where} ORDER BY created_at DESC, id ASC LIMIT $${idx}`,
    [...values, pageSize + 1]
  );

  const hasMore = rows.length > pageSize;
  const users = hasMore ? rows.slice(0, pageSize) : rows;
  const last = users[users.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.id })
    : null;
  return { users, nextCursor };
}

export async function findUserWithProfileById(id: string): Promise<{
  user: User;
  customer_profile: Record<string, unknown> | null;
  provider_profile: Record<string, unknown> | null;
} | null> {
  const { rows } = await db.query<User>('SELECT * FROM users WHERE id = $1', [id]);
  if (!rows[0]) return null;
  const user = rows[0];

  const [cpRes, ppRes] = await Promise.all([
    db.query<Record<string, unknown>>('SELECT * FROM customer_profiles WHERE user_id = $1', [id]),
    db.query<Record<string, unknown>>('SELECT * FROM provider_profiles WHERE user_id = $1',  [id]),
  ]);

  return {
    user,
    customer_profile: cpRes.rows[0] ?? null,
    provider_profile: ppRes.rows[0] ?? null,
  };
}

export async function adminUpdateUserStatus(
  id: string,
  status: string
): Promise<User | null> {
  const { rows } = await db.query<User>(
    'UPDATE users SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return rows[0] ?? null;
}

// ── Jobs (Admin) ──────────────────────────────────────────────────────────────

export interface JobsAdminPage {
  jobs:       Job[];
  nextCursor: string | null;
}

export async function listJobsAdmin(query: {
  status?: string;
  category_id?: string;
  customer_id?: string;
  cursor?: string;
  limit: number;
}): Promise<JobsAdminPage> {
  const pageSize = Math.min(query.limit, 100);
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (query.status) {
    conditions.push(`status = $${idx++}`);
    values.push(query.status);
  }

  if (query.category_id) {
    conditions.push(`category_id = $${idx++}`);
    values.push(query.category_id);
  }

  if (query.customer_id) {
    conditions.push(`customer_id = $${idx++}`);
    values.push(query.customer_id);
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
  const { rows } = await q.query<Job>(
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

// ── Reports ───────────────────────────────────────────────────────────────────

export interface ReportsPage {
  reports:    Report[];
  nextCursor: string | null;
}

export async function listReports(query: {
  status?: string;
  entity_type?: string;
  cursor?: string;
  limit: number;
}): Promise<ReportsPage> {
  const pageSize = Math.min(query.limit, 100);
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (query.status) {
    conditions.push(`status = $${idx++}`);
    values.push(query.status);
  }

  if (query.entity_type) {
    conditions.push(`entity_type = $${idx++}`);
    values.push(query.entity_type);
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
  const { rows } = await q.query<Report>(
    `SELECT * FROM reports ${where} ORDER BY created_at DESC, id ASC LIMIT $${idx}`,
    [...values, pageSize + 1]
  );

  const hasMore = rows.length > pageSize;
  const reports = hasMore ? rows.slice(0, pageSize) : rows;
  const last = reports[reports.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.id })
    : null;
  return { reports, nextCursor };
}

export async function findReportById(id: string): Promise<Report | null> {
  const { rows } = await db.query<Report>('SELECT * FROM reports WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function updateReport(
  id: string,
  input: {
    status:        string;
    reviewed_by:   string;
    action_taken?: string;
  }
): Promise<Report | null> {
  const setClauses: string[] = ['status = $2', 'reviewed_by = $3', 'reviewed_at = NOW()'];
  const values: unknown[] = [id, input.status, input.reviewed_by];
  let idx = 4;

  if (input.action_taken !== undefined) {
    setClauses.push(`action_taken = $${idx++}`);
    values.push(input.action_taken);
  }

  const { rows } = await q.query<Report>(
    `UPDATE reports SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

export interface AuditLogsPage {
  logs:       AuditLog[];
  nextCursor: number | null;  // BIGSERIAL id
}

export async function listAuditLogs(query: {
  actor_id?:    string;
  action?:      string;
  target_type?: string;
  from?:        string;
  to?:          string;
  cursor?:      number;
  limit:        number;
}): Promise<AuditLogsPage> {
  const pageSize = Math.min(query.limit, 100);
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (query.actor_id) {
    conditions.push(`actor_id = $${idx++}`);
    values.push(query.actor_id);
  }

  if (query.action) {
    conditions.push(`action::text ILIKE $${idx++}`);
    values.push(`%${query.action}%`);
  }

  if (query.target_type) {
    conditions.push(`target_type = $${idx++}`);
    values.push(query.target_type);
  }

  if (query.from) {
    conditions.push(`created_at >= $${idx++}`);
    values.push(query.from);
  }

  if (query.to) {
    conditions.push(`created_at <= $${idx++}`);
    values.push(query.to);
  }

  if (query.cursor !== undefined) {
    conditions.push(`id < $${idx++}`);
    values.push(query.cursor);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await q.query<AuditLog>(
    `SELECT * FROM audit_logs ${where} ORDER BY id DESC LIMIT $${idx}`,
    [...values, pageSize + 1]
  );

  const hasMore = rows.length > pageSize;
  const logs = hasMore ? rows.slice(0, pageSize) : rows;
  const last = logs[logs.length - 1];
  const nextCursor = hasMore && last ? last.id : null;
  return { logs, nextCursor };
}

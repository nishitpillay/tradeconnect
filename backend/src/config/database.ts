/**
 * Database Configuration
 *
 * Single pg.Pool instance shared across the entire application.
 * All queries should go through this pool — never create ad-hoc connections.
 *
 * Features:
 *   - Environment-validated config (throws at startup if misconfigured)
 *   - Connection-level app.secret_key SET for pgcrypto address encryption
 *   - Structured logging of slow queries (> SLOW_QUERY_THRESHOLD_MS)
 *   - Health-check helper: db.healthCheck()
 *   - Graceful shutdown: db.end()
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// ─── Config validation ────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('[DB] DATABASE_URL environment variable is required.');
}

const APP_SECRET_KEY = process.env.DB_ENCRYPTION_KEY;
if (!APP_SECRET_KEY || APP_SECRET_KEY.length < 32) {
  throw new Error(
    '[DB] DB_ENCRYPTION_KEY must be set and >= 32 characters ' +
    '(used for pgcrypto symmetric encryption of exact addresses).'
  );
}

const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_MS ?? '300', 10);

// ─── Pool configuration ───────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: DATABASE_URL,
  max:              parseInt(process.env.DB_POOL_MAX ?? '10', 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // SSL in production; skip for local dev
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : false,
});

// Set app-level GUC on every new connection (used by pgcrypto functions)
pool.on('connect', async (client: PoolClient) => {
  // Escape the key to prevent injection through the GUC
  const escaped = APP_SECRET_KEY.replace(/'/g, "''");
  await client.query(`SET app.secret_key = '${escaped}';`);
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

// ─── Query wrapper with logging ───────────────────────────────────────────────

type QueryParams = (string | number | boolean | null | Date | Buffer | string[] | number[])[];

async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: QueryParams
): Promise<QueryResult<T>> {
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn('[DB] Slow query detected', {
        duration_ms: duration,
        threshold_ms: SLOW_QUERY_THRESHOLD_MS,
        // Truncate query for log safety (never log param values — may contain PII)
        query: text.slice(0, 200),
        rows: result.rowCount,
      });
    }

    return result;
  } catch (err) {
    const pgError = err as { code?: string; detail?: string; table?: string };
    console.error('[DB] Query error', {
      code:   pgError.code,
      table:  pgError.table,
      query:  text.slice(0, 200),  // truncated; never log params
    });
    throw err;
  }
}

// ─── Transaction helper ───────────────────────────────────────────────────────

async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Health check ─────────────────────────────────────────────────────────────

async function healthCheck(): Promise<{ ok: boolean; latency_ms: number }> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { ok: true, latency_ms: Date.now() - start };
  } catch {
    return { ok: false, latency_ms: Date.now() - start };
  }
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function end(): Promise<void> {
  await pool.end();
  console.log('[DB] Pool closed.');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const db = {
  query,
  withTransaction,
  healthCheck,
  end,
  /**
   * Get a raw client for operations that need manual transaction control.
   * Always release the client in a finally block.
   * @example
   *   const client = await db.getClient();
   *   try { ... } finally { client.release(); }
   */
  getClient: () => pool.connect(),
  /** Encrypt a plain-text value using pgcrypto + app.secret_key GUC */
  encryptValue: async (plainText: string): Promise<Buffer> => {
    const result = await pool.query<{ enc: Buffer }>(
      `SELECT pgp_sym_encrypt($1, current_setting('app.secret_key')) AS enc`,
      [plainText]
    );
    return result.rows[0].enc;
  },
  /** Decrypt a pgcrypto-encrypted bytea column value */
  decryptValue: async (encryptedBytes: Buffer): Promise<string> => {
    const result = await pool.query<{ val: string }>(
      `SELECT pgp_sym_decrypt($1, current_setting('app.secret_key')) AS val`,
      [encryptedBytes]
    );
    return result.rows[0].val;
  },
};

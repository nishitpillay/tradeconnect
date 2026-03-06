import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';
import { contextualLogger } from '../observability/logger';

const log = contextualLogger({ component: 'database' });
const sslEnabled = env.DB_SSL_ENABLED ?? (env.NODE_ENV === 'production');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: sslEnabled ? { rejectUnauthorized: true } : false,
});

pool.on('connect', async (client: PoolClient) => {
  const escaped = env.DB_ENCRYPTION_KEY.replace(/'/g, "''");
  await client.query(`SET app.secret_key = '${escaped}';`);
});

pool.on('error', (err) => {
  log.error({ err }, 'Unexpected PostgreSQL pool error');
});

type QueryParams = (string | number | boolean | null | Date | Buffer | string[] | number[])[];

async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: QueryParams
): Promise<QueryResult<T>> {
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (duration > env.SLOW_QUERY_MS) {
      log.warn(
        {
          durationMs: duration,
          thresholdMs: env.SLOW_QUERY_MS,
          query: text.slice(0, 200),
          rows: result.rowCount,
        },
        'Slow database query'
      );
    }

    return result;
  } catch (error) {
    const pgError = error as { code?: string; table?: string };
    log.error(
      {
        err: error,
        code: pgError.code,
        table: pgError.table,
        query: text.slice(0, 200),
      },
      'Database query failed'
    );
    throw error;
  }
}

async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function healthCheck(): Promise<{ ok: boolean; latency_ms: number }> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { ok: true, latency_ms: Date.now() - start };
  } catch {
    return { ok: false, latency_ms: Date.now() - start };
  }
}

async function end(): Promise<void> {
  await pool.end();
  log.info('PostgreSQL pool closed');
}

export const db = {
  query,
  withTransaction,
  healthCheck,
  end,
  getClient: () => pool.connect(),
  encryptValue: async (plainText: string): Promise<Buffer> => {
    const result = await pool.query<{ enc: Buffer }>(
      `SELECT pgp_sym_encrypt($1, current_setting('app.secret_key')) AS enc`,
      [plainText]
    );
    return result.rows[0].enc;
  },
  decryptValue: async (encryptedBytes: Buffer): Promise<string> => {
    const result = await pool.query<{ val: string }>(
      `SELECT pgp_sym_decrypt($1, current_setting('app.secret_key')) AS val`,
      [encryptedBytes]
    );
    return result.rows[0].val;
  },
};

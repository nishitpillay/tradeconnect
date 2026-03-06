import fs from 'node:fs/promises';
import path from 'node:path';
import { db } from '../config/database';
import { redis } from '../config/redis';

export interface ReadinessResult {
  ok: boolean;
  checks: {
    db: boolean;
    redis: boolean;
    migrations: {
      available: boolean;
      ok: boolean;
      pendingCount: number;
      pending?: string[];
    };
  };
}

async function checkMigrations(): Promise<ReadinessResult['checks']['migrations']> {
  const legacyDir = path.resolve(process.cwd(), 'db', 'migrations');
  const knexDir = path.resolve(process.cwd(), 'db', 'knex', 'migrations');

  const [legacyFiles, knexFiles] = await Promise.all([
    readMigrationFiles(legacyDir, /^\d+.*\.(ts|js)$/),
    readMigrationFiles(knexDir, /^\d{14}.*\.js$/),
  ]);

  if (legacyFiles.length === 0 && knexFiles.length === 0) {
    return { available: false, ok: true, pendingCount: 0 };
  }

  const pending: string[] = [];

  if (legacyFiles.length > 0) {
    const appliedLegacy = await readAppliedMigrations('pgmigrations', 'name');
    pending.push(
      ...legacyFiles.filter((file) => !appliedLegacy.has(stripExt(file))).map((name) => `legacy:${name}`)
    );
  }

  if (knexFiles.length > 0) {
    const appliedKnex = await readAppliedMigrations('knex_migrations', 'name');
    pending.push(
      ...knexFiles.filter((file) => !appliedKnex.has(file)).map((name) => `knex:${name}`)
    );
  }

  return {
    available: true,
    ok: pending.length === 0,
    pendingCount: pending.length,
    pending: pending.length > 0 ? pending : undefined,
  };
}

async function readMigrationFiles(
  directory: string,
  pattern: RegExp
): Promise<string[]> {
  try {
    return (await fs.readdir(directory)).filter((name) => pattern.test(name)).sort();
  } catch {
    return [];
  }
}

async function readAppliedMigrations(
  tableName: string,
  columnName: string
): Promise<Set<string>> {
  try {
    const { rows } = await db.query<{ value: string }>(
      `SELECT ${columnName}::text AS value FROM ${tableName}`
    );
    return new Set(rows.map((row) => stripExt(row.value)));
  } catch {
    return new Set();
  }
}

function stripExt(name: string): string {
  return name.replace(/\.(ts|js)$/i, '');
}

export async function getReadiness(): Promise<ReadinessResult> {
  const [dbResult, redisResult, migrations] = await Promise.allSettled([
    db.healthCheck(),
    redis.ping().then((v) => v === 'PONG'),
    checkMigrations(),
  ]);

  const dbOk = dbResult.status === 'fulfilled' && dbResult.value.ok;
  const redisOk = redisResult.status === 'fulfilled' && redisResult.value;
  const migrationsResult =
    migrations.status === 'fulfilled'
      ? migrations.value
      : { available: false, ok: true, pendingCount: 0 };

  return {
    ok: dbOk && redisOk && migrationsResult.ok,
    checks: {
      db: dbOk,
      redis: redisOk,
      migrations: migrationsResult,
    },
  };
}

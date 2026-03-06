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
  const migrationsDir = path.resolve(process.cwd(), 'db', 'migrations');
  let files: string[];

  try {
    files = (await fs.readdir(migrationsDir))
      .filter((name) => /^\d+.*\.(ts|js)$/.test(name))
      .sort();
  } catch {
    return { available: false, ok: true, pendingCount: 0 };
  }

  try {
    const { rows } = await db.query<{ name: string }>('SELECT name FROM pgmigrations');
    const applied = new Set(rows.map((r) => r.name.replace(/\.(ts|js)$/i, '')));
    const pending = files.filter((file) => !applied.has(file.replace(/\.(ts|js)$/i, '')));

    return {
      available: true,
      ok: pending.length === 0,
      pendingCount: pending.length,
      pending: pending.length > 0 ? pending : undefined,
    };
  } catch {
    return { available: false, ok: true, pendingCount: 0 };
  }
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

/**
 * Seed Runner
 *
 * Runs all seeds in order, or a specific seed by name.
 *
 * Usage:
 *   npm run db:seed              — runs all seeds in order
 *   npm run db:seed -- --seed 01_categories
 *   npm run db:seed -- --seed 02_admin_user
 *   npm run db:seed -- --dry-run   (prints what would run, no DB changes)
 *
 * Environment:
 *   DATABASE_URL         — required; postgres connection string
 *   SEED_ADMIN_PASSWORD  — required for 02_admin_user seed
 *   SEED_ADMIN_EMAIL     — optional; defaults to admin@tradeconnect.com.au
 *   SEED_DEMO_PASSWORD   — optional; defaults to DemoPass123!
 *   NODE_ENV             — 'production' skips demo accounts
 */

import { Pool, PoolClient } from 'pg';
import { seedCategories }         from './01_categories';
import { seedAdminAndDemoUsers }  from './02_admin_user';
import { seedDummyProviders }     from './03_dummy_providers';
import { seedDummyCustomersAndReviews } from './04_dummy_customers_reviews';

// ─── Seed registry ────────────────────────────────────────────────────────────

interface SeedDefinition {
  name: string;
  description: string;
  fn: (client: PoolClient) => Promise<void>;
  runInProduction: boolean;   // false = dev/staging only
}

const SEEDS: SeedDefinition[] = [
  {
    name:            '01_categories',
    description:     'Job category taxonomy (30 parents + 32 subcategories)',
    fn:              seedCategories,
    runInProduction: true,    // categories are required in all environments
  },
  {
    name:            '02_admin_user',
    description:     'Superadmin + demo customer + demo provider accounts',
    fn:              seedAdminAndDemoUsers,
    runInProduction: true,    // admin is required in production; demo accounts are skipped by fn
  },
  {
    name:            '03_dummy_providers',
    description:     'Five dummy provider accounts for each featured category',
    fn:              seedDummyProviders,
    runInProduction: false,
  },
  {
    name:            '04_dummy_customers_reviews',
    description:     'Twenty dummy customers plus ten seeded reviews per featured category',
    fn:              seedDummyCustomersAndReviews,
    runInProduction: false,
  },
];

// ─── CLI argument parsing ─────────────────────────────────────────────────────

function parseArgs(): { seedName: string | null; dryRun: boolean } {
  const args = process.argv.slice(2);
  let seedName: string | null = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--seed' && args[i + 1]) {
      seedName = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  return { seedName, dryRun };
}

// ─── Seed execution ───────────────────────────────────────────────────────────

async function runSeed(
  client: PoolClient,
  seed: SeedDefinition,
  dryRun: boolean
): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && !seed.runInProduction) {
    console.log(`  ⏭  Skipping ${seed.name} (not flagged for production)`);
    return;
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would run: ${seed.name} — ${seed.description}`);
    return;
  }

  const startMs = Date.now();
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Running: ${seed.name}`);
  console.log(`  ${seed.description}`);
  console.log('─'.repeat(60));

  await seed.fn(client);

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(2);
  console.log(`  ⏱  Completed in ${elapsed}s`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { seedName, dryRun } = parseArgs();

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,           // seeds are serial; single connection is fine
  });

  const client = await pool.connect();

  try {
    // Determine which seeds to run
    let seedsToRun: SeedDefinition[];

    if (seedName) {
      const found = SEEDS.find(s => s.name === seedName);
      if (!found) {
        const names = SEEDS.map(s => s.name).join(', ');
        console.error(`❌ Unknown seed: "${seedName}"\nAvailable seeds: ${names}`);
        process.exit(1);
      }
      seedsToRun = [found];
    } else {
      seedsToRun = SEEDS;
    }

    console.log('\n🌱 TradeConnect Database Seeder');
    console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
    console.log(`   Database:    ${maskConnectionString(process.env.DATABASE_URL!)}`);
    console.log(`   Seeds:       ${seedsToRun.map(s => s.name).join(', ')}`);
    if (dryRun) console.log('   Mode:        DRY RUN (no changes written)\n');

    if (!dryRun) {
      await client.query('BEGIN');
    }

    for (const seed of seedsToRun) {
      await runSeed(client, seed, dryRun);
    }

    if (!dryRun) {
      await client.query('COMMIT');
      console.log('\n✅ All seeds completed successfully.\n');
    } else {
      console.log('\n✅ Dry run complete. No changes written.\n');
    }
  } catch (err) {
    if (!dryRun) {
      await client.query('ROLLBACK');
    }
    console.error('\n❌ Seed run failed. Transaction rolled back.');
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

function maskConnectionString(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return url.replace(/:[^:@]+@/, ':***@');
  }
}

main();

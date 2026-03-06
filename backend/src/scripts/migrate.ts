import path from 'node:path';
import Knex from 'knex';
import { env } from '../config/env';

type Command = 'latest' | 'list';

async function ensureKnexMetadata(knex: Knex.Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS knex_migrations (
      id INTEGER PRIMARY KEY,
      name VARCHAR(255),
      batch INTEGER,
      migration_time TIMESTAMPTZ
    );
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS knex_migrations_lock (
      "index" INTEGER PRIMARY KEY,
      is_locked INTEGER
    );
  `);

  await knex.raw(`
    INSERT INTO knex_migrations_lock ("index", is_locked)
    VALUES (1, 0)
    ON CONFLICT ("index") DO NOTHING;
  `);

  await knex.raw(`CREATE SEQUENCE IF NOT EXISTS knex_migrations_id_seq;`);
  await knex.raw(`
    ALTER TABLE knex_migrations
    ALTER COLUMN id SET DEFAULT nextval('knex_migrations_id_seq');
  `);

  await knex.raw(`
    SELECT setval(
      'knex_migrations_id_seq',
      GREATEST((SELECT COALESCE(MAX(id), 0) FROM knex_migrations) + 1, 1),
      false
    );
  `);
}

async function run(command: Command): Promise<void> {
  const knex = Knex({
    client: 'pg',
    connection: env.DATABASE_URL,
    migrations: {
      directory: path.resolve(process.cwd(), 'db', 'knex', 'migrations'),
      tableName: 'knex_migrations',
    },
  });

  try {
    await ensureKnexMetadata(knex);

    if (command === 'latest') {
      const [batch, files] = await knex.migrate.latest();
      console.log(`Knex migrations complete. Batch ${batch}. Applied ${files.length} file(s).`);
      files.forEach((f: string) => console.log(` - ${f}`));
      return;
    }

    const [completed, pending] = await knex.migrate.list();
    console.log(`Completed migrations: ${completed.length}`);
    completed.forEach((m: { name: string }) => console.log(` - ${m.name}`));
    console.log(`Pending migrations: ${pending.length}`);
    pending.forEach((m: { file: string }) => console.log(` - ${m.file}`));
  } finally {
    await knex.destroy();
  }
}

const command = (process.argv[2] ?? 'latest') as Command;
if (command !== 'latest' && command !== 'list') {
  console.error(`Unknown migration command: ${command}. Use "latest" or "list".`);
  process.exit(1);
}

run(command).catch((error) => {
  console.error('Migration execution failed:', error);
  process.exit(1);
});

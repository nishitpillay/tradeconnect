/**
 * Baseline hardening migration for existing schema.
 * Idempotent and safe to run repeatedly.
 */

exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "postgis";');

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'jobs_customer_id_fk_hardening'
      ) THEN
        ALTER TABLE jobs
          ADD CONSTRAINT jobs_customer_id_fk_hardening
          FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT;
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'jobs_category_id_fk_hardening'
      ) THEN
        ALTER TABLE jobs
          ADD CONSTRAINT jobs_category_id_fk_hardening
          FOREIGN KEY (category_id) REFERENCES job_categories(id) ON DELETE RESTRICT;
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'messages_conversation_id_fk_hardening'
      ) THEN
        ALTER TABLE messages
          ADD CONSTRAINT messages_conversation_id_fk_hardening
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE RESTRICT;
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_id_fk_hardening'
      ) THEN
        ALTER TABLE messages
          ADD CONSTRAINT messages_sender_id_fk_hardening
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT;
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reviews_job_id_fk_hardening'
      ) THEN
        ALTER TABLE reviews
          ADD CONSTRAINT reviews_job_id_fk_hardening
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT;
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reviews_reviewer_id_fk_hardening'
      ) THEN
        ALTER TABLE reviews
          ADD CONSTRAINT reviews_reviewer_id_fk_hardening
          FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT;
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reviews_reviewee_id_fk_hardening'
      ) THEN
        ALTER TABLE reviews
          ADD CONSTRAINT reviews_reviewee_id_fk_hardening
          FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE RESTRICT;
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    DECLARE has_nulls BOOLEAN;
    BEGIN
      SELECT EXISTS (SELECT 1 FROM jobs WHERE customer_id IS NULL) INTO has_nulls;
      IF has_nulls THEN
        RAISE EXCEPTION 'Cannot enforce jobs.customer_id NOT NULL: NULL rows exist';
      END IF;
      ALTER TABLE jobs ALTER COLUMN customer_id SET NOT NULL;
    END $$;
  `);

  await knex.raw(`
    DO $$
    DECLARE has_nulls BOOLEAN;
    BEGIN
      SELECT EXISTS (SELECT 1 FROM messages WHERE conversation_id IS NULL OR sender_id IS NULL) INTO has_nulls;
      IF has_nulls THEN
        RAISE EXCEPTION 'Cannot enforce messages NOT NULL keys: NULL rows exist';
      END IF;
      ALTER TABLE messages ALTER COLUMN conversation_id SET NOT NULL;
      ALTER TABLE messages ALTER COLUMN sender_id SET NOT NULL;
    END $$;
  `);

  await knex.raw(`
    DO $$
    DECLARE has_nulls BOOLEAN;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM reviews
        WHERE job_id IS NULL OR reviewer_id IS NULL OR reviewee_id IS NULL OR rating IS NULL
      ) INTO has_nulls;
      IF has_nulls THEN
        RAISE EXCEPTION 'Cannot enforce reviews NOT NULL keys: NULL rows exist';
      END IF;
      ALTER TABLE reviews ALTER COLUMN job_id SET NOT NULL;
      ALTER TABLE reviews ALTER COLUMN reviewer_id SET NOT NULL;
      ALTER TABLE reviews ALTER COLUMN reviewee_id SET NOT NULL;
      ALTER TABLE reviews ALTER COLUMN rating SET NOT NULL;
    END $$;
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_job_provider_hardening
      ON quotes(job_id, provider_id);
  `);
};

exports.down = async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS uq_quotes_job_provider_hardening;');
  await knex.raw('ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewee_id_fk_hardening;');
  await knex.raw('ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fk_hardening;');
  await knex.raw('ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_job_id_fk_hardening;');
  await knex.raw('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fk_hardening;');
  await knex.raw('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fk_hardening;');
  await knex.raw('ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_category_id_fk_hardening;');
  await knex.raw('ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_customer_id_fk_hardening;');
};

import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE customer_profiles
      DROP CONSTRAINT IF EXISTS customer_profiles_avg_rating_check;

    ALTER TABLE provider_profiles
      DROP CONSTRAINT IF EXISTS provider_profiles_avg_rating_check;

    ALTER TABLE reviews
      DROP CONSTRAINT IF EXISTS reviews_rating_check,
      DROP CONSTRAINT IF EXISTS reviews_rating_quality_check,
      DROP CONSTRAINT IF EXISTS reviews_rating_timeliness_check,
      DROP CONSTRAINT IF EXISTS reviews_rating_communication_check,
      DROP CONSTRAINT IF EXISTS reviews_rating_value_check;
  `);

  pgm.sql(`
    ALTER TABLE customer_profiles
      ALTER COLUMN avg_rating TYPE NUMERIC(4,2);

    ALTER TABLE provider_profiles
      ALTER COLUMN avg_rating TYPE NUMERIC(4,2);
  `);

  pgm.sql(`
    UPDATE customer_profiles
    SET avg_rating = ROUND((avg_rating * 2)::NUMERIC, 2)
    WHERE avg_rating IS NOT NULL;

    UPDATE provider_profiles
    SET avg_rating = ROUND((avg_rating * 2)::NUMERIC, 2)
    WHERE avg_rating IS NOT NULL;

    UPDATE reviews
    SET
      rating = rating * 2,
      rating_quality = CASE WHEN rating_quality IS NULL THEN NULL ELSE rating_quality * 2 END,
      rating_timeliness = CASE WHEN rating_timeliness IS NULL THEN NULL ELSE rating_timeliness * 2 END,
      rating_communication = CASE WHEN rating_communication IS NULL THEN NULL ELSE rating_communication * 2 END,
      rating_value = CASE WHEN rating_value IS NULL THEN NULL ELSE rating_value * 2 END;
  `);

  pgm.sql(`
    ALTER TABLE customer_profiles
      ADD CONSTRAINT customer_profiles_avg_rating_check
      CHECK (avg_rating BETWEEN 0 AND 10);

    ALTER TABLE provider_profiles
      ADD CONSTRAINT provider_profiles_avg_rating_check
      CHECK (avg_rating BETWEEN 0 AND 10);

    ALTER TABLE reviews
      ADD CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 10),
      ADD CONSTRAINT reviews_rating_quality_check CHECK (rating_quality BETWEEN 1 AND 10),
      ADD CONSTRAINT reviews_rating_timeliness_check CHECK (rating_timeliness BETWEEN 1 AND 10),
      ADD CONSTRAINT reviews_rating_communication_check CHECK (rating_communication BETWEEN 1 AND 10),
      ADD CONSTRAINT reviews_rating_value_check CHECK (rating_value BETWEEN 1 AND 10);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE customer_profiles
      DROP CONSTRAINT IF EXISTS customer_profiles_avg_rating_check;

    ALTER TABLE provider_profiles
      DROP CONSTRAINT IF EXISTS provider_profiles_avg_rating_check;

    ALTER TABLE reviews
      DROP CONSTRAINT IF EXISTS reviews_rating_check,
      DROP CONSTRAINT IF EXISTS reviews_rating_quality_check,
      DROP CONSTRAINT IF EXISTS reviews_rating_timeliness_check,
      DROP CONSTRAINT IF EXISTS reviews_rating_communication_check,
      DROP CONSTRAINT IF EXISTS reviews_rating_value_check;
  `);

  pgm.sql(`
    UPDATE customer_profiles
    SET avg_rating = ROUND((avg_rating / 2)::NUMERIC, 2)
    WHERE avg_rating IS NOT NULL;

    UPDATE provider_profiles
    SET avg_rating = ROUND((avg_rating / 2)::NUMERIC, 2)
    WHERE avg_rating IS NOT NULL;

    UPDATE reviews
    SET
      rating = GREATEST(1, ROUND((rating / 2.0))::INTEGER),
      rating_quality = CASE WHEN rating_quality IS NULL THEN NULL ELSE GREATEST(1, ROUND((rating_quality / 2.0))::INTEGER) END,
      rating_timeliness = CASE WHEN rating_timeliness IS NULL THEN NULL ELSE GREATEST(1, ROUND((rating_timeliness / 2.0))::INTEGER) END,
      rating_communication = CASE WHEN rating_communication IS NULL THEN NULL ELSE GREATEST(1, ROUND((rating_communication / 2.0))::INTEGER) END,
      rating_value = CASE WHEN rating_value IS NULL THEN NULL ELSE GREATEST(1, ROUND((rating_value / 2.0))::INTEGER) END;
  `);

  pgm.sql(`
    ALTER TABLE customer_profiles
      ALTER COLUMN avg_rating TYPE NUMERIC(3,2);

    ALTER TABLE provider_profiles
      ALTER COLUMN avg_rating TYPE NUMERIC(3,2);
  `);

  pgm.sql(`
    ALTER TABLE customer_profiles
      ADD CONSTRAINT customer_profiles_avg_rating_check
      CHECK (avg_rating BETWEEN 0 AND 5);

    ALTER TABLE provider_profiles
      ADD CONSTRAINT provider_profiles_avg_rating_check
      CHECK (avg_rating BETWEEN 0 AND 5);

    ALTER TABLE reviews
      ADD CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 5),
      ADD CONSTRAINT reviews_rating_quality_check CHECK (rating_quality BETWEEN 1 AND 5),
      ADD CONSTRAINT reviews_rating_timeliness_check CHECK (rating_timeliness BETWEEN 1 AND 5),
      ADD CONSTRAINT reviews_rating_communication_check CHECK (rating_communication BETWEEN 1 AND 5),
      ADD CONSTRAINT reviews_rating_value_check CHECK (rating_value BETWEEN 1 AND 5);
  `);
}

import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'message_type' AND e.enumlabel = 'voice'
      ) THEN
        ALTER TYPE message_type ADD VALUE 'voice';
      END IF;
    END
    $$;
  `);
}

export async function down(_pgm: MigrationBuilder): Promise<void> {
  // PostgreSQL enum values are not safely removable in down migrations.
}

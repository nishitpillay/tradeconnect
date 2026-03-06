import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE auth_tokens
      ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS token_family_id UUID,
      ADD COLUMN IF NOT EXISTS parent_token_id UUID REFERENCES auth_tokens(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS replaced_by_token_id UUID REFERENCES auth_tokens(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS device_id TEXT,
      ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS ip_hash TEXT,
      ADD COLUMN IF NOT EXISTS user_agent_hash TEXT;
  `);

  pgm.sql(`
    UPDATE auth_tokens
    SET issued_at = COALESCE(issued_at, created_at),
        last_used_at = COALESCE(last_used_at, used_at, created_at)
    WHERE token_type = 'refresh';
  `);

  pgm.sql(`
    UPDATE auth_tokens
    SET token_family_id = id
    WHERE token_type = 'refresh' AND token_family_id IS NULL;
  `);

  pgm.sql(`
    ALTER TABLE auth_tokens
      ALTER COLUMN issued_at SET NOT NULL;
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_family
      ON auth_tokens(token_family_id)
      WHERE token_type = 'refresh';
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_parent
      ON auth_tokens(parent_token_id)
      WHERE token_type = 'refresh';
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_refresh_active
      ON auth_tokens(user_id, token_family_id, created_at DESC)
      WHERE token_type = 'refresh' AND revoked_at IS NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS idx_auth_tokens_refresh_active;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_auth_tokens_parent;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_auth_tokens_family;`);

  pgm.sql(`
    ALTER TABLE auth_tokens
      DROP COLUMN IF EXISTS user_agent_hash,
      DROP COLUMN IF EXISTS ip_hash,
      DROP COLUMN IF EXISTS last_used_at,
      DROP COLUMN IF EXISTS issued_at,
      DROP COLUMN IF EXISTS device_id,
      DROP COLUMN IF EXISTS replaced_by_token_id,
      DROP COLUMN IF EXISTS parent_token_id,
      DROP COLUMN IF EXISTS token_family_id,
      DROP COLUMN IF EXISTS revoked_at;
  `);
}

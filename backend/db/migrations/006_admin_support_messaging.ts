/**
 * Migration 006: Admin Support Messaging
 *
 * Adds first-class admin support conversations alongside job-linked conversations.
 *
 * Changes:
 *  - conversations.job_id becomes nullable
 *  - conversations.conversation_type added ('job' | 'admin_support')
 *  - consistency constraint for job vs admin support conversations
 *  - unique index to prevent duplicate admin support threads per user/admin pair
 */

import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE conversations
      ALTER COLUMN job_id DROP NOT NULL;
  `);

  pgm.sql(`
    ALTER TABLE conversations
      ADD COLUMN conversation_type TEXT NOT NULL DEFAULT 'job'
      CHECK (conversation_type IN ('job', 'admin_support'));
  `);

  pgm.sql(`
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_type_job_consistency CHECK (
        (conversation_type = 'job' AND job_id IS NOT NULL) OR
        (conversation_type = 'admin_support' AND job_id IS NULL)
      );
  `);

  pgm.sql(`
    CREATE INDEX idx_conversations_type
      ON conversations(conversation_type, last_message_at DESC NULLS LAST);
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX idx_conversations_admin_support_unique
      ON conversations(customer_id, provider_id, conversation_type)
      WHERE conversation_type = 'admin_support';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS idx_conversations_admin_support_unique;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_conversations_type;`);
  pgm.sql(`ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_type_job_consistency;`);
  pgm.sql(`ALTER TABLE conversations DROP COLUMN IF EXISTS conversation_type;`);

  pgm.sql(`
    DELETE FROM conversations
    WHERE job_id IS NULL;
  `);

  pgm.sql(`
    ALTER TABLE conversations
      ALTER COLUMN job_id SET NOT NULL;
  `);
}


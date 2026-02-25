/**
 * Migration 001: PostgreSQL Extensions & ENUM Types
 *
 * Run order: FIRST — all subsequent migrations depend on these enums.
 *
 * Extensions required:
 *   - uuid-ossp  : uuid_generate_v4() for primary keys
 *   - pgcrypto   : gen_random_bytes(), encrypt() for PII fields
 *   - postgis    : GEOGRAPHY type for geo-radius job/provider matching
 *
 * node-pg-migrate: https://salsita.github.io/node-pg-migrate
 */

import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

// ---------------------------------------------------------------------------
// UP
// ---------------------------------------------------------------------------
export async function up(pgm: MigrationBuilder): Promise<void> {
  // ── Extensions ────────────────────────────────────────────────────────────
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS "postgis";`);

  // ── user_role ─────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE user_role AS ENUM (
      'customer',
      'provider',
      'admin'
    );
  `);

  // ── user_status ───────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE user_status AS ENUM (
      'active',
      'suspended',
      'banned',
      'pending_verification',
      'deleted'
    );
  `);

  // ── verification_status ───────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE verification_status AS ENUM (
      'unverified',
      'pending',
      'verified',
      'rejected'
    );
  `);

  // ── job_status ────────────────────────────────────────────────────────────
  // State machine transitions defined in application layer (see Section 8 of blueprint)
  pgm.sql(`
    CREATE TYPE job_status AS ENUM (
      'draft',
      'posted',
      'quoting',
      'awarded',
      'in_progress',
      'completed',
      'cancelled',
      'expired',
      'closed',
      'disputed'
    );
  `);

  // ── job_urgency ───────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE job_urgency AS ENUM (
      'emergency',
      'within_48h',
      'this_week',
      'this_month',
      'flexible'
    );
  `);

  // ── property_type ─────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE property_type AS ENUM (
      'house',
      'apartment',
      'townhouse',
      'commercial',
      'land',
      'other'
    );
  `);

  // ── quote_status ──────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE quote_status AS ENUM (
      'pending',
      'viewed',
      'shortlisted',
      'awarded',
      'rejected',
      'withdrawn',
      'expired'
    );
  `);

  // ── quote_type ────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE quote_type AS ENUM (
      'fixed',
      'estimate_range',
      'hourly',
      'call_for_quote'
    );
  `);

  // ── message_type ──────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE message_type AS ENUM (
      'text',
      'image',
      'system',
      'quote_event'
    );
  `);

  // ── notification_channel ──────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE notification_channel AS ENUM (
      'push',
      'email',
      'in_app'
    );
  `);

  // ── notification_type ─────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE notification_type AS ENUM (
      'quote_received',
      'quote_viewed',
      'quote_shortlisted',
      'quote_awarded',
      'quote_rejected',
      'quote_withdrawn',
      'job_posted',
      'job_awarded',
      'job_in_progress',
      'job_completed',
      'job_cancelled',
      'job_expired',
      'job_expiring_soon',
      'new_message',
      'review_received',
      'verification_approved',
      'verification_rejected',
      'dispute_opened',
      'dispute_resolved',
      'account_suspended',
      'account_warning',
      'account_banned'
    );
  `);

  // ── dispute_status ────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE dispute_status AS ENUM (
      'open',
      'investigating',
      'resolved',
      'closed'
    );
  `);

  // ── dispute_resolution ────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE dispute_resolution AS ENUM (
      'customer_favour',
      'provider_favour',
      'mutual',
      'no_action'
    );
  `);

  // ── report_status ─────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE report_status AS ENUM (
      'pending',
      'reviewed',
      'actioned',
      'dismissed'
    );
  `);

  // ── report_entity_type ────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE report_entity_type AS ENUM (
      'user',
      'job',
      'quote',
      'message',
      'review'
    );
  `);

  // ── audit_action ──────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE audit_action AS ENUM (
      'user_created',
      'user_updated',
      'user_suspended',
      'user_banned',
      'user_deleted',
      'job_created',
      'job_published',
      'job_updated',
      'job_awarded',
      'job_cancelled',
      'job_completed',
      'job_expired',
      'job_closed',
      'quote_submitted',
      'quote_updated',
      'quote_withdrawn',
      'quote_awarded',
      'quote_rejected',
      'message_sent',
      'message_deleted',
      'review_created',
      'review_deleted',
      'review_hidden',
      'verification_submitted',
      'verification_approved',
      'verification_rejected',
      'dispute_opened',
      'dispute_updated',
      'dispute_resolved',
      'report_submitted',
      'report_actioned',
      'admin_override'
    );
  `);

  // ── au_state ──────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TYPE au_state AS ENUM (
      'NSW',
      'VIC',
      'QLD',
      'WA',
      'SA',
      'TAS',
      'ACT',
      'NT'
    );
  `);

  // ── schema_migrations tracker (if not using node-pg-migrate's built-in) ──
  // node-pg-migrate manages its own pgmigrations table; this is for reference
  // only — do not duplicate if using node-pg-migrate's CLI.
}

// ---------------------------------------------------------------------------
// DOWN — drop in reverse dependency order
// ---------------------------------------------------------------------------
export async function down(pgm: MigrationBuilder): Promise<void> {
  const enums = [
    'au_state',
    'audit_action',
    'report_entity_type',
    'report_status',
    'dispute_resolution',
    'dispute_status',
    'notification_type',
    'notification_channel',
    'message_type',
    'quote_type',
    'quote_status',
    'property_type',
    'job_urgency',
    'job_status',
    'verification_status',
    'user_status',
    'user_role',
  ];

  for (const e of enums) {
    pgm.sql(`DROP TYPE IF EXISTS ${e} CASCADE;`);
  }

  pgm.sql(`DROP EXTENSION IF EXISTS "postgis" CASCADE;`);
  pgm.sql(`DROP EXTENSION IF EXISTS "pgcrypto" CASCADE;`);
  pgm.sql(`DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;`);
}

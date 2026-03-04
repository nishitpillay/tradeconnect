/**
 * Migration 004: Messaging, Reviews, Verifications & Moderation Tables
 *
 * Tables created:
 *   - conversations      One conversation per (job, customer, provider) triple
 *   - messages           Individual messages within a conversation
 *   - reviews            Post-job ratings (customer → provider)
 *   - verifications      Document submission records for provider verification
 *   - disputes           Raised by either party; resolved by admin
 *   - reports            User-reported content (jobs/messages/reviews/users)
 *   - notifications      All notification records (push / email / in-app)
 *   - audit_logs         Immutable compliance audit trail
 *   - rate_limit_events  Sliding-window counter for abuse prevention
 *   - saved_searches     Provider job alert preferences
 *
 * Security notes:
 *   - audit_logs has NO DELETE privilege granted to the app role (see grants below)
 *   - messages.body has NO full-text index — prevents PII leaking into indexes
 *   - rate_limit_events uses upsert pattern (no heap bloat from per-request inserts)
 *
 * Depends on: 001_extensions_enums, 002_user_tables, 003_job_quote_tables
 */

import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

// ---------------------------------------------------------------------------
// UP
// ---------------------------------------------------------------------------
export async function up(pgm: MigrationBuilder): Promise<void> {

  // ── conversations ──────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE conversations (
      id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_id            UUID        NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
      customer_id       UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      provider_id       UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      quote_id          UUID        REFERENCES quotes(id) ON DELETE SET NULL,
      last_message_at   TIMESTAMPTZ,
      customer_unread   INTEGER     NOT NULL DEFAULT 0 CHECK (customer_unread >= 0),
      provider_unread   INTEGER     NOT NULL DEFAULT 0 CHECK (provider_unread >= 0),
      is_archived       BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      -- One conversation per job-customer-provider triple
      UNIQUE (job_id, customer_id, provider_id),
      CONSTRAINT conversation_different_users CHECK (customer_id <> provider_id)
    );
  `);

  pgm.sql(`CREATE INDEX idx_conversations_customer
             ON conversations(customer_id, last_message_at DESC)
             WHERE is_archived = FALSE;`);
  pgm.sql(`CREATE INDEX idx_conversations_provider
             ON conversations(provider_id, last_message_at DESC)
             WHERE is_archived = FALSE;`);
  pgm.sql(`CREATE INDEX idx_conversations_job
             ON conversations(job_id);`);
  pgm.sql(`CREATE INDEX idx_conversations_unread_customer
             ON conversations(customer_id)
             WHERE customer_unread > 0;`);
  pgm.sql(`CREATE INDEX idx_conversations_unread_provider
             ON conversations(provider_id)
             WHERE provider_unread > 0;`);

  // ── messages ───────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE messages (
      id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id   UUID          NOT NULL REFERENCES conversations(id) ON DELETE RESTRICT,
      sender_id         UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      message_type      message_type  NOT NULL DEFAULT 'text',
      body              TEXT          CHECK (char_length(body) <= 5000),
      attachment_url    TEXT,
      attachment_mime   TEXT,

      -- Lifecycle
      is_deleted        BOOLEAN       NOT NULL DEFAULT FALSE,
      deleted_at        TIMESTAMPTZ,
      deleted_by        UUID          REFERENCES users(id) ON DELETE SET NULL,

      -- PII detection (applied by onMessageSent cloud function)
      pii_detected      BOOLEAN       NOT NULL DEFAULT FALSE,
      pii_blocked       BOOLEAN       NOT NULL DEFAULT FALSE,

      -- Moderation
      is_flagged        BOOLEAN       NOT NULL DEFAULT FALSE,

      -- Read tracking (denormalised; conversations table tracks unread counts)
      read_by_recipient_at TIMESTAMPTZ,

      created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

      CONSTRAINT message_has_content CHECK (
        (body IS NOT NULL AND char_length(body) > 0)
        OR attachment_url IS NOT NULL
        OR message_type IN ('system', 'quote_event')
      )
    );
  `);

  pgm.sql(`CREATE INDEX idx_messages_conversation
             ON messages(conversation_id, created_at ASC)
             WHERE is_deleted = FALSE;`);
  pgm.sql(`CREATE INDEX idx_messages_sender
             ON messages(sender_id);`);
  pgm.sql(`CREATE INDEX idx_messages_flagged
             ON messages(is_flagged)
             WHERE is_flagged = TRUE AND is_deleted = FALSE;`);
  pgm.sql(`CREATE INDEX idx_messages_pii
             ON messages(pii_detected)
             WHERE pii_detected = TRUE;`);
  // Note: NO full-text index on body column (would index PII)

  // Trigger: increment unread count on parent conversation
  pgm.sql(`
    CREATE OR REPLACE FUNCTION messages_increment_unread()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.pii_blocked = FALSE AND NEW.message_type <> 'system' THEN
        UPDATE conversations SET
          last_message_at = NEW.created_at,
          customer_unread = CASE
            WHEN customer_id = NEW.sender_id THEN customer_unread
            ELSE customer_unread + 1
          END,
          provider_unread = CASE
            WHEN provider_id = NEW.sender_id THEN provider_unread
            ELSE provider_unread + 1
          END
        WHERE id = NEW.conversation_id;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER messages_on_insert
      AFTER INSERT ON messages
      FOR EACH ROW EXECUTE FUNCTION messages_increment_unread();
  `);

  // ── reviews ────────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE reviews (
      id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_id                UUID        NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
      quote_id              UUID        REFERENCES quotes(id) ON DELETE SET NULL,

      -- Parties
      reviewer_id           UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      reviewee_id           UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

      -- Ratings (overall + dimension breakdown)
      rating                INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
      rating_quality        INTEGER     CHECK (rating_quality BETWEEN 1 AND 5),
      rating_timeliness     INTEGER     CHECK (rating_timeliness BETWEEN 1 AND 5),
      rating_communication  INTEGER     CHECK (rating_communication BETWEEN 1 AND 5),
      rating_value          INTEGER     CHECK (rating_value BETWEEN 1 AND 5),

      -- Content
      body                  TEXT        CHECK (char_length(body) <= 2000),
      provider_response     TEXT        CHECK (char_length(provider_response) <= 1000),
      provider_responded_at TIMESTAMPTZ,

      -- Trust signals
      is_verified           BOOLEAN     NOT NULL DEFAULT TRUE,  -- linked to real job
      is_flagged            BOOLEAN     NOT NULL DEFAULT FALSE,
      is_hidden             BOOLEAN     NOT NULL DEFAULT FALSE,  -- admin takedown

      -- Timestamps
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      -- One review per job per reviewer
      UNIQUE (job_id, reviewer_id, reviewee_id),
      CONSTRAINT review_different_users CHECK (reviewer_id <> reviewee_id)
    );
  `);

  pgm.sql(`CREATE INDEX idx_reviews_reviewee
             ON reviews(reviewee_id, created_at DESC)
             WHERE is_hidden = FALSE;`);
  pgm.sql(`CREATE INDEX idx_reviews_reviewer
             ON reviews(reviewer_id);`);
  pgm.sql(`CREATE INDEX idx_reviews_job
             ON reviews(job_id);`);
  pgm.sql(`CREATE INDEX idx_reviews_flagged
             ON reviews(is_flagged) WHERE is_flagged = TRUE;`);

  pgm.sql(`
    CREATE TRIGGER reviews_set_updated_at
      BEFORE UPDATE ON reviews
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  `);

  // Trigger: recompute avg_rating on provider_profiles after each review upsert
  pgm.sql(`
    CREATE OR REPLACE FUNCTION reviews_update_provider_stats()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE provider_profiles SET
        avg_rating    = (
          SELECT ROUND(AVG(rating)::NUMERIC, 2)
          FROM reviews
          WHERE reviewee_id = COALESCE(NEW.reviewee_id, OLD.reviewee_id)
            AND is_hidden = FALSE
        ),
        total_reviews = (
          SELECT COUNT(*)
          FROM reviews
          WHERE reviewee_id = COALESCE(NEW.reviewee_id, OLD.reviewee_id)
            AND is_hidden = FALSE
        )
      WHERE user_id = COALESCE(NEW.reviewee_id, OLD.reviewee_id);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER reviews_after_change
      AFTER INSERT OR UPDATE OR DELETE ON reviews
      FOR EACH ROW EXECUTE FUNCTION reviews_update_provider_stats();
  `);

  // ── verifications ──────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE verifications (
      id                  UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
      provider_id         UUID                  NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      verification_type   TEXT                  NOT NULL
                                                CHECK (verification_type IN (
                                                  'identity',
                                                  'trade_license',
                                                  'insurance',
                                                  'abn'
                                                )),
      status              verification_status   NOT NULL DEFAULT 'pending',
      document_type       TEXT
                                                CHECK (document_type IN (
                                                  'passport',
                                                  'drivers_licence',
                                                  'medicare_card',
                                                  'birth_certificate',
                                                  'license_certificate',
                                                  'insurance_policy',
                                                  'abn_registration',
                                                  'other'
                                                )),
      s3_key              TEXT,
      cdn_url             TEXT,
      file_mime           TEXT,
      scan_passed         BOOLEAN,
      submitted_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
      reviewed_by         UUID                  REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at         TIMESTAMPTZ,
      rejection_reason    TEXT                  CHECK (char_length(rejection_reason) <= 1000),
      admin_notes         TEXT                  CHECK (char_length(admin_notes) <= 2000),
      expires_at          DATE,
      created_at          TIMESTAMPTZ           NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`CREATE INDEX idx_verifications_provider
             ON verifications(provider_id, verification_type);`);
  pgm.sql(`CREATE INDEX idx_verifications_status
             ON verifications(status)
             WHERE status = 'pending';`);
  pgm.sql(`CREATE INDEX idx_verifications_expires
             ON verifications(expires_at)
             WHERE expires_at IS NOT NULL AND status = 'verified';`);

  // ── disputes ───────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE disputes (
      id                  UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_id              UUID                NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
      raised_by           UUID                NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      against_user        UUID                NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      status              dispute_status      NOT NULL DEFAULT 'open',
      resolution          dispute_resolution,
      reason              TEXT                NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 2000),
      evidence_urls       TEXT[]              NOT NULL DEFAULT '{}',
      admin_notes         TEXT                CHECK (char_length(admin_notes) <= 5000),
      resolved_by         UUID                REFERENCES users(id) ON DELETE SET NULL,
      resolved_at         TIMESTAMPTZ,
      created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

      CONSTRAINT dispute_different_parties CHECK (raised_by <> against_user)
    );
  `);

  pgm.sql(`CREATE INDEX idx_disputes_status
             ON disputes(status)
             WHERE status IN ('open','investigating');`);
  pgm.sql(`CREATE INDEX idx_disputes_job
             ON disputes(job_id);`);
  pgm.sql(`CREATE INDEX idx_disputes_raised_by
             ON disputes(raised_by);`);

  pgm.sql(`
    CREATE TRIGGER disputes_set_updated_at
      BEFORE UPDATE ON disputes
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  `);

  // ── reports ────────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE reports (
      id                UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
      reporter_id       UUID                NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      entity_type       report_entity_type  NOT NULL,
      entity_id         UUID                NOT NULL,
      reason_code       TEXT                NOT NULL
                                            CHECK (reason_code IN (
                                              'spam',
                                              'offensive',
                                              'off_platform_contact',
                                              'misleading',
                                              'fake_fraudulent',
                                              'inappropriate_photo',
                                              'other'
                                            )),
      reason_detail     TEXT                CHECK (char_length(reason_detail) <= 500),
      status            report_status       NOT NULL DEFAULT 'pending',
      reviewed_by       UUID                REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at       TIMESTAMPTZ,
      action_taken      TEXT                CHECK (action_taken IN (
                                              'dismissed',
                                              'warned',
                                              'content_removed',
                                              'user_suspended',
                                              'user_banned'
                                            )),
      created_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

      -- Prevent duplicate reports from same user on same entity
      UNIQUE (reporter_id, entity_type, entity_id)
    );
  `);

  pgm.sql(`CREATE INDEX idx_reports_status
             ON reports(status, created_at ASC)
             WHERE status = 'pending';`);
  pgm.sql(`CREATE INDEX idx_reports_entity
             ON reports(entity_type, entity_id);`);
  pgm.sql(`CREATE INDEX idx_reports_reporter
             ON reports(reporter_id);`);

  // Trigger: auto-flag entity when >= 3 pending reports
  pgm.sql(`
    CREATE OR REPLACE FUNCTION reports_auto_flag_entity()
    RETURNS TRIGGER AS $$
    DECLARE
      report_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO report_count
      FROM reports
      WHERE entity_type = NEW.entity_type
        AND entity_id   = NEW.entity_id
        AND status      = 'pending';

      IF report_count >= 3 THEN
        -- Flag the entity in its own table
        CASE NEW.entity_type::TEXT
          WHEN 'job' THEN
            UPDATE jobs    SET is_flagged = TRUE WHERE id = NEW.entity_id;
          WHEN 'message' THEN
            UPDATE messages SET is_flagged = TRUE WHERE id = NEW.entity_id;
          WHEN 'review' THEN
            UPDATE reviews SET is_flagged = TRUE WHERE id = NEW.entity_id;
          WHEN 'quote' THEN
            UPDATE quotes  SET is_flagged = TRUE WHERE id = NEW.entity_id;
          ELSE
            NULL; -- 'user' flagging handled in application layer (requires token invalidation)
        END CASE;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER reports_after_insert
      AFTER INSERT ON reports
      FOR EACH ROW EXECUTE FUNCTION reports_auto_flag_entity();
  `);

  // ── notifications ──────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE notifications (
      id                UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id           UUID                  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type              notification_type     NOT NULL,
      channel           notification_channel  NOT NULL,
      title             TEXT                  NOT NULL CHECK (char_length(title) <= 200),
      body              TEXT                  NOT NULL CHECK (char_length(body) <= 500),
      -- Deep link / action data (JSON: { screen, params })
      data              JSONB,
      -- Delivery status
      is_read           BOOLEAN               NOT NULL DEFAULT FALSE,
      read_at           TIMESTAMPTZ,
      sent_at           TIMESTAMPTZ,
      failed            BOOLEAN               NOT NULL DEFAULT FALSE,
      failure_reason    TEXT,
      -- Timestamps
      created_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`CREATE INDEX idx_notifications_user_unread
             ON notifications(user_id, created_at DESC)
             WHERE is_read = FALSE;`);
  pgm.sql(`CREATE INDEX idx_notifications_user_all
             ON notifications(user_id, created_at DESC);`);
  pgm.sql(`CREATE INDEX idx_notifications_type
             ON notifications(type, created_at DESC);`);
  pgm.sql(`CREATE INDEX idx_notifications_failed
             ON notifications(failed)
             WHERE failed = TRUE;`);

  // Auto-prune old read notifications (keep 90 days of read, 365 of unread)
  pgm.sql(`
    CREATE OR REPLACE FUNCTION notifications_prune_old()
    RETURNS void AS $$
    BEGIN
      DELETE FROM notifications
      WHERE (is_read = TRUE  AND created_at < NOW() - INTERVAL '90 days')
         OR (is_read = FALSE AND created_at < NOW() - INTERVAL '365 days');
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ── audit_logs ─────────────────────────────────────────────────────────────
  // BIGSERIAL for high insert throughput; UUID PK avoided here intentionally.
  // Immutable: application role has INSERT only (no UPDATE/DELETE).
  pgm.sql(`
    CREATE TABLE audit_logs (
      id            BIGSERIAL       PRIMARY KEY,
      action        audit_action    NOT NULL,
      actor_id      UUID            REFERENCES users(id) ON DELETE SET NULL,
      actor_role    user_role,
      target_type   TEXT,
      target_id     UUID,
      before_state  JSONB,
      after_state   JSONB,
      -- Request metadata
      ip_address    TEXT,
      user_agent    TEXT,
      request_id    TEXT,           -- correlation ID from X-Request-ID header
      session_id    TEXT,
      -- Timestamp only (no updated_at — audit logs are immutable)
      created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`CREATE INDEX idx_audit_logs_actor
             ON audit_logs(actor_id, created_at DESC);`);
  pgm.sql(`CREATE INDEX idx_audit_logs_target
             ON audit_logs(target_type, target_id, created_at DESC);`);
  pgm.sql(`CREATE INDEX idx_audit_logs_action
             ON audit_logs(action, created_at DESC);`);
  pgm.sql(`CREATE INDEX idx_audit_logs_created
             ON audit_logs(created_at DESC);`);

  // Partition suggestion: in production, partition audit_logs by month:
  //   ALTER TABLE audit_logs PARTITION BY RANGE (created_at);
  // Omitted here to keep migrations simple; add in a future migration when volume demands it.

  // ── rate_limit_events ──────────────────────────────────────────────────────
  // Sliding window counters. Rows represent (user/ip, action, window_start) tuples.
  // Application uses ON CONFLICT DO UPDATE to increment count atomically.
  pgm.sql(`
    CREATE TABLE rate_limit_events (
      id            BIGSERIAL   PRIMARY KEY,
      user_id       UUID        REFERENCES users(id) ON DELETE CASCADE,
      ip_address    TEXT,
      action_key    TEXT        NOT NULL
                                CHECK (action_key IN (
                                  'post_job',
                                  'post_job_weekly',
                                  'submit_quote',
                                  'submit_quote_weekly',
                                  'send_message',
                                  'send_message_global',
                                  'login_attempt',
                                  'register',
                                  'password_reset',
                                  'phone_otp',
                                  'submit_report',
                                  'upload_file'
                                )),
      window_start  TIMESTAMPTZ NOT NULL,
      count         INTEGER     NOT NULL DEFAULT 1 CHECK (count > 0),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Unique constraint for upsert pattern
  pgm.sql(`
    CREATE UNIQUE INDEX idx_rate_limit_user_action_window
      ON rate_limit_events(user_id, action_key, window_start)
      WHERE user_id IS NOT NULL;
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX idx_rate_limit_ip_action_window
      ON rate_limit_events(ip_address, action_key, window_start)
      WHERE user_id IS NULL AND ip_address IS NOT NULL;
  `);
  // Cleanup index uses plain btree; time-based predicates require IMMUTABLE functions in PG
  pgm.sql(`CREATE INDEX idx_rate_limit_cleanup
             ON rate_limit_events(window_start);`);

  // ── saved_searches ─────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE saved_searches (
      id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      provider_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name            TEXT        CHECK (char_length(name) <= 100),
      -- Filter criteria
      category_ids    UUID[]      NOT NULL DEFAULT '{}',
      states          au_state[]  NOT NULL DEFAULT '{}',
      postcode        TEXT        CHECK (postcode IS NULL OR postcode ~ '^\\d{4}$'),
      radius_km       INTEGER     CHECK (radius_km BETWEEN 5 AND 500),
      urgency_filter  job_urgency[],
      budget_min      INTEGER     CHECK (budget_min > 0),
      budget_max      INTEGER     CHECK (budget_max > 0),
      -- Alert settings
      alert_enabled   BOOLEAN     NOT NULL DEFAULT TRUE,
      last_alerted_at TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT budget_order CHECK (
        budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max
      )
    );
  `);

  pgm.sql(`CREATE INDEX idx_saved_searches_provider
             ON saved_searches(provider_id);`);
  pgm.sql(`CREATE INDEX idx_saved_searches_alerts
             ON saved_searches(alert_enabled)
             WHERE alert_enabled = TRUE;`);

  pgm.sql(`
    CREATE TRIGGER saved_searches_set_updated_at
      BEFORE UPDATE ON saved_searches
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  `);

  // ── PII violation counter (denormalised for fast lookup) ───────────────────
  pgm.sql(`
    CREATE TABLE pii_violations (
      user_id       UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      count         INTEGER     NOT NULL DEFAULT 0 CHECK (count >= 0),
      last_at       TIMESTAMPTZ,
      auto_flagged  BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`CREATE INDEX idx_pii_violations_auto_flagged
             ON pii_violations(auto_flagged)
             WHERE auto_flagged = TRUE;`);

  // ── DB-level role grants ───────────────────────────────────────────────────
  // The app connects as 'tc_app' role; audit_logs is INSERT-only for this role.
  // In production: CREATE ROLE tc_app LOGIN; then apply grants below.
  // Uncomment these lines when running against a real production DB.
  /*
  pgm.sql(`
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON ALL TABLES IN SCHEMA public TO tc_app;
    REVOKE UPDATE, DELETE ON audit_logs FROM tc_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tc_app;
  `);
  */
}

// ---------------------------------------------------------------------------
// DOWN
// ---------------------------------------------------------------------------
export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS pii_violations      CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS saved_searches      CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS rate_limit_events   CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS audit_logs          CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS notifications       CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS reports             CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS disputes            CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS verifications       CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS reviews             CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS messages            CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS conversations       CASCADE;`);

  pgm.sql(`DROP FUNCTION IF EXISTS notifications_prune_old        CASCADE;`);
  pgm.sql(`DROP FUNCTION IF EXISTS reports_auto_flag_entity       CASCADE;`);
  pgm.sql(`DROP FUNCTION IF EXISTS reviews_update_provider_stats  CASCADE;`);
  pgm.sql(`DROP FUNCTION IF EXISTS messages_increment_unread      CASCADE;`);
}

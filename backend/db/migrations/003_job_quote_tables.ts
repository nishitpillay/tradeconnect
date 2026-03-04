/**
 * Migration 003: Job, Quote & Attachment Tables
 *
 * Tables created:
 *   - jobs             Core job record; centre of the marketplace
 *   - job_attachments  Photos/docs attached to a job
 *   - quotes           Provider bids on a job
 *   - quote_attachments  Docs attached to a quote (e.g. scope PDF)
 *   - job_milestones   Provider-created progress checkpoints
 *
 * Security notes:
 *   - exact_address stored as pgcrypto-encrypted bytea using app_secret_key
 *   - suburb + postcode are the only location fields visible pre-award
 *   - job_location (PostGIS) is derived from suburb centroid (not exact address)
 *   - awarded_quote_id FK is DEFERRABLE to handle circular dependency between
 *     jobs and quotes at insert time
 *
 * Depends on: 001_extensions_enums, 002_user_tables
 */

import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

// ---------------------------------------------------------------------------
// UP
// ---------------------------------------------------------------------------
export async function up(pgm: MigrationBuilder): Promise<void> {

  // ── jobs ───────────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE jobs (
      id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),

      -- Ownership
      customer_id           UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

      -- Category
      category_id           UUID          NOT NULL REFERENCES job_categories(id) ON DELETE RESTRICT,
      subcategory_id        UUID          REFERENCES job_categories(id) ON DELETE SET NULL,

      -- Content
      title                 TEXT          NOT NULL
                                          CHECK (char_length(title) BETWEEN 5 AND 200),
      description           TEXT          NOT NULL
                                          CHECK (char_length(description) BETWEEN 20 AND 5000),

      -- Lifecycle
      status                job_status    NOT NULL DEFAULT 'draft',
      urgency               job_urgency   NOT NULL DEFAULT 'flexible',
      property_type         property_type,

      -- Public location (suburb-level — safe to expose pre-award)
      suburb                TEXT          NOT NULL CHECK (char_length(suburb) BETWEEN 2 AND 100),
      postcode              TEXT          NOT NULL CHECK (postcode ~ '^\\d{4}$'),
      state                 au_state      NOT NULL,

      -- Suburb centroid (used for provider distance calculations; NOT exact address)
      -- Populated from a suburb-to-latlong lookup on job creation.
      suburb_lat            NUMERIC(10,7),
      suburb_lng            NUMERIC(10,7),
      job_location          GEOGRAPHY(POINT, 4326),

      -- Encrypted exact address (revealed only to awarded provider)
      -- Encrypted with: pgp_sym_encrypt(address, current_setting('app.secret_key'))
      -- Decrypted with: pgp_sym_decrypt(exact_address_enc, current_setting('app.secret_key'))
      exact_address_enc     BYTEA,

      -- Budget (in AUD cents; null = not specified)
      budget_min            INTEGER       CHECK (budget_min > 0),
      budget_max            INTEGER       CHECK (budget_max > 0),
      budget_is_gst         BOOLEAN       NOT NULL DEFAULT FALSE,

      -- Scheduling preferences
      preferred_start_date  DATE,
      preferred_end_date    DATE,
      time_window_notes     TEXT          CHECK (char_length(time_window_notes) <= 500),

      -- Quote management
      quote_count           INTEGER       NOT NULL DEFAULT 0 CHECK (quote_count >= 0),
      -- awarded_quote_id added as ALTER below (circular FK, DEFERRABLE)
      awarded_provider_id   UUID          REFERENCES users(id) ON DELETE SET NULL,
      awarded_at            TIMESTAMPTZ,

      -- Lifecycle timestamps
      published_at          TIMESTAMPTZ,
      expires_at            TIMESTAMPTZ,
      completed_at          TIMESTAMPTZ,
      cancelled_at          TIMESTAMPTZ,
      cancellation_reason   TEXT          CHECK (char_length(cancellation_reason) <= 500),

      -- Moderation
      is_flagged            BOOLEAN       NOT NULL DEFAULT FALSE,
      view_count            INTEGER       NOT NULL DEFAULT 0 CHECK (view_count >= 0),

      -- Timestamps
      created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

      -- Constraints
      CONSTRAINT budget_order CHECK (
        budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max
      ),
      CONSTRAINT schedule_order CHECK (
        preferred_start_date IS NULL
        OR preferred_end_date IS NULL
        OR preferred_start_date <= preferred_end_date
      ),
      CONSTRAINT publish_requires_expiry CHECK (
        status = 'draft' OR expires_at IS NOT NULL
      )
    );
  `);

  // Indexes — performance critical (provider feed queries hit this table heavily)
  pgm.sql(`CREATE INDEX idx_jobs_customer
             ON jobs(customer_id);`);
  pgm.sql(`CREATE INDEX idx_jobs_status
             ON jobs(status)
             WHERE status NOT IN ('draft','closed','cancelled');`);
  pgm.sql(`CREATE INDEX idx_jobs_category
             ON jobs(category_id, status);`);
  pgm.sql(`CREATE INDEX idx_jobs_state
             ON jobs(state, status)
             WHERE status IN ('posted','quoting');`);
  pgm.sql(`CREATE INDEX idx_jobs_postcode
             ON jobs(postcode)
             WHERE status IN ('posted','quoting');`);
  pgm.sql(`CREATE INDEX idx_jobs_location
             ON jobs USING GIST(job_location)
             WHERE status IN ('posted','quoting');`);
  pgm.sql(`CREATE INDEX idx_jobs_expires
             ON jobs(expires_at)
             WHERE status IN ('posted','quoting');`);
  pgm.sql(`CREATE INDEX idx_jobs_created_desc
             ON jobs(created_at DESC)
             WHERE status IN ('posted','quoting');`);
  pgm.sql(`CREATE INDEX idx_jobs_urgency
             ON jobs(urgency, status);`);
  pgm.sql(`CREATE INDEX idx_jobs_awarded_provider
             ON jobs(awarded_provider_id)
             WHERE awarded_provider_id IS NOT NULL;`);
  pgm.sql(`CREATE INDEX idx_jobs_flagged
             ON jobs(is_flagged)
             WHERE is_flagged = TRUE;`);

  pgm.sql(`
    CREATE TRIGGER jobs_set_updated_at
      BEFORE UPDATE ON jobs
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  `);

  // Enforce immutable state transitions: draft → posted only; no going backwards
  // Application layer is the primary enforcer; DB trigger is a safety net.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION validate_job_status_transition()
    RETURNS TRIGGER AS $$
    DECLARE
      valid_transitions TEXT[][] := ARRAY[
        ARRAY['draft',       'posted'],
        ARRAY['draft',       'cancelled'],
        ARRAY['posted',      'quoting'],
        ARRAY['posted',      'cancelled'],
        ARRAY['posted',      'expired'],
        ARRAY['quoting',     'awarded'],
        ARRAY['quoting',     'cancelled'],
        ARRAY['quoting',     'expired'],
        ARRAY['awarded',     'in_progress'],
        ARRAY['awarded',     'cancelled'],
        ARRAY['in_progress', 'completed'],
        ARRAY['in_progress', 'disputed'],
        ARRAY['in_progress', 'cancelled'],
        ARRAY['completed',   'closed'],
        ARRAY['disputed',    'completed'],
        ARRAY['disputed',    'closed'],
        ARRAY['expired',     'closed'],
        ARRAY['cancelled',   'closed']
      ];
      pair TEXT[];
    BEGIN
      IF OLD.status = NEW.status THEN
        RETURN NEW;
      END IF;
      FOREACH pair SLICE 1 IN ARRAY valid_transitions LOOP
        IF pair[1] = OLD.status::TEXT AND pair[2] = NEW.status::TEXT THEN
          RETURN NEW;
        END IF;
      END LOOP;
      RAISE EXCEPTION 'Invalid job status transition: % → %', OLD.status, NEW.status;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER jobs_validate_status_transition
      BEFORE UPDATE OF status ON jobs
      FOR EACH ROW EXECUTE FUNCTION validate_job_status_transition();
  `);

  // ── quotes ─────────────────────────────────────────────────────────────────
  // Created BEFORE adding awarded_quote_id FK on jobs (circular dependency)
  pgm.sql(`
    CREATE TABLE quotes (
      id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_id              UUID          NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
      provider_id         UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

      -- Lifecycle
      status              quote_status  NOT NULL DEFAULT 'pending',
      quote_type          quote_type    NOT NULL DEFAULT 'fixed',

      -- Pricing (all amounts in AUD cents)
      price_fixed         INTEGER       CHECK (price_fixed > 0),
      price_min           INTEGER       CHECK (price_min > 0),
      price_max           INTEGER       CHECK (price_max > 0),
      hourly_rate         INTEGER       CHECK (hourly_rate > 0),
      is_gst_included     BOOLEAN       NOT NULL DEFAULT FALSE,

      -- Scope
      scope_notes         TEXT          CHECK (char_length(scope_notes) <= 3000),
      inclusions          TEXT          CHECK (char_length(inclusions) <= 1000),
      exclusions          TEXT          CHECK (char_length(exclusions) <= 1000),
      timeline_days       INTEGER       CHECK (timeline_days BETWEEN 1 AND 730),
      warranty_months     INTEGER       CHECK (warranty_months BETWEEN 0 AND 120),

      -- Lifecycle timestamps
      viewed_at           TIMESTAMPTZ,
      shortlisted_at      TIMESTAMPTZ,
      awarded_at          TIMESTAMPTZ,
      rejected_at         TIMESTAMPTZ,
      withdrawn_at        TIMESTAMPTZ,
      withdrawal_reason   TEXT          CHECK (char_length(withdrawal_reason) <= 500),
      expires_at          TIMESTAMPTZ,

      -- Moderation
      is_flagged          BOOLEAN       NOT NULL DEFAULT FALSE,

      -- Timestamps
      created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

      -- Constraints
      UNIQUE (job_id, provider_id),
      CONSTRAINT price_range_order CHECK (
        price_min IS NULL OR price_max IS NULL OR price_min <= price_max
      ),
      CONSTRAINT price_type_consistency CHECK (
        (quote_type = 'fixed'          AND price_fixed   IS NOT NULL) OR
        (quote_type = 'estimate_range' AND price_min     IS NOT NULL AND price_max IS NOT NULL) OR
        (quote_type = 'hourly'         AND hourly_rate   IS NOT NULL) OR
        (quote_type = 'call_for_quote')
      )
    );
  `);

  pgm.sql(`CREATE INDEX idx_quotes_job
             ON quotes(job_id, status);`);
  pgm.sql(`CREATE INDEX idx_quotes_provider
             ON quotes(provider_id, status);`);
  pgm.sql(`CREATE INDEX idx_quotes_status
             ON quotes(status)
             WHERE status NOT IN ('rejected','withdrawn','expired');`);
  pgm.sql(`CREATE INDEX idx_quotes_created_desc
             ON quotes(created_at DESC);`);
  pgm.sql(`CREATE INDEX idx_quotes_expires
             ON quotes(expires_at)
             WHERE status IN ('pending','viewed','shortlisted');`);

  pgm.sql(`
    CREATE TRIGGER quotes_set_updated_at
      BEFORE UPDATE ON quotes
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  `);

  // ── awarded_quote_id circular FK (DEFERRABLE) ─────────────────────────────
  // Deferred because during award transaction both tables update simultaneously.
  pgm.sql(`
    ALTER TABLE jobs
      ADD COLUMN awarded_quote_id UUID REFERENCES quotes(id)
        DEFERRABLE INITIALLY DEFERRED;
  `);

  pgm.sql(`CREATE INDEX idx_jobs_awarded_quote
             ON jobs(awarded_quote_id)
             WHERE awarded_quote_id IS NOT NULL;`);

  // ── job_attachments ────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE job_attachments (
      id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_id        UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      uploader_id   UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      file_type     TEXT        NOT NULL CHECK (file_type IN ('image','document')),
      mime_type     TEXT        NOT NULL CHECK (mime_type IN (
                                  'image/jpeg','image/png','image/webp','image/heic',
                                  'application/pdf'
                                )),
      s3_key        TEXT        NOT NULL UNIQUE,
      cdn_url       TEXT        NOT NULL,
      file_size     INTEGER     NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),  -- max 10 MB
      width         INTEGER     CHECK (width > 0),
      height        INTEGER     CHECK (height > 0),
      sort_order    INTEGER     NOT NULL DEFAULT 0,
      is_flagged    BOOLEAN     NOT NULL DEFAULT FALSE,
      scan_passed   BOOLEAN,    -- null=pending, true=clean, false=threat detected
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`CREATE INDEX idx_job_attachments_job
             ON job_attachments(job_id, sort_order);`);
  pgm.sql(`CREATE INDEX idx_job_attachments_scan
             ON job_attachments(scan_passed)
             WHERE scan_passed IS NULL;`);

  // ── quote_attachments ──────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE quote_attachments (
      id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      quote_id      UUID        NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      mime_type     TEXT        NOT NULL CHECK (mime_type IN (
                                  'image/jpeg','image/png','image/webp',
                                  'application/pdf'
                                )),
      s3_key        TEXT        NOT NULL UNIQUE,
      cdn_url       TEXT        NOT NULL,
      file_size     INTEGER     NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
      scan_passed   BOOLEAN,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`CREATE INDEX idx_quote_attachments_quote
             ON quote_attachments(quote_id);`);

  // ── job_milestones ─────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE job_milestones (
      id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_id        UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      provider_id   UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      title         TEXT        NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
      description   TEXT        CHECK (char_length(description) <= 1000),
      completed     BOOLEAN     NOT NULL DEFAULT FALSE,
      completed_at  TIMESTAMPTZ,
      sort_order    INTEGER     NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`CREATE INDEX idx_job_milestones_job
             ON job_milestones(job_id, sort_order);`);

  pgm.sql(`
    CREATE TRIGGER job_milestones_set_updated_at
      BEFORE UPDATE ON job_milestones
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  `);

  // ── Materialised view: provider feed summary ───────────────────────────────
  // Refreshed after each job publish; used for fast feed rendering.
  // In production, consider pg_cron or app-level refresh.
  pgm.sql(`
    CREATE MATERIALIZED VIEW job_feed_summary AS
    SELECT
      j.id,
      j.title,
      j.category_id,
      j.subcategory_id,
      j.status,
      j.urgency,
      j.suburb,
      j.postcode,
      j.state,
      j.suburb_lat,
      j.suburb_lng,
      j.job_location,
      j.budget_min,
      j.budget_max,
      j.budget_is_gst,
      j.quote_count,
      j.published_at,
      j.expires_at,
      j.preferred_start_date,
      j.property_type,
      -- Precompute photo count and first photo URL for feed cards
      COUNT(ja.id)::INTEGER                     AS photo_count,
      MIN(ja.cdn_url)                           AS preview_photo_url
    FROM jobs j
    LEFT JOIN job_attachments ja
           ON ja.job_id = j.id AND ja.file_type = 'image' AND ja.is_flagged = FALSE
    WHERE j.status IN ('posted', 'quoting')
      AND j.expires_at > NOW()
      AND j.is_flagged = FALSE
    GROUP BY j.id
    WITH NO DATA;
  `);

  pgm.sql(`CREATE UNIQUE INDEX ON job_feed_summary(id);`);
  pgm.sql(`CREATE INDEX ON job_feed_summary USING GIST(job_location);`);
  pgm.sql(`CREATE INDEX ON job_feed_summary(category_id, state);`);
  pgm.sql(`CREATE INDEX ON job_feed_summary(urgency, published_at DESC);`);

  // Initial population (empty on first migration; populated by onJobPublished)
  pgm.sql(`REFRESH MATERIALIZED VIEW job_feed_summary;`);
}

// ---------------------------------------------------------------------------
// DOWN
// ---------------------------------------------------------------------------
export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS job_feed_summary CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS job_milestones     CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS quote_attachments  CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS job_attachments    CASCADE;`);
  pgm.sql(`ALTER TABLE jobs DROP COLUMN IF EXISTS awarded_quote_id CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS quotes             CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS jobs               CASCADE;`);
  pgm.sql(`DROP FUNCTION IF EXISTS validate_job_status_transition CASCADE;`);
}

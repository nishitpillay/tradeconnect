/**
 * Migration 002: User, Auth & Profile Tables
 *
 * Tables created:
 *   - users                  Core identity record for all roles
 *   - auth_tokens            Email verify / phone OTP / password reset / refresh tokens
 *   - customer_profiles      Extended data for CUSTOMER role
 *   - job_categories         Taxonomy for job types (seeded separately)
 *   - provider_profiles      Extended data for PROVIDER role (with PostGIS service area)
 *   - provider_categories    Many-to-many: provider ↔ category
 *   - provider_licenses      Trade/contractor licence documents
 *   - provider_insurances    Insurance policy documents
 *
 * Security notes:
 *   - passwords stored as bcrypt hashes (password_hash column)
 *   - exact_address on jobs (migration 003) uses pgcrypto symmetric encryption
 *   - phone stored in E.164 format; never exposed in public API responses
 *   - deleted_at supports GDPR soft-delete; hard purge handled by scheduled job
 *
 * Depends on: 001_extensions_enums
 */

import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

// ---------------------------------------------------------------------------
// UP
// ---------------------------------------------------------------------------
export async function up(pgm: MigrationBuilder): Promise<void> {

  // ── users ──────────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE users (
      id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),

      -- Authentication
      email                 TEXT          NOT NULL,
      email_verified        BOOLEAN       NOT NULL DEFAULT FALSE,
      phone                 TEXT          CHECK (phone ~ '^\\+61[0-9]{9}$'),
      phone_verified        BOOLEAN       NOT NULL DEFAULT FALSE,
      password_hash         TEXT,

      -- Identity
      role                  user_role     NOT NULL,
      status                user_status   NOT NULL DEFAULT 'pending_verification',
      full_name             TEXT          NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
      display_name          TEXT          CHECK (char_length(display_name) <= 60),
      avatar_url            TEXT,

      -- Localisation
      timezone              TEXT          NOT NULL DEFAULT 'Australia/Sydney',

      -- Device tokens for push notifications
      fcm_token             TEXT,
      apns_token            TEXT,

      -- Preferences
      push_enabled          BOOLEAN       NOT NULL DEFAULT TRUE,
      email_notifications   BOOLEAN       NOT NULL DEFAULT TRUE,

      -- Legal consent (timestamps prove consent at point-in-time)
      terms_accepted_at     TIMESTAMPTZ,
      privacy_accepted_at   TIMESTAMPTZ,
      marketing_consent     BOOLEAN       NOT NULL DEFAULT FALSE,

      -- Referrals
      referral_code         TEXT          UNIQUE,
      referred_by_user_id   UUID          REFERENCES users(id) ON DELETE SET NULL,

      -- Session tracking
      last_login_at         TIMESTAMPTZ,
      login_count           INTEGER       NOT NULL DEFAULT 0,

      -- Soft delete
      deleted_at            TIMESTAMPTZ,

      -- Timestamps
      created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

      -- Constraints
      CONSTRAINT users_email_unique UNIQUE (email),
      CONSTRAINT users_password_or_social CHECK (
        password_hash IS NOT NULL OR deleted_at IS NOT NULL
        -- allow null password_hash only if account is deleted
        -- social login (phase 2) will relax this constraint
      )
    );
  `);

  pgm.sql(`CREATE INDEX idx_users_email        ON users(email);`);
  pgm.sql(`CREATE INDEX idx_users_role         ON users(role);`);
  pgm.sql(`CREATE INDEX idx_users_status       ON users(status) WHERE deleted_at IS NULL;`);
  pgm.sql(`CREATE INDEX idx_users_phone        ON users(phone) WHERE phone IS NOT NULL;`);
  pgm.sql(`CREATE INDEX idx_users_referral     ON users(referral_code) WHERE referral_code IS NOT NULL;`);
  pgm.sql(`CREATE INDEX idx_users_active       ON users(created_at DESC) WHERE deleted_at IS NULL;`);

  // Auto-update updated_at on every row change
  pgm.sql(`
    CREATE OR REPLACE FUNCTION trigger_set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER users_set_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  `);

  // ── auth_tokens ───────────────────────────────────────────────────────────
  // Stores hashed tokens only — never the raw value.
  // token_hash = SHA-256 hex of the raw token sent to the user.
  pgm.sql(`
    CREATE TABLE auth_tokens (
      id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id       UUID        REFERENCES users(id) ON DELETE CASCADE,
      token_hash    TEXT        NOT NULL UNIQUE,
      token_type    TEXT        NOT NULL
                                CHECK (token_type IN (
                                  'email_verify',
                                  'phone_otp',
                                  'password_reset',
                                  'refresh'
                                )),
      expires_at    TIMESTAMPTZ NOT NULL,
      used_at       TIMESTAMPTZ,
      ip_address    TEXT,
      user_agent    TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`CREATE INDEX idx_auth_tokens_user    ON auth_tokens(user_id, token_type);`);
  pgm.sql(`CREATE INDEX idx_auth_tokens_hash    ON auth_tokens(token_hash);`);
  pgm.sql(`CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at)
             WHERE used_at IS NULL;`);

  // ── customer_profiles ─────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE customer_profiles (
      id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id         UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      suburb          TEXT,
      postcode        TEXT        CHECK (postcode ~ '^\\d{4}$'),
      state           au_state,
      jobs_posted     INTEGER     NOT NULL DEFAULT 0 CHECK (jobs_posted >= 0),
      jobs_completed  INTEGER     NOT NULL DEFAULT 0 CHECK (jobs_completed >= 0),
      avg_rating      NUMERIC(3,2) CHECK (avg_rating BETWEEN 0 AND 5),
      total_reviews   INTEGER     NOT NULL DEFAULT 0 CHECK (total_reviews >= 0),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`CREATE INDEX idx_customer_profiles_user ON customer_profiles(user_id);`);

  pgm.sql(`
    CREATE TRIGGER customer_profiles_set_updated_at
      BEFORE UPDATE ON customer_profiles
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  `);

  // ── job_categories ────────────────────────────────────────────────────────
  // Seeded by 01_categories.ts; not modified by application at runtime.
  pgm.sql(`
    CREATE TABLE job_categories (
      id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      name        TEXT        NOT NULL UNIQUE,
      slug        TEXT        NOT NULL UNIQUE
                              CHECK (slug ~ '^[a-z0-9-]+$'),
      parent_id   UUID        REFERENCES job_categories(id) ON DELETE SET NULL,
      icon_name   TEXT,
      description TEXT        CHECK (char_length(description) <= 500),
      is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
      sort_order  INTEGER     NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`CREATE INDEX idx_job_categories_parent ON job_categories(parent_id);`);
  pgm.sql(`CREATE INDEX idx_job_categories_active ON job_categories(is_active, sort_order);`);
  pgm.sql(`CREATE INDEX idx_job_categories_slug   ON job_categories(slug);`);

  // ── provider_profiles ─────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE provider_profiles (
      id                      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id                 UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

      -- Business details
      business_name           TEXT          NOT NULL CHECK (char_length(business_name) BETWEEN 2 AND 200),
      abn                     TEXT          CHECK (abn ~ '^\\d{11}$'),
      abn_verified            BOOLEAN       NOT NULL DEFAULT FALSE,
      website_url             TEXT          CHECK (website_url ~ '^https?://'),
      bio                     TEXT          CHECK (char_length(bio) <= 2000),
      years_experience        INTEGER       CHECK (years_experience BETWEEN 0 AND 60),
      employee_count          INTEGER       CHECK (employee_count BETWEEN 1 AND 10000),

      -- Verification flags (set by admin after reviewing documents)
      verification_status     verification_status NOT NULL DEFAULT 'unverified',
      identity_verified       BOOLEAN       NOT NULL DEFAULT FALSE,
      license_verified        BOOLEAN       NOT NULL DEFAULT FALSE,
      insurance_verified      BOOLEAN       NOT NULL DEFAULT FALSE,

      -- Geographic service area
      -- service_location is the PostGIS point (centre of service area)
      -- service_radius_km is the radius providers are willing to travel
      service_lat             NUMERIC(10,7),
      service_lng             NUMERIC(10,7),
      service_location        GEOGRAPHY(POINT, 4326),
      service_radius_km       INTEGER       NOT NULL DEFAULT 50
                                            CHECK (service_radius_km BETWEEN 5 AND 500),
      service_suburbs         TEXT[],
      service_states          au_state[]    NOT NULL DEFAULT '{}',

      -- Pricing hints (for matching score; not a binding quote)
      hourly_rate_min         INTEGER       CHECK (hourly_rate_min > 0),
      hourly_rate_max         INTEGER       CHECK (hourly_rate_max > 0),

      -- Computed stats (refreshed nightly by recalculateProviderStats cron)
      quotes_submitted        INTEGER       NOT NULL DEFAULT 0 CHECK (quotes_submitted >= 0),
      jobs_won                INTEGER       NOT NULL DEFAULT 0 CHECK (jobs_won >= 0),
      jobs_completed          INTEGER       NOT NULL DEFAULT 0 CHECK (jobs_completed >= 0),
      avg_rating              NUMERIC(3,2)  CHECK (avg_rating BETWEEN 0 AND 5),
      total_reviews           INTEGER       NOT NULL DEFAULT 0 CHECK (total_reviews >= 0),
      response_rate           NUMERIC(5,2)  CHECK (response_rate BETWEEN 0 AND 100),
      avg_response_hours      NUMERIC(6,2)  CHECK (avg_response_hours >= 0),

      -- Flags
      featured                BOOLEAN       NOT NULL DEFAULT FALSE,
      available               BOOLEAN       NOT NULL DEFAULT TRUE,

      -- Timestamps
      created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

      -- Constraints
      CONSTRAINT hourly_rate_order CHECK (
        hourly_rate_min IS NULL
        OR hourly_rate_max IS NULL
        OR hourly_rate_min <= hourly_rate_max
      )
    );
  `);

  pgm.sql(`CREATE INDEX idx_provider_profiles_user
             ON provider_profiles(user_id);`);
  pgm.sql(`CREATE INDEX idx_provider_profiles_location
             ON provider_profiles USING GIST(service_location);`);
  pgm.sql(`CREATE INDEX idx_provider_profiles_verification
             ON provider_profiles(verification_status);`);
  pgm.sql(`CREATE INDEX idx_provider_profiles_states
             ON provider_profiles USING GIN(service_states);`);
  pgm.sql(`CREATE INDEX idx_provider_profiles_identity
             ON provider_profiles(identity_verified)
             WHERE identity_verified = TRUE;`);
  pgm.sql(`CREATE INDEX idx_provider_profiles_available
             ON provider_profiles(available, featured DESC, avg_rating DESC NULLS LAST);`);

  pgm.sql(`
    CREATE TRIGGER provider_profiles_set_updated_at
      BEFORE UPDATE ON provider_profiles
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  `);

  // Enforce hourly_rate_max >= hourly_rate_min at DB level
  pgm.sql(`
    CREATE OR REPLACE FUNCTION validate_provider_hourly_rate()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.hourly_rate_min IS NOT NULL AND NEW.hourly_rate_max IS NOT NULL
         AND NEW.hourly_rate_min > NEW.hourly_rate_max THEN
        RAISE EXCEPTION 'hourly_rate_min (%) must be <= hourly_rate_max (%)',
          NEW.hourly_rate_min, NEW.hourly_rate_max;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER provider_profiles_check_rates
      BEFORE INSERT OR UPDATE ON provider_profiles
      FOR EACH ROW EXECUTE FUNCTION validate_provider_hourly_rate();
  `);

  // ── provider_categories ───────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE provider_categories (
      provider_id   UUID  NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
      category_id   UUID  NOT NULL REFERENCES job_categories(id) ON DELETE CASCADE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (provider_id, category_id)
    );
  `);

  pgm.sql(`CREATE INDEX idx_provider_categories_category
             ON provider_categories(category_id);`);

  // ── provider_licenses ─────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE provider_licenses (
      id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      provider_id     UUID        NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
      license_type    TEXT        NOT NULL CHECK (char_length(license_type) BETWEEN 2 AND 200),
      license_number  TEXT        NOT NULL CHECK (char_length(license_number) BETWEEN 2 AND 100),
      issuing_state   au_state    NOT NULL,
      issuing_body    TEXT        CHECK (char_length(issuing_body) <= 200),
      expiry_date     DATE,
      s3_key          TEXT,
      cdn_url         TEXT,
      file_mime       TEXT        CHECK (file_mime IN ('application/pdf','image/jpeg','image/png','image/webp')),
      verified        BOOLEAN     NOT NULL DEFAULT FALSE,
      verified_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
      verified_at     TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT license_expiry_future CHECK (expiry_date IS NULL OR expiry_date > '2020-01-01')
    );
  `);

  pgm.sql(`CREATE INDEX idx_provider_licenses_provider
             ON provider_licenses(provider_id);`);
  pgm.sql(`CREATE INDEX idx_provider_licenses_expiry
             ON provider_licenses(expiry_date)
             WHERE expiry_date IS NOT NULL AND verified = TRUE;`);

  // ── provider_insurances ───────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE provider_insurances (
      id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      provider_id         UUID        NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
      insurance_type      TEXT        NOT NULL
                                      CHECK (insurance_type IN (
                                        'public_liability',
                                        'workers_compensation',
                                        'professional_indemnity',
                                        'tools_equipment',
                                        'other'
                                      )),
      insurer             TEXT        CHECK (char_length(insurer) <= 200),
      policy_number       TEXT        CHECK (char_length(policy_number) <= 100),
      coverage_amount     BIGINT      CHECK (coverage_amount > 0),
      expiry_date         DATE,
      s3_key              TEXT,
      cdn_url             TEXT,
      file_mime           TEXT        CHECK (file_mime IN ('application/pdf','image/jpeg','image/png','image/webp')),
      verified            BOOLEAN     NOT NULL DEFAULT FALSE,
      verified_by         UUID        REFERENCES users(id) ON DELETE SET NULL,
      verified_at         TIMESTAMPTZ,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT insurance_expiry_future CHECK (expiry_date IS NULL OR expiry_date > '2020-01-01')
    );
  `);

  pgm.sql(`CREATE INDEX idx_provider_insurances_provider
             ON provider_insurances(provider_id);`);
  pgm.sql(`CREATE INDEX idx_provider_insurances_expiry
             ON provider_insurances(expiry_date)
             WHERE expiry_date IS NOT NULL AND verified = TRUE;`);
}

// ---------------------------------------------------------------------------
// DOWN
// ---------------------------------------------------------------------------
export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS provider_insurances       CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS provider_licenses         CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS provider_categories       CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS provider_profiles         CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS job_categories            CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS customer_profiles         CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS auth_tokens               CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS users                     CASCADE;`);

  pgm.sql(`DROP FUNCTION IF EXISTS validate_provider_hourly_rate CASCADE;`);
  pgm.sql(`DROP FUNCTION IF EXISTS trigger_set_updated_at        CASCADE;`);
}

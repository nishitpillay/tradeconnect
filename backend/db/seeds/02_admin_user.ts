/**
 * Seed 02: Admin User + Demo Accounts
 *
 * Creates:
 *   1. Superadmin user  (admin@tradeconnect.com.au)
 *   2. Demo customer    (customer@demo.tradeconnect.com.au)
 *   3. Demo provider    (provider@demo.tradeconnect.com.au)
 *
 * ⚠️  SECURITY RULES:
 *   - Admin credentials are read from environment variables (never hardcoded in prod)
 *   - Demo accounts are only created in non-production environments
 *   - Passwords use bcrypt with cost factor 12
 *   - All demo account passwords must be changed after first login
 *
 * Run: npx ts-node db/seeds/run.ts --seed 02_admin_user
 * Or via: npm run db:seed
 */

import { PoolClient } from 'pg';
import bcrypt from 'bcrypt';
import { CATEGORY_IDS } from './01_categories';

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Fixed UUIDs for deterministic cross-environment references
const ADMIN_USER_ID    = 'aaaaaaaa-0001-4000-a000-000000000001';
const CUSTOMER_USER_ID = 'aaaaaaaa-0002-4000-a000-000000000002';
const PROVIDER_USER_ID = 'aaaaaaaa-0003-4000-a000-000000000003';

const CUSTOMER_PROFILE_ID = 'bbbbbbbb-0002-4000-a000-000000000002';
const PROVIDER_PROFILE_ID = 'bbbbbbbb-0003-4000-a000-000000000003';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAdminPassword(): string {
  const pw = process.env.SEED_ADMIN_PASSWORD;
  if (!pw || pw.length < 12) {
    throw new Error(
      'SEED_ADMIN_PASSWORD env var must be set and >= 12 characters.\n' +
      'Example: SEED_ADMIN_PASSWORD="Tr@deConnect2026!" npm run db:seed'
    );
  }
  return pw;
}

function getDemoPassword(): string {
  return process.env.SEED_DEMO_PASSWORD ?? 'DemoPass123!';
}

// ─── Insert helpers ───────────────────────────────────────────────────────────

async function upsertUser(
  client: PoolClient,
  params: {
    id: string;
    email: string;
    full_name: string;
    display_name: string;
    role: 'admin' | 'customer' | 'provider';
    status: string;
    password_hash: string;
    email_verified: boolean;
    phone?: string;
    phone_verified?: boolean;
    referral_code: string;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO users (
       id, email, email_verified, phone, phone_verified,
       password_hash, role, status,
       full_name, display_name,
       timezone, push_enabled, email_notifications,
       terms_accepted_at, privacy_accepted_at, marketing_consent,
       referral_code,
       created_at, updated_at
     ) VALUES (
       $1,  $2,  $3,  $4,  $5,
       $6,  $7,  $8,
       $9,  $10,
       $11, $12, $13,
       NOW(), NOW(), FALSE,
       $14,
       NOW(), NOW()
     )
     ON CONFLICT (id) DO UPDATE SET
       email           = EXCLUDED.email,
       password_hash   = EXCLUDED.password_hash,
       status          = EXCLUDED.status,
       email_verified  = EXCLUDED.email_verified,
       updated_at      = NOW()`,
    [
      params.id,
      params.email,
      params.email_verified,
      params.phone ?? null,
      params.phone_verified ?? false,
      params.password_hash,
      params.role,
      params.status,
      params.full_name,
      params.display_name,
      'Australia/Sydney',
      true,
      true,
      params.referral_code,
    ]
  );
}

// ─── Seed 1: Superadmin ───────────────────────────────────────────────────────

async function seedAdmin(client: PoolClient): Promise<void> {
  console.log('  → Creating admin user...');

  const adminPassword = getAdminPassword();
  const passwordHash  = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
  const adminEmail    = process.env.SEED_ADMIN_EMAIL ?? 'admin@tradeconnect.com.au';

  await upsertUser(client, {
    id:             ADMIN_USER_ID,
    email:          adminEmail,
    full_name:      'TradeConnect Admin',
    display_name:   'Admin',
    role:           'admin',
    status:         'active',
    password_hash:  passwordHash,
    email_verified: true,
    phone:          '+61400000001',
    phone_verified: true,
    referral_code:  'ADMIN-X7K9',
  });

  // Admins have no customer_profile or provider_profile
  console.log(`  ✓ Admin: ${adminEmail}`);
}

// ─── Seed 2: Demo Customer ────────────────────────────────────────────────────

async function seedDemoCustomer(client: PoolClient): Promise<void> {
  if (IS_PRODUCTION) {
    console.log('  → Skipping demo customer (production environment).');
    return;
  }

  console.log('  → Creating demo customer...');

  const demoPassword = getDemoPassword();
  const passwordHash = await bcrypt.hash(demoPassword, BCRYPT_ROUNDS);

  await upsertUser(client, {
    id:             CUSTOMER_USER_ID,
    email:          'customer@demo.tradeconnect.com.au',
    full_name:      'Jane Demo',
    display_name:   'Jane D.',
    role:           'customer',
    status:         'active',
    password_hash:  passwordHash,
    email_verified: true,
    phone:          '+61412000001',
    phone_verified: true,
    referral_code:  'CUST-DEMO',
  });

  // Customer profile
  await client.query(
    `INSERT INTO customer_profiles
       (id, user_id, suburb, postcode, state, jobs_posted, jobs_completed)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       suburb = EXCLUDED.suburb,
       postcode = EXCLUDED.postcode,
       state = EXCLUDED.state`,
    [
      CUSTOMER_PROFILE_ID,
      CUSTOMER_USER_ID,
      'Bondi',
      '2026',
      'NSW',
      0,
      0,
    ]
  );

  console.log('  ✓ Demo customer: customer@demo.tradeconnect.com.au');
}

// ─── Seed 3: Demo Provider ────────────────────────────────────────────────────

async function seedDemoProvider(client: PoolClient): Promise<void> {
  if (IS_PRODUCTION) {
    console.log('  → Skipping demo provider (production environment).');
    return;
  }

  console.log('  → Creating demo provider...');

  const demoPassword = getDemoPassword();
  const passwordHash = await bcrypt.hash(demoPassword, BCRYPT_ROUNDS);

  await upsertUser(client, {
    id:             PROVIDER_USER_ID,
    email:          'provider@demo.tradeconnect.com.au',
    full_name:      'Mike Demo',
    display_name:   'Mike Demo',
    role:           'provider',
    status:         'active',
    password_hash:  passwordHash,
    email_verified: true,
    phone:          '+61412000002',
    phone_verified: true,
    referral_code:  'PROV-DEMO',
  });

  // Provider profile — Eastern Suburbs Sydney, Plumbing + Electrical
  // service_location: PostGIS point (Bondi Junction)
  await client.query(
    `INSERT INTO provider_profiles (
       id, user_id,
       business_name, abn, abn_verified,
       bio, years_experience, employee_count,
       verification_status,
       identity_verified, license_verified, insurance_verified,
       service_lat, service_lng,
       service_location,
       service_radius_km,
       service_suburbs, service_states,
       hourly_rate_min, hourly_rate_max,
       quotes_submitted, jobs_won, jobs_completed,
       avg_rating, total_reviews,
       response_rate, avg_response_hours,
       featured, available
     ) VALUES (
       $1, $2,
       $3, $4, $5,
       $6, $7, $8,
       $9,
       $10, $11, $12,
       $13, $14,
       ST_SetSRID(ST_MakePoint($30, $29), 4326),
       $15,
       $16, $17,
       $18, $19,
       $20, $21, $22,
       $23, $24,
       $25, $26,
       $27, $28
     )
     ON CONFLICT (user_id) DO UPDATE SET
       business_name  = EXCLUDED.business_name,
       abn_verified   = EXCLUDED.abn_verified,
       service_radius_km = EXCLUDED.service_radius_km,
       available      = EXCLUDED.available,
       updated_at     = NOW()`,
    [
      // $1  id
      PROVIDER_PROFILE_ID,
      // $2  user_id
      PROVIDER_USER_ID,
      // $3  business_name
      'Demo Plumbing & Electrical',
      // $4  abn (valid test ABN format — 11 digits, passes Luhn-style check)
      '51824753556',
      // $5  abn_verified
      true,
      // $6  bio
      'Demo provider account for testing. Based in Sydney\'s Eastern Suburbs, ' +
      'servicing Bondi, Coogee, Randwick and surrounds. Specialising in plumbing ' +
      'and electrical work for residential and light commercial properties.',
      // $7  years_experience
      10,
      // $8  employee_count
      3,
      // $9  verification_status
      'verified',
      // $10 identity_verified
      true,
      // $11 license_verified
      true,
      // $12 insurance_verified
      true,
      // $13 service_lat (Bondi Junction)
      -33.8915,
      // $14 service_lng
      151.2767,
      // $15 service_radius_km
      40,
      // $16 service_suburbs
      ['Bondi', 'Bondi Junction', 'Coogee', 'Randwick', 'Maroubra', 'Kingsford', 'Newtown'],
      // $17 service_states
      ['NSW'],
      // $18 hourly_rate_min (cents) = $85/hr
      8500,
      // $19 hourly_rate_max (cents) = $150/hr
      15000,
      // $20 quotes_submitted
      5,
      // $21 jobs_won
      3,
      // $22 jobs_completed
      2,
      // $23 avg_rating
      9.60,
      // $24 total_reviews
      2,
      // $25 response_rate
      95.00,
      // $26 avg_response_hours
      2.5,
      // $27 featured
      false,
      // $28 available
      true,
      // $29 = lat for ST_MakePoint (same value as $13, separate param to avoid numeric/float8 type conflict)
      -33.8915,
      // $30 = lng for ST_MakePoint (same value as $14, separate param to avoid numeric/float8 type conflict)
      151.2767,
    ]
  );

  // Assign categories: Plumbing + Electrical
  await client.query(
    `INSERT INTO provider_categories (provider_id, category_id)
     VALUES ($1, $2), ($1, $3)
     ON CONFLICT DO NOTHING`,
    [PROVIDER_PROFILE_ID, CATEGORY_IDS.PLUMBING, CATEGORY_IDS.ELECTRICAL]
  );

  // Add demo license
  await client.query(
    `INSERT INTO provider_licenses (
       id, provider_id,
       license_type, license_number,
       issuing_state, issuing_body,
       expiry_date, verified
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8
     )
     ON CONFLICT (id) DO NOTHING`,
    [
      'cccccccc-0001-4000-a000-000000000001',
      PROVIDER_PROFILE_ID,
      'Plumbing Contractor Licence',
      'PL-DEMO-12345',
      'NSW',
      'NSW Fair Trading',
      '2027-12-31',
      true,
    ]
  );

  // Add demo insurance
  await client.query(
    `INSERT INTO provider_insurances (
       id, provider_id,
       insurance_type, insurer, policy_number,
       coverage_amount, expiry_date, verified
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8
     )
     ON CONFLICT (id) DO NOTHING`,
    [
      'cccccccc-0002-4000-a000-000000000002',
      PROVIDER_PROFILE_ID,
      'public_liability',
      'QBE Insurance Australia',
      'QBE-DEMO-9876',
      2000000 * 100, // $2M in cents
      '2027-06-30',
      true,
    ]
  );

  // Add a demo review on the provider
  // (Requires a completed job — skipped here for simplicity;
  //  reviews seed can be added separately in a future seed file.)

  console.log('  ✓ Demo provider: provider@demo.tradeconnect.com.au');
  console.log('    Categories: Plumbing, Electrical');
  console.log('    Service area: Eastern Suburbs Sydney (40 km radius)');
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function seedAdminAndDemoUsers(client: PoolClient): Promise<void> {
  await seedAdmin(client);
  await seedDemoCustomer(client);
  await seedDemoProvider(client);
}

// Exported for testing or cross-seed references
export const SEED_USER_IDS = {
  ADMIN:    ADMIN_USER_ID,
  CUSTOMER: CUSTOMER_USER_ID,
  PROVIDER: PROVIDER_USER_ID,
};

export const SEED_PROFILE_IDS = {
  CUSTOMER: CUSTOMER_PROFILE_ID,
  PROVIDER: PROVIDER_PROFILE_ID,
};

// ─── Standalone runner ────────────────────────────────────────────────────────

if (require.main === module) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  pool.connect()
    .then(async (client: PoolClient) => {
      try {
        await client.query('BEGIN');
        await seedAdminAndDemoUsers(client);
        await client.query('COMMIT');
        console.log('\n✅ Admin/Demo user seed complete.\n');

        if (!IS_PRODUCTION) {
          console.log('─'.repeat(50));
          console.log('Demo credentials:');
          console.log('  Admin:    admin@tradeconnect.com.au     / $SEED_ADMIN_PASSWORD');
          console.log('  Customer: customer@demo.tradeconnect.com.au / DemoPass123!');
          console.log('  Provider: provider@demo.tradeconnect.com.au / DemoPass123!');
          console.log('─'.repeat(50));
        }
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Admin seed failed:', err);
        process.exit(1);
      } finally {
        client.release();
        await pool.end();
      }
    })
    .catch((err: Error) => {
      console.error('DB connection failed:', err.message);
      process.exit(1);
    });
}

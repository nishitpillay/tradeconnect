import bcrypt from 'bcrypt';
import { PoolClient } from 'pg';
import { CATEGORY_IDS } from './01_categories';

const BCRYPT_ROUNDS = 12;

export const CATEGORY_FIXTURES = [
  {
    key: 'plumbing',
    label: 'Plumbing',
    categoryId: CATEGORY_IDS.PLUMBING,
    businessPrefix: 'FlowFix',
    suburb: 'Bondi',
    postcode: '2026',
    lat: -33.8915,
    lng: 151.2767,
    rateMin: 8500,
    rateMax: 14500,
  },
  {
    key: 'electrical',
    label: 'Electrical',
    categoryId: CATEGORY_IDS.ELECTRICAL,
    businessPrefix: 'BrightWire',
    suburb: 'Surry Hills',
    postcode: '2010',
    lat: -33.8857,
    lng: 151.2117,
    rateMin: 9000,
    rateMax: 15500,
  },
  {
    key: 'carpentry',
    label: 'Carpentry',
    categoryId: CATEGORY_IDS.CARPENTRY,
    businessPrefix: 'TrueGrain',
    suburb: 'Marrickville',
    postcode: '2204',
    lat: -33.9110,
    lng: 151.1549,
    rateMin: 8000,
    rateMax: 14000,
  },
  {
    key: 'painting',
    label: 'Painting',
    categoryId: CATEGORY_IDS.PAINTING,
    businessPrefix: 'PrimeCoat',
    suburb: 'Paddington',
    postcode: '2021',
    lat: -33.8842,
    lng: 151.2313,
    rateMin: 7500,
    rateMax: 13000,
  },
  {
    key: 'landscaping',
    label: 'Landscaping',
    categoryId: CATEGORY_IDS.LANDSCAPING,
    businessPrefix: 'GreenLine',
    suburb: 'Chatswood',
    postcode: '2067',
    lat: -33.7963,
    lng: 151.1837,
    rateMin: 7800,
    rateMax: 13800,
  },
  {
    key: 'roofing',
    label: 'Roofing',
    categoryId: CATEGORY_IDS.ROOFING,
    businessPrefix: 'TopSpan',
    suburb: 'Parramatta',
    postcode: '2150',
    lat: -33.8150,
    lng: 151.0011,
    rateMin: 9200,
    rateMax: 16500,
  },
  {
    key: 'tiling',
    label: 'Tiling',
    categoryId: CATEGORY_IDS.TILING,
    businessPrefix: 'EdgeTile',
    suburb: 'Rockdale',
    postcode: '2216',
    lat: -33.9520,
    lng: 151.1386,
    rateMin: 8200,
    rateMax: 14200,
  },
  {
    key: 'demolition',
    label: 'Demolition',
    categoryId: CATEGORY_IDS.DEMOLITION,
    businessPrefix: 'ClearCut',
    suburb: 'Alexandria',
    postcode: '2015',
    lat: -33.9105,
    lng: 151.1947,
    rateMin: 9500,
    rateMax: 17500,
  },
] as const;

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey'] as const;
const LAST_NAMES = ['Parker', 'Nguyen', 'Singh', 'Murphy', 'Chen'] as const;

function getDummyPassword(): string {
  return process.env.SEED_DUMMY_PROVIDER_PASSWORD
    ?? process.env.SEED_DEMO_PASSWORD
    ?? 'DemoPass123!';
}

export function buildUuid(prefix: string, categoryIndex: number, providerIndex: number): string {
  const categoryHex = (categoryIndex + 1).toString(16).padStart(2, '0');
  const providerHex = (providerIndex + 1).toString(16).padStart(2, '0');
  const middle = `${categoryHex}${providerHex}`;
  return `${prefix}-${middle}-4000-a000-00000000${middle}`;
}

function deterministicScore(categoryIndex: number, providerIndex: number): number {
  return ((categoryIndex * 7 + providerIndex * 3) % 10) + 1;
}

function deterministicResponseRate(categoryIndex: number, providerIndex: number): number {
  return 72 + ((categoryIndex * 5 + providerIndex * 4) % 25);
}

function deterministicResponseHours(categoryIndex: number, providerIndex: number): number {
  return Number((1 + ((categoryIndex + providerIndex) % 6) * 0.75).toFixed(2));
}

async function upsertUser(
  client: PoolClient,
  params: {
    id: string;
    email: string;
    fullName: string;
    displayName: string;
    passwordHash: string;
    phone: string;
    referralCode: string;
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
       $1,  $2,  TRUE, $3, TRUE,
       $4,  'provider', 'active',
       $5,  $6,
       'Australia/Sydney', TRUE, TRUE,
       NOW(), NOW(), FALSE,
       $7,
       NOW(), NOW()
     )
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       phone = EXCLUDED.phone,
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       display_name = EXCLUDED.display_name,
       updated_at = NOW()`,
    [
      params.id,
      params.email,
      params.phone,
      params.passwordHash,
      params.fullName,
      params.displayName,
      params.referralCode,
    ]
  );
}

async function upsertProviderProfile(
  client: PoolClient,
  params: {
    id: string;
    userId: string;
    businessName: string;
    bio: string;
    yearsExperience: number;
    employeeCount: number;
    suburb: string;
    postcode: string;
    lat: number;
    lng: number;
    rateMin: number;
    rateMax: number;
    jobsCompleted: number;
    quotesSubmitted: number;
    jobsWon: number;
    avgRating: number;
    totalReviews: number;
    responseRate: number;
    avgResponseHours: number;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO provider_profiles (
       id, user_id,
       business_name, abn, abn_verified,
       bio, years_experience, employee_count,
       verification_status,
       identity_verified, license_verified, insurance_verified,
       service_lat, service_lng, service_location,
       service_radius_km,
       service_suburbs, service_states,
       hourly_rate_min, hourly_rate_max,
       quotes_submitted, jobs_won, jobs_completed,
       avg_rating, total_reviews,
       response_rate, avg_response_hours,
       featured, available
     ) VALUES (
       $1, $2,
       $3, NULL, FALSE,
       $4, $5, $6,
       'pending',
       FALSE, FALSE, FALSE,
       $7, $8, ST_SetSRID(ST_MakePoint($20, $19), 4326),
       30,
       $9, ARRAY['NSW']::au_state[],
       $10, $11,
       $12, $13, $14,
       $15, $16,
       $17, $18,
       FALSE, TRUE
     )
     ON CONFLICT (user_id) DO UPDATE SET
       business_name = EXCLUDED.business_name,
       bio = EXCLUDED.bio,
       years_experience = EXCLUDED.years_experience,
       employee_count = EXCLUDED.employee_count,
       service_lat = EXCLUDED.service_lat,
       service_lng = EXCLUDED.service_lng,
       service_location = EXCLUDED.service_location,
       service_suburbs = EXCLUDED.service_suburbs,
       hourly_rate_min = EXCLUDED.hourly_rate_min,
       hourly_rate_max = EXCLUDED.hourly_rate_max,
       quotes_submitted = EXCLUDED.quotes_submitted,
       jobs_won = EXCLUDED.jobs_won,
       jobs_completed = EXCLUDED.jobs_completed,
       avg_rating = EXCLUDED.avg_rating,
       total_reviews = EXCLUDED.total_reviews,
       response_rate = EXCLUDED.response_rate,
       avg_response_hours = EXCLUDED.avg_response_hours,
       available = EXCLUDED.available,
       updated_at = NOW()`,
    [
      params.id,
      params.userId,
      params.businessName,
      params.bio,
      params.yearsExperience,
      params.employeeCount,
      params.lat,
      params.lng,
      [`${params.suburb} ${params.postcode}`],
      params.rateMin,
      params.rateMax,
      params.quotesSubmitted,
      params.jobsWon,
      params.jobsCompleted,
      params.avgRating,
      params.totalReviews,
      params.responseRate,
      params.avgResponseHours,
      params.lat,
      params.lng,
    ]
  );
}

export async function seedDummyProviders(client: PoolClient): Promise<void> {
  console.log('  -> Seeding dummy providers for featured categories...');

  const passwordHash = await bcrypt.hash(getDummyPassword(), BCRYPT_ROUNDS);
  let createdCount = 0;

  for (const [categoryIndex, category] of CATEGORY_FIXTURES.entries()) {
    for (let providerIndex = 0; providerIndex < 5; providerIndex++) {
      const nameIndex = (categoryIndex + providerIndex) % FIRST_NAMES.length;
      const firstName = FIRST_NAMES[nameIndex];
      const lastName = LAST_NAMES[(categoryIndex * 2 + providerIndex) % LAST_NAMES.length];
      const fullName = `${firstName} ${lastName}`;
      const userId = buildUuid('dddddddd', categoryIndex, providerIndex);
      const profileId = buildUuid('eeeeeeee', categoryIndex, providerIndex);
      const scoreOutOfTen = deterministicScore(categoryIndex, providerIndex);
      const avgRating = scoreOutOfTen;
      const quotesSubmitted = 6 + categoryIndex + providerIndex;
      const jobsWon = 2 + ((categoryIndex + providerIndex) % 5);
      const jobsCompleted = Math.max(1, jobsWon - 1);
      const totalReviews = 3 + ((categoryIndex * 3 + providerIndex) % 8);
      const employeeCount = 1 + ((categoryIndex + providerIndex) % 4);
      const yearsExperience = 2 + categoryIndex + providerIndex;
      const businessName = `${category.businessPrefix} ${lastName} ${providerIndex + 1}`;
      const email = `${category.key}${providerIndex + 1}@dummy.tradeconnect.com.au`;
      const phone = `+614900${String(categoryIndex).padStart(2, '0')}${String(providerIndex + 1).padStart(3, '0')}`;
      const referralCode = `${category.key.slice(0, 4).toUpperCase()}-${providerIndex + 1}X${categoryIndex + 1}`;

      await upsertUser(client, {
        id: userId,
        email,
        fullName,
        displayName: firstName,
        passwordHash,
        phone,
        referralCode,
      });

      await upsertProviderProfile(client, {
        id: profileId,
        userId,
        businessName,
        bio: `${businessName} handles ${category.label.toLowerCase()} jobs across ${category.suburb} and nearby Sydney suburbs.`,
        yearsExperience,
        employeeCount,
        suburb: category.suburb,
        postcode: category.postcode,
        lat: Number((category.lat + providerIndex * 0.004).toFixed(7)),
        lng: Number((category.lng + providerIndex * 0.004).toFixed(7)),
        rateMin: category.rateMin,
        rateMax: category.rateMax,
        quotesSubmitted,
        jobsWon,
        jobsCompleted,
        avgRating,
        totalReviews,
        responseRate: deterministicResponseRate(categoryIndex, providerIndex),
        avgResponseHours: deterministicResponseHours(categoryIndex, providerIndex),
      });

      await client.query('DELETE FROM provider_categories WHERE provider_id = $1', [profileId]);
      await client.query(
        `INSERT INTO provider_categories (provider_id, category_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [profileId, category.categoryId]
      );

      createdCount++;
    }
  }

  console.log(`  OK ${createdCount} dummy providers upserted across ${CATEGORY_FIXTURES.length} categories.`);
  console.log('  Credentials: *@dummy.tradeconnect.com.au / default DemoPass123! unless SEED_DUMMY_PROVIDER_PASSWORD is set');
  console.log('  Ratings are stored directly on the 1-10 provider scale.');
}

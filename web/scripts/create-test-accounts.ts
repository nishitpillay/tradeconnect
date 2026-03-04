/**
 * Create Test Accounts via API
 *
 * Registers test customer and provider accounts for E2E testing
 * Uses the registration API endpoint
 *
 * Usage: tsx scripts/create-test-accounts.ts
 */

import axios from 'axios';

const API_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

interface TestAccount {
  email: string;
  password: string;
  role: 'customer' | 'provider';
  full_name: string;
  business_name?: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  // Customer accounts
  {
    email: 'customer1@test.com',
    password: 'Test1234!',
    role: 'customer',
    full_name: 'Test Customer 1',
  },
  {
    email: 'customer2@test.com',
    password: 'Test1234!',
    role: 'customer',
    full_name: 'Test Customer 2',
  },
  {
    email: 'customer3@test.com',
    password: 'Test1234!',
    role: 'customer',
    full_name: 'Test Customer 3',
  },
  {
    email: 'customer4@test.com',
    password: 'Test1234!',
    role: 'customer',
    full_name: 'Test Customer 4',
  },
  {
    email: 'customer5@test.com',
    password: 'Test1234!',
    role: 'customer',
    full_name: 'Test Customer 5',
  },
  // Provider accounts
  {
    email: 'provider1@test.com',
    password: 'Test1234!',
    role: 'provider',
    full_name: 'Test Provider 1',
    business_name: 'Test Plumbing Services',
  },
  {
    email: 'provider2@test.com',
    password: 'Test1234!',
    role: 'provider',
    full_name: 'Test Provider 2',
    business_name: 'Test Electrical Works',
  },
  {
    email: 'provider3@test.com',
    password: 'Test1234!',
    role: 'provider',
    full_name: 'Test Provider 3',
    business_name: 'Test Carpentry Co.',
  },
  {
    email: 'provider4@test.com',
    password: 'Test1234!',
    role: 'provider',
    full_name: 'Test Provider 4',
    business_name: 'Test Painting Services',
  },
  {
    email: 'provider5@test.com',
    password: 'Test1234!',
    role: 'provider',
    full_name: 'Test Provider 5',
    business_name: 'Test Landscaping',
  },
];

async function createTestAccounts() {
  console.log('🌱 Creating test accounts via API...\n');
  console.log(`Backend URL: ${BACKEND_URL}\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const account of TEST_ACCOUNTS) {
    console.log(`Creating ${account.role}: ${account.email}`);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/register`, {
        email: account.email,
        password: account.password,
        role: account.role,
        full_name: account.full_name,
        business_name: account.business_name,
        terms_accepted: true,
        privacy_accepted: true,
        marketing_consent: false,
      }, {
        timeout: 10000,
        validateStatus: () => true, // Don't throw on any status
      });

      if (response.status === 201) {
        console.log(`   ✅ Created successfully (ID: ${response.data.user.id})\n`);
        created++;
      } else if (response.status === 400 && response.data.message?.includes('already')) {
        console.log(`   ⏭️  Already exists, skipping...\n`);
        skipped++;
      } else {
        console.log(`   ❌ Failed: ${response.data.message || response.statusText}\n`);
        failed++;
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.error(`\n❌ Cannot connect to backend at ${BACKEND_URL}`);
        console.error('   Make sure the backend is running: cd ../backend && npm run dev\n');
        process.exit(1);
      }
      console.log(`   ❌ Error: ${error.message}\n`);
      failed++;
    }
  }

  console.log('✅ Account creation complete!\n');
  console.log('📋 Summary:');
  console.log(`   Created: ${created} accounts`);
  console.log(`   Skipped: ${skipped} accounts (already exist)`);
  console.log(`   Failed: ${failed} accounts`);
  console.log(`   Total: ${TEST_ACCOUNTS.length} accounts\n`);
  console.log(`   Password: Test1234! (for all accounts)\n`);

  if (failed > 0) {
    process.exit(1);
  }

  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  createTestAccounts();
}

export { createTestAccounts, TEST_ACCOUNTS };

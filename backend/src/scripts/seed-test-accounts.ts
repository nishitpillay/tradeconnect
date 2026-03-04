/**
 * Seed Test Accounts
 *
 * Creates test customer and provider accounts for E2E testing
 *
 * Usage: tsx src/scripts/seed-test-accounts.ts
 */

import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcrypt';
import { db } from '../config/database';
import * as userRepo from '../repositories/user.repo';

const BCRYPT_ROUNDS = 12;

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

async function seedTestAccounts() {
  console.log('🌱 Seeding test accounts...\n');

  try {
    for (const account of TEST_ACCOUNTS) {
      console.log(`Creating ${account.role}: ${account.email}`);

      // Check if account already exists
      const existing = await userRepo.findByEmail(account.email);
      if (existing) {
        console.log(`   ⏭️  Already exists, skipping...\n`);
        continue;
      }

      // Hash password
      const password_hash = await bcrypt.hash(account.password, BCRYPT_ROUNDS);
      const now = new Date();

      // Create user in transaction
      await db.withTransaction(async (client) => {
        const user = await userRepo.createUser(
          {
            email: account.email,
            password_hash,
            role: account.role,
            full_name: account.full_name,
            terms_accepted_at: now,
            privacy_accepted_at: now,
            marketing_consent: false,
            email_verified: true, // Auto-verify test accounts
          },
          client
        );

        if (account.role === 'customer') {
          await userRepo.createCustomerProfile(
            { user_id: user.id },
            client
          );
        } else {
          await userRepo.createProviderProfile(
            {
              user_id: user.id,
              business_name: account.business_name!,
            },
            client
          );
        }

        console.log(`   ✅ Created successfully (ID: ${user.id})\n`);
      });
    }

    console.log('✅ All test accounts seeded successfully!\n');
    console.log('📋 Summary:');
    console.log(`   Customers: 5 accounts`);
    console.log(`   Providers: 5 accounts`);
    console.log(`   Password: Test1234! (for all accounts)\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding test accounts:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedTestAccounts();
}

export { seedTestAccounts, TEST_ACCOUNTS };

/**
 * E2E Setup: Create Test Accounts
 *
 * This script runs before E2E tests to ensure test accounts exist
 * Uses Playwright to register accounts via the web UI
 */

import { chromium, Browser, Page } from '@playwright/test';

interface TestAccount {
  email: string;
  password: string;
  role: 'customer' | 'provider';
  full_name: string;
  business_name?: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    email: 'customer1@test.com',
    password: 'Test1234!',
    role: 'customer',
    full_name: 'Test Customer 1',
  },
  {
    email: 'provider1@test.com',
    password: 'Test1234!',
    role: 'provider',
    full_name: 'Test Provider 1',
    business_name: 'Test Plumbing Services',
  },
];

async function registerAccount(page: Page, account: TestAccount, baseURL: string): Promise<boolean> {
  try {
    console.log(`   Attempting to register: ${account.email}`);

    await page.goto(`${baseURL}/register`, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Select role first (customer or provider)
    if (account.role === 'customer') {
      await page.click('button:has-text("Hire a Tradie")');
    } else {
      await page.click('button:has-text("Work as a Tradie")');
    }

    // Fill registration form using autocomplete attributes
    await page.fill('input[autocomplete="name"]', account.full_name);
    await page.fill('input[autocomplete="email"]', account.email);
    await page.fill('input[autocomplete="tel"]', '0400000000'); // Dummy phone
    await page.fill('input[autocomplete="new-password"]', account.password);

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for navigation or error
    try {
      await page.waitForURL(/dashboard|jobs|quotes|messages/, { timeout: 10000 });
      console.log(`   ✅ Successfully registered`);
      return true;
    } catch {
      // Check if still on register page (might already exist)
      const currentUrl = page.url();
      if (currentUrl.includes('/register')) {
        const errorText = await page.textContent('body');
        if (errorText?.includes('already') || errorText?.includes('exists')) {
          console.log(`   ⏭️  Account already exists`);
          return true;
        }
        console.log(`   ⚠️  Registration failed - staying on register page`);
        return false;
      }
      console.log(`   ✅ Registration successful (no redirect)`);
      return true;
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function setup() {
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

  console.log('\n🔧 E2E Setup: Creating test accounts');
  console.log(`   Base URL: ${baseURL}\n`);

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let created = 0;
    let existing = 0;
    let failed = 0;

    for (const account of TEST_ACCOUNTS) {
      const success = await registerAccount(page, account, baseURL);
      if (success) {
        const errorText = await page.textContent('body');
        if (errorText?.includes('already') || errorText?.includes('exists')) {
          existing++;
        } else {
          created++;
        }
      } else {
        failed++;
      }
    }

    console.log('\n📋 Setup Summary:');
    console.log(`   ✅ Created: ${created} accounts`);
    console.log(`   ⏭️  Existing: ${existing} accounts`);
    console.log(`   ❌ Failed: ${failed} accounts`);
    console.log(`   Total: ${TEST_ACCOUNTS.length} accounts\n`);

    await browser.close();

    if (failed > 0) {
      console.error('⚠️  Some accounts failed to create. Tests may be skipped.\n');
    }

    return created + existing >= 2; // Need at least customer1 and provider1
  } catch (error: any) {
    console.error(`\n❌ Setup failed: ${error.message}\n`);
    if (browser) {
      await browser.close();
    }
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  setup().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export { setup };

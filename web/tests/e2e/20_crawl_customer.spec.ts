import { test, expect } from '@playwright/test';
import { SequentialCrawler } from './lib/crawler';
import { assertPageHealthy, assertNavigationPresent } from './lib/assertions';
import { login, getCustomerCredentials } from './lib/auth';
import * as fs from 'fs';
import * as path from 'path';

test.describe('20 - Customer Crawl - Authenticated Pages', () => {
  test.setTimeout(180000);

  // Skip entire suite if credentials not configured
  test.skip(({ }) => {
    const creds = getCustomerCredentials();
    return !creds;
  }, 'Customer credentials not configured (set E2E_CUSTOMER_EMAIL and E2E_CUSTOMER_PASSWORD)');

  test('should crawl customer pages after login', async ({ page, baseURL }) => {
    const creds = getCustomerCredentials();
    if (!creds) {
      test.skip();
      return;
    }

    // Login as customer
    page.on("console", msg => console.log("[Browser]", msg.text()));
    page.on("pageerror", err => console.error("[Browser Error]", err));
    await login(page, creds, baseURL!);

    // Verify we're logged in
    const logoutButton = page.locator('button:has-text("Logout")');
    await expect(logoutButton).toBeVisible({ timeout: 5000 });

    // Start crawl from dashboard
    const crawler = new SequentialCrawler(page, {
      startUrl: `${baseURL}/dashboard`,
      maxPages: parseInt(process.env.E2E_MAX_PAGES || '50'),

      // Only customer-accessible routes
      allowPatterns: [
        /\/dashboard/i,
        /\/jobs(?!\/feed)/i, // Jobs routes but NOT /jobs/feed (provider only)
        /\/messages/i,
        /\/profile/i,
      ],

      // Additional skip patterns for destructive actions
      skipPatterns: [
        /\/jobs\/feed/i, // Provider-only route
      ],

      // Validate each page
      onPageVisit: async (url, pg) => {
        await assertPageHealthy(pg, url);
        await assertNavigationPresent(pg); // Authenticated pages should have nav
      },

      onError: async (url, error) => {
        console.error(`   ❌ Error on ${url}:`, error.message);
      },
    });

    const result = await crawler.crawl();

    // Assertions
    expect(result.visited.length, 'Should visit customer pages').toBeGreaterThan(0);
    expect(result.broken.length, 'Should have no broken links').toBe(0);

    // Check that dashboard was visited
    const visitedUrls = result.visited.join(',');
    expect(visitedUrls, 'Should visit dashboard').toContain('/dashboard');

    // Log results
    console.log(`\n📊 Customer Crawl Summary:`);
    console.log(`   ✅ Visited: ${result.visited.length} pages`);
    console.log(`   ❌ Broken: ${result.broken.length} links`);
    console.log(`   ⏭️  Skipped: ${result.skipped.length} links`);

    console.log(`\n✅ Customer Pages Visited:`);
    result.visited.forEach((url, i) => {
      console.log(`   ${i + 1}. ${url}`);
    });

    if (result.broken.length > 0) {
      console.log(`\n❌ Broken Links:`);
      result.broken.forEach((link) => {
        console.log(`   - ${link.url}: ${link.error}`);
      });
    }

    // Save results
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(resultsDir, 'customer-crawl.json'),
      JSON.stringify(result, null, 2)
    );

    console.log(`\n💾 Results saved to: test-results/customer-crawl.json`);
  });

  test('should see customer dashboard elements', async ({ page, baseURL }) => {
    const creds = getCustomerCredentials();
    if (!creds) {
      test.skip();
      return;
    }

    await login(page, creds, baseURL!);
    await page.goto(`${baseURL}/dashboard`);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Check for customer-specific elements
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    const headingText = await heading.textContent();
    console.log(`   📝 Dashboard heading: "${headingText}"`);

    // Check for "My Jobs" or similar customer-specific text
    const customerText = page.locator('text=/My Jobs|Jobs|Dashboard/i').first();
    await expect(customerText).toBeVisible();

    console.log(`   ✅ Customer dashboard loaded successfully`);
  });

  test('should access my jobs page', async ({ page, baseURL }) => {
    const creds = getCustomerCredentials();
    if (!creds) {
      test.skip();
      return;
    }

    await login(page, creds, baseURL!);

    // Navigate to jobs page
    await page.goto(`${baseURL}/jobs`);

    // Should see jobs list or empty state
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    console.log(`   ✅ My jobs page loaded`);
  });

  test('should access post new job page', async ({ page, baseURL }) => {
    const creds = getCustomerCredentials();
    if (!creds) {
      test.skip();
      return;
    }

    await login(page, creds, baseURL!);

    // Navigate to new job page
    await page.goto(`${baseURL}/jobs/new`);

    // Should see job form or wizard
    const mainContent = await page.locator('main, form').count();
    expect(mainContent, 'Should have main content or form').toBeGreaterThan(0);

    console.log(`   ✅ Post new job page loaded`);
  });

  test('should access profile page', async ({ page, baseURL }) => {
    const creds = getCustomerCredentials();
    if (!creds) {
      test.skip();
      return;
    }

    await login(page, creds, baseURL!);

    // Navigate to profile page
    await page.goto(`${baseURL}/profile`);

    // Should see profile information
    const profileContent = await page.locator('main').count();
    expect(profileContent, 'Should have profile content').toBeGreaterThan(0);

    console.log(`   ✅ Profile page loaded`);
  });

  test('should access messages page', async ({ page, baseURL }) => {
    const creds = getCustomerCredentials();
    if (!creds) {
      test.skip();
      return;
    }

    await login(page, creds, baseURL!);

    // Navigate to messages page
    await page.goto(`${baseURL}/messages`);

    // Should see messages list or empty state
    const messagesContent = await page.locator('main').count();
    expect(messagesContent, 'Should have messages content').toBeGreaterThan(0);

    console.log(`   ✅ Messages page loaded`);
  });
});

import { test, expect } from '@playwright/test';
import { SequentialCrawler } from './lib/crawler';
import { assertPageHealthy, assertNavigationPresent } from './lib/assertions';
import { login, getProviderCredentials } from './lib/auth';
import * as fs from 'fs';
import * as path from 'path';

test.describe('30 - Provider Crawl - Authenticated Pages', () => {
  test.setTimeout(180000);

  // Skip entire suite if credentials not configured
  test.skip(({ }) => {
    const creds = getProviderCredentials();
    return !creds;
  }, 'Provider credentials not configured (set E2E_PROVIDER_EMAIL and E2E_PROVIDER_PASSWORD)');

  test('should crawl provider pages after login', async ({ page, baseURL }) => {
    const creds = getProviderCredentials();
    if (!creds) {
      test.skip();
      return;
    }

    // Login as provider
    await login(page, creds, baseURL!);

    // Verify we're logged in
    const logoutButton = page.locator('button:has-text("Logout")');
    await expect(logoutButton).toBeVisible({ timeout: 5000 });

    // Start crawl from dashboard
    const crawler = new SequentialCrawler(page, {
      startUrl: `${baseURL}/dashboard`,
      maxPages: parseInt(process.env.E2E_MAX_PAGES || '50'),

      // Only provider-accessible routes
      allowPatterns: [
        /\/dashboard/i,
        /\/jobs\/feed/i, // Provider job feed
        /\/jobs\/\d+/i, // Job detail pages
        /\/quotes/i,    // Provider quotes
        /\/messages/i,
        /\/profile/i,
      ],

      // Additional skip patterns
      skipPatterns: [
        /\/jobs\/new/i, // Customer-only route
      ],

      // Validate each page
      onPageVisit: async (url, pg) => {
        await assertPageHealthy(pg, url);
        await assertNavigationPresent(pg);
      },

      onError: async (url, error) => {
        console.error(`   ❌ Error on ${url}:`, error.message);
      },
    });

    const result = await crawler.crawl();

    // Assertions
    expect(result.visited.length, 'Should visit provider pages').toBeGreaterThan(0);
    expect(result.broken.length, 'Should have no broken links').toBe(0);

    // Check that dashboard was visited
    const visitedUrls = result.visited.join(',');
    expect(visitedUrls, 'Should visit dashboard').toContain('/dashboard');

    // Log results
    console.log(`\n📊 Provider Crawl Summary:`);
    console.log(`   ✅ Visited: ${result.visited.length} pages`);
    console.log(`   ❌ Broken: ${result.broken.length} links`);
    console.log(`   ⏭️  Skipped: ${result.skipped.length} links`);

    console.log(`\n✅ Provider Pages Visited:`);
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
      path.join(resultsDir, 'provider-crawl.json'),
      JSON.stringify(result, null, 2)
    );

    console.log(`\n💾 Results saved to: test-results/provider-crawl.json`);
  });

  test('should see provider dashboard elements', async ({ page, baseURL }) => {
    const creds = getProviderCredentials();
    if (!creds) {
      test.skip();
      return;
    }

    await login(page, creds, baseURL!);
    await page.goto(`${baseURL}/dashboard`);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Check for provider-specific elements
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    const headingText = await heading.textContent();
    console.log(`   📝 Dashboard heading: "${headingText}"`);

    // Check for provider-specific text
    const providerText = page.locator('text=/Quotes|Jobs|Provider|Recommended/i').first();
    await expect(providerText).toBeVisible();

    console.log(`   ✅ Provider dashboard loaded successfully`);
  });

  test('should access job feed page', async ({ page, baseURL }) => {
    const creds = getProviderCredentials();
    if (!creds) {
      test.skip();
      return;
    }

    await login(page, creds, baseURL!);

    // Navigate to job feed
    await page.goto(`${baseURL}/jobs/feed`);

    // Should see job feed or empty state
    const mainContent = await page.locator('main').count();
    expect(mainContent, 'Should have main content').toBeGreaterThan(0);

    console.log(`   ✅ Job feed page loaded`);
  });

  test('should access quotes page', async ({ page, baseURL }) => {
    const creds = getProviderCredentials();
    if (!creds) {
      test.skip();
      return;
    }

    await login(page, creds, baseURL!);

    // Navigate to quotes page
    await page.goto(`${baseURL}/quotes`);

    // Should see quotes list or empty state
    const quotesContent = await page.locator('main').count();
    expect(quotesContent, 'Should have quotes content').toBeGreaterThan(0);

    console.log(`   ✅ Quotes page loaded`);
  });

  test('should access profile page', async ({ page, baseURL }) => {
    const creds = getProviderCredentials();
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
    const creds = getProviderCredentials();
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

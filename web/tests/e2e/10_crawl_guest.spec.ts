import { test, expect } from '@playwright/test';
import { SequentialCrawler } from './lib/crawler';
import { assertPageHealthy } from './lib/assertions';
import * as fs from 'fs';
import * as path from 'path';

test.describe('10 - Guest Crawl - Public Pages', () => {
  test('should crawl all public pages sequentially', async ({ page, baseURL }) => {
    test.setTimeout(180000);
    const crawler = new SequentialCrawler(page, {
      startUrl: baseURL!,
      maxPages: parseInt(process.env.E2E_MAX_PAGES || '50'),

      // Skip authenticated routes (we'll test those separately)
      skipPatterns: [
        /\/dashboard/i,
        /\/jobs\/new/i,
        /\/jobs\/\d+\/edit/i,
        /\/jobs\/feed/i,
        /\/quotes/i,
        /\/messages/i,
        /\/profile/i,
        /\/settings/i,
      ],

      // Validate each page as we visit it
      onPageVisit: async (url, pg) => {
        await assertPageHealthy(pg, url);
      },

      // Log errors but continue crawling
      onError: async (url, error) => {
        console.error(`   ❌ Error on ${url}:`, error.message);
      },
    });

    // Run the crawl
    const result = await crawler.crawl();

    // Assertions
    expect(result.visited.length, 'Should visit at least home page').toBeGreaterThan(0);
    expect(result.broken.length, 'Should have no broken links').toBe(0);

    // Log detailed summary
    console.log(`\n📊 Guest Crawl Summary:`);
    console.log(`   ✅ Visited: ${result.visited.length} pages`);
    console.log(`   ❌ Broken: ${result.broken.length} links`);
    console.log(`   ⏭️  Skipped: ${result.skipped.length} links`);
    console.log(`   🌐 External: ${result.external.length} links`);

    // Log all visited pages
    console.log(`\n✅ Visited Pages (in order):`);
    result.visited.forEach((url, i) => {
      console.log(`   ${i + 1}. ${url}`);
    });

    // Log broken links if any
    if (result.broken.length > 0) {
      console.log(`\n❌ Broken Links:`);
      result.broken.forEach((link) => {
        console.log(`   - ${link.url}`);
        console.log(`     Error: ${link.error}`);
      });
    }

    // Log some skipped links (first 10)
    if (result.skipped.length > 0) {
      console.log(`\n⏭️  Skipped Links (sample):`);
      result.skipped.slice(0, 10).forEach((url) => {
        console.log(`   - ${url}`);
      });
      if (result.skipped.length > 10) {
        console.log(`   ... and ${result.skipped.length - 10} more`);
      }
    }

    // Log external links (first 10)
    if (result.external.length > 0) {
      console.log(`\n🌐 External Links (sample):`);
      result.external.slice(0, 10).forEach((url) => {
        console.log(`   - ${url}`);
      });
      if (result.external.length > 10) {
        console.log(`   ... and ${result.external.length - 10} more`);
      }
    }

    // Save results to JSON file
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const resultFilePath = path.join(resultsDir, 'guest-crawl.json');
    fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Results saved to: ${resultFilePath}`);
  });

  test('should access landing page features', async ({ page, baseURL }) => {
    await page.goto(baseURL!);

    // Check key landing page elements
    const getStartedButton = page.locator('button:has-text("Get Started")').or(
      page.locator('a:has-text("Get Started")')
    );
    const getStartedCount = await getStartedButton.count();

    if (getStartedCount > 0) {
      await expect(getStartedButton.first()).toBeVisible();
      console.log(`   ✅ "Get Started" button found`);
    }

    const loginLink = page.locator('a:has-text("Log In")').or(
      page.locator('a:has-text("Login")').or(
        page.locator('button:has-text("Log In")').or(
          page.locator('button:has-text("Login")')
        )
      )
    );
    const loginCount = await loginLink.count();

    if (loginCount > 0) {
      await expect(loginLink.first()).toBeVisible();
      console.log(`   ✅ "Login" link found`);
    }

    expect(getStartedCount + loginCount, 'Should have auth-related elements').toBeGreaterThan(0);

    console.log(`   ✅ Landing page features present`);
  });

  test('should navigate to registration page', async ({ page, baseURL }) => {
    await page.goto(baseURL!);

    // Try to click "Get Started" or "Sign Up"
    const registerLink = page.locator('a:has-text("Get Started")').or(
      page.locator('a:has-text("Sign Up")').or(
        page.locator('button:has-text("Get Started")')
      )
    );

    const count = await registerLink.count();

    if (count > 0) {
      await registerLink.first().click();

      // Should navigate to registration page
      await page.waitForURL(/register|signup/i, { timeout: 10000 });

      console.log(`   ✅ Navigated to registration page: ${page.url()}`);

      // Check for registration form
      const emailInput = await page.locator('input[type="email"]').count();
      expect(emailInput, 'Registration page should have email input').toBeGreaterThan(0);
    } else {
      console.log(`   ℹ️  No "Get Started" or "Sign Up" link found on home page`);
    }
  });

  test('should navigate to login page', async ({ page, baseURL }) => {
    await page.goto(baseURL!);

    // Click login link
    const loginLink = page.locator('a:has-text("Log In")').or(
      page.locator('a:has-text("Login")').or(
        page.locator('button:has-text("Log In")').or(
          page.locator('button:has-text("Login")')
        )
      )
    );

    const count = await loginLink.count();

    if (count > 0) {
      await loginLink.first().click();

      // Should navigate to login page
      await page.waitForURL(/login/i, { timeout: 10000 });

      console.log(`   ✅ Navigated to login page: ${page.url()}`);

      // Check for login form
      const emailInput = await page.locator('input[type="email"]').count();
      const passwordInput = await page.locator('input[type="password"]').count();

      expect(emailInput, 'Login page should have email input').toBeGreaterThan(0);
      expect(passwordInput, 'Login page should have password input').toBeGreaterThan(0);
    } else {
      console.log(`   ℹ️  No "Login" link found on home page`);
    }
  });
});

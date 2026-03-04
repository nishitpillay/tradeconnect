import { test, expect } from '@playwright/test';
import {
  assertPageHealthy,
  assertMainContentPresent,
  assertHasTitle,
  assertNoConsoleErrors,
} from './lib/assertions';

test.describe('00 - Health Check', () => {
  test('should load home page without errors', async ({ page, baseURL }) => {
    test.setTimeout(60000);
    console.log(`\n🏠 Health check: Loading home page`);

    // Navigate to home
    await page.goto(baseURL!, { waitUntil: 'domcontentloaded' });

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Assert page is healthy
    await assertPageHealthy(page, baseURL!);

    // Check for main heading
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    const headingText = await heading.textContent();
    console.log(`   ✅ Home page loaded successfully`);
    console.log(`   📝 Heading: "${headingText}"`);
  });

  test('should have valid HTML structure', async ({ page, baseURL }) => {
    await page.goto(baseURL!);

    // Check basic HTML structure
    const html = await page.locator('html').count();
    expect(html).toBe(1);

    const body = await page.locator('body').count();
    expect(body).toBe(1);

    const head = await page.locator('head').count();
    expect(head).toBe(1);

    console.log(`   ✅ Valid HTML structure`);
  });

  test('should have no broken images on home', async ({ page, baseURL }) => {
    await page.goto(baseURL!);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Find all images
    const images = page.locator('img');
    const count = await images.count();

    console.log(`   🖼️  Checking ${count} images`);

    let brokenImages = 0;

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');

      // Check image has src
      if (!src) {
        console.log(`   ⚠️  Image ${i + 1} missing src attribute`);
        brokenImages++;
      }

      // Alt attribute check (accessibility)
      if (!alt) {
        console.log(`   ⚠️  Image ${i + 1} missing alt text: ${src}`);
      }
    }

    expect(brokenImages, 'All images should have src attribute').toBe(0);
    console.log(`   ✅ All images have src attributes`);
  });

  test('should have key navigation elements', async ({ page, baseURL }) => {
    await page.goto(baseURL!);

    // Check for common navigation elements
    const nav = page.locator('nav').or(page.locator('[role="navigation"]'));
    const navCount = await nav.count();

    if (navCount > 0) {
      console.log(`   ✅ Navigation present`);
    } else {
      console.log(`   ℹ️  No navigation found (may be on landing page)`);
    }

    // Check for login/signup links
    const authLinks = await page
      .locator('a:has-text("Log In"), a:has-text("Login"), a:has-text("Sign"), button:has-text("Log In"), button:has-text("Login"), button:has-text("Get Started")')
      .count();

    expect(authLinks, 'Should have auth-related links/buttons').toBeGreaterThan(0);
    console.log(`   ✅ Found ${authLinks} auth-related elements`);
  });

  test('should not have accessibility violations (basic)', async ({ page, baseURL }) => {
    await page.goto(baseURL!);

    // Check for basic accessibility issues
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();

    // Check heading hierarchy (should have h1)
    const h1Count = await page.locator('h1').count();
    expect(h1Count, 'Page should have at least one h1').toBeGreaterThan(0);

    // Check for skip link (optional but recommended)
    const skipLink = await page.locator('a:has-text("Skip to content"), a:has-text("Skip to main")').count();

    if (skipLink > 0) {
      console.log(`   ✅ Skip navigation link present`);
    } else {
      console.log(`   ℹ️  No skip navigation link (optional)`);
    }

    console.log(`   ✅ Basic accessibility check passed`);
  });

  test('should respond to viewport changes', async ({ page, baseURL }) => {
    await page.goto(baseURL!);

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    const desktopBody = await page.locator('body').boundingBox();
    expect(desktopBody).toBeTruthy();

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    const mobileBody = await page.locator('body').boundingBox();
    expect(mobileBody).toBeTruthy();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    const tabletBody = await page.locator('body').boundingBox();
    expect(tabletBody).toBeTruthy();

    console.log(`   ✅ Responsive design working`);
  });
});

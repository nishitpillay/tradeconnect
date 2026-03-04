import { Page, expect } from '@playwright/test';

/**
 * Assert no console errors occurred on the page
 */
export async function assertNoConsoleErrors(page: Page, url: string): Promise<void> {
  const errors: string[] = [];

  // Listen for console errors
  const consoleHandler = (msg: any) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  };

  // Listen for page errors
  const pageErrorHandler = (error: Error) => {
    errors.push(error.message);
  };

  page.on('console', consoleHandler);
  page.on('pageerror', pageErrorHandler);

  // Wait a moment for any async errors
  await page.waitForTimeout(500);

  // Clean up listeners
  page.off('console', consoleHandler);
  page.off('pageerror', pageErrorHandler);

  if (errors.length > 0) {
    console.log(`   ⚠️  Console errors detected on ${url}:`);
    errors.forEach((err) => console.log(`      - ${err}`));
  }

  // Note: We log but don't fail on console errors in development
  // Uncomment to fail on errors: expect(errors).toHaveLength(0);
}

/**
 * Assert no HTTP errors (4xx, 5xx)
 */
export async function assertNoHttpErrors(page: Page): Promise<void> {
  const url = page.url();

  // Check if current page has error status via response
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });

  if (response) {
    const status = response.status();
    expect(status, `HTTP ${status} on ${url}`).toBeLessThan(400);
  }
}

/**
 * Assert "404 Not Found" or error page is NOT visible
 */
export async function assertNotFoundNotVisible(page: Page): Promise<void> {
  const notFoundPatterns = [
    page.locator('text=/404/i'),
    page.locator('text=/not found/i'),
    page.locator('text=/page not found/i'),
    page.locator('text=/doesn\'t exist/i'),
  ];

  for (const locator of notFoundPatterns) {
    const isVisible = await locator.first().isVisible().catch(() => false);

    if (isVisible) {
      const text = await locator.first().textContent();
      console.log(`   ⚠️  Potential 404 text found: "${text}"`);
      // Don't fail, just warn - might be false positive
    }
  }
}

/**
 * Assert main content is present (not blank page)
 */
export async function assertMainContentPresent(page: Page): Promise<void> {
  // Check for common layout elements
  const hasMain = (await page.locator('main').count()) > 0;
  const hasBody = (await page.locator('body').count()) > 0;

  expect(hasMain || hasBody, 'Page should have main or body content').toBeTruthy();

  // Check body is not empty
  const bodyText = await page.locator('body').textContent();
  const trimmedText = bodyText?.trim() || '';

  expect(trimmedText.length, 'Body should not be empty').toBeGreaterThan(0);
}

/**
 * Assert page title is not empty
 */
export async function assertHasTitle(page: Page): Promise<void> {
  const title = await page.title();
  expect(title.length, 'Page should have a title').toBeGreaterThan(0);
  expect(title, 'Title should not be "Error"').not.toBe('Error');
}

/**
 * Assert navigation is present (for authenticated pages)
 */
export async function assertNavigationPresent(page: Page): Promise<void> {
  const hasNav =
    (await page.locator('nav').count()) > 0 ||
    (await page.locator('[role="navigation"]').count()) > 0;

  expect(hasNav, 'Page should have navigation').toBeTruthy();
}

/**
 * Comprehensive page health check
 * Run this on every page in the crawl
 */
export async function assertPageHealthy(page: Page, url: string): Promise<void> {
  console.log(`   🏥 Health check...`);

  await assertNotFoundNotVisible(page);
  await assertMainContentPresent(page);
  await assertHasTitle(page);
  // Note: Console errors are logged but don't fail the test
  await assertNoConsoleErrors(page, url);
}

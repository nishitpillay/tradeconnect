import { Page } from '@playwright/test';

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Login helper for E2E tests
 * Configurable via environment variables
 */
export async function login(
  page: Page,
  credentials: LoginCredentials,
  baseURL: string
): Promise<void> {
  console.log(`\n🔐 Logging in as: ${credentials.email}`);

  // Navigate to login page
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });

  // Wait for hydrated login form
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  const submitButton = page.getByTestId('login-submit');
  await submitButton.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-testid="login-submit"]') as HTMLButtonElement | null;
    return !!button && !button.disabled;
  });

  // Fill credentials
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);

  await submitButton.click();

  // Wait for navigation after login (redirect to dashboard or home)
  try {
    await page.waitForURL(/dashboard|jobs|quotes|messages/, { timeout: 15000 });
    console.log(`   ✅ Logged in successfully - redirected to: ${page.url()}`);
  } catch {
    // If no redirect, check if still on login page (error case)
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error('Login failed - still on login page');
    }
    console.log(`   ✅ Logged in successfully`);
  }
}

/**
 * Logout helper
 */
export async function logout(page: Page): Promise<void> {
  console.log(`\n🚪 Logging out`);

  // Find and click logout button
  const logoutButton = page.locator('button:has-text("Logout")').or(
    page.locator('button:has-text("Log Out")').or(
      page.locator('[data-testid="logout"]')
    )
  );

  await logoutButton.click();

  // Wait for redirect to login or home
  await page.waitForURL(/auth\/login|^\/$/, { timeout: 10000 });

  console.log(`   ✅ Logged out successfully`);
}

/**
 * Get customer credentials from environment
 */
export function getCustomerCredentials(): LoginCredentials | null {
  const email = process.env.E2E_CUSTOMER_EMAIL;
  const password = process.env.E2E_CUSTOMER_PASSWORD;

  if (!email || !password) {
    console.log('⚠️  Customer credentials not configured');
    console.log('   Set E2E_CUSTOMER_EMAIL and E2E_CUSTOMER_PASSWORD to enable customer crawl');
    return null;
  }

  return { email, password };
}

/**
 * Get provider credentials from environment
 */
export function getProviderCredentials(): LoginCredentials | null {
  const email = process.env.E2E_PROVIDER_EMAIL;
  const password = process.env.E2E_PROVIDER_PASSWORD;

  if (!email || !password) {
    console.log('⚠️  Provider credentials not configured');
    console.log('   Set E2E_PROVIDER_EMAIL and E2E_PROVIDER_PASSWORD to enable provider crawl');
    return null;
  }

  return { email, password };
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for common authenticated UI elements
  const logoutButton = page.locator('button:has-text("Logout")').or(
    page.locator('button:has-text("Log Out")')
  );

  return await logoutButton.isVisible().catch(() => false);
}

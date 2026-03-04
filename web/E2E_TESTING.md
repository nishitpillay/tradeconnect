# 🧪 E2E Testing with Playwright

Complete guide to running end-to-end tests for TradeConnect web application.

---

## 🚀 Quick Start

### 1. Install Playwright Browsers

```bash
npm run playwright:install
```

### 2. Configure Test Credentials

Copy the environment template:

```bash
cp .env.e2e .env.e2e.local
```

Edit `.env.e2e.local` and set your test credentials:

```env
E2E_CUSTOMER_EMAIL=customer1@test.com
E2E_CUSTOMER_PASSWORD=Test1234!

E2E_PROVIDER_EMAIL=provider1@test.com
E2E_PROVIDER_PASSWORD=Test1234!
```

### 3. Run Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run full CI suite (lint + typecheck + e2e)
npm run test:ci
```

---

## 📋 Test Suites

The E2E test suite consists of 4 main test files that run **sequentially**:

### 1. Health Check (`00_health.spec.ts`)
- Loads home page
- Checks no console errors
- Validates HTML structure
- Checks for broken images
- Verifies responsive design

### 2. Guest Crawl (`10_crawl_guest.spec.ts`)
- Starts at home page
- Extracts all internal links in DOM order
- Visits each link sequentially
- Validates page health (no 404, no errors)
- Skips authenticated routes
- Generates `test-results/guest-crawl.json`

**What it validates:**
- ✅ No HTTP 4xx/5xx errors
- ✅ No "404 Not Found" pages
- ✅ All pages have valid content
- ✅ All pages have titles
- ✅ Navigation works correctly

### 3. Customer Crawl (`20_crawl_customer.spec.ts`)
- Logs in as customer (uses E2E_CUSTOMER_EMAIL/PASSWORD)
- Crawls customer-accessible routes:
  - `/dashboard`
  - `/jobs` (my jobs)
  - `/jobs/new` (post job)
  - `/messages`
  - `/profile`
- Validates navigation and page health
- Generates `test-results/customer-crawl.json`

**Skipped if credentials not configured** - will show as "skipped" in results.

### 4. Provider Crawl (`30_crawl_provider.spec.ts`)
- Logs in as provider (uses E2E_PROVIDER_EMAIL/PASSWORD)
- Crawls provider-accessible routes:
  - `/dashboard`
  - `/jobs/feed` (browse jobs)
  - `/quotes` (my quotes)
  - `/messages`
  - `/profile`
- Validates navigation and page health
- Generates `test-results/provider-crawl.json`

**Skipped if credentials not configured** - will show as "skipped" in results.

---

## 🎯 Available Commands

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with browser visible (headed mode)
npm run test:e2e:headed

# Run with Playwright UI (interactive)
npm run test:e2e:ui

# Run full CI suite
npm run test:ci

# Run specific test file
npx playwright test tests/e2e/10_crawl_guest.spec.ts

# Run tests matching a pattern
npx playwright test --grep "health"

# View HTML report after tests
npm run playwright:report

# Install browsers
npm run playwright:install
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env.e2e.local` with these variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_BASE_URL` | `http://localhost:3000` | Base URL of the app |
| `E2E_MAX_PAGES` | `50` | Max pages to crawl per test |
| `E2E_HEADED` | `false` | Run browser in headed mode (visible) |
| `E2E_VIDEO` | `off` | Record video (`on` to enable) |
| `E2E_SKIP_SERVER` | `false` | Skip starting dev server |
| `E2E_CUSTOMER_EMAIL` | - | **Required** for customer crawl |
| `E2E_CUSTOMER_PASSWORD` | - | **Required** for customer crawl |
| `E2E_PROVIDER_EMAIL` | - | **Required** for provider crawl |
| `E2E_PROVIDER_PASSWORD` | - | **Required** for provider crawl |
| `E2E_TIMEOUT` | `3600000` | Global timeout (1 hour) |

### Skip Patterns

The crawler automatically skips:

- Logout links (`/logout`, `/sign-out`)
- Destructive actions (`/delete`, `/remove`, `/cancel`, `/award`, `/complete`)
- File downloads (`.pdf`, `.zip`, `.csv`, `.xlsx`)
- External links (different origin)
- Hash-only links (`#`)
- Non-navigable links (`mailto:`, `tel:`, `javascript:`)

---

## 📊 Test Results

### Console Output

Tests provide detailed console output:

```
🕷️  Starting sequential crawl from: http://localhost:3000

🔗 Visiting [1/50]: http://localhost:3000
   🏥 Health check...
   ✅ Success
   🔍 Found 15 links
   ➕ Queued 8 new links

🔗 Visiting [2/50]: http://localhost:3000/auth/login
   🏥 Health check...
   ✅ Success
   🔍 Found 5 links
   ➕ Queued 2 new links

✅ Crawl complete!
📄 Visited: 10 pages
❌ Broken: 0 links
⏭️  Skipped: 12 links
🌐 External: 3 links
```

### JSON Reports

Each crawl generates a JSON file in `test-results/`:

- `guest-crawl.json` - Guest crawl results
- `customer-crawl.json` - Customer crawl results
- `provider-crawl.json` - Provider crawl results

Example structure:

```json
{
  "visited": [
    "http://localhost:3000",
    "http://localhost:3000/auth/login",
    "http://localhost:3000/auth/register"
  ],
  "broken": [],
  "skipped": [
    "http://localhost:3000/auth/logout"
  ],
  "external": [
    "https://github.com",
    "https://twitter.com"
  ]
}
```

### HTML Report

View detailed HTML report:

```bash
npm run playwright:report
```

Includes:
- Test results with pass/fail status
- Screenshots on failure
- Traces for debugging
- Network logs
- Console errors

---

## 🔧 How to Extend

### 1. Add Custom Skip Patterns

Edit test file and add to `skipPatterns`:

```typescript
const crawler = new SequentialCrawler(page, {
  startUrl: baseURL!,
  skipPatterns: [
    /\/admin/i,      // Skip admin pages
    /\/api/i,        // Skip API routes
    /\/downloads/i,  // Skip downloads page
  ],
});
```

### 2. Add Allow Patterns (Whitelist)

Only crawl specific routes:

```typescript
const crawler = new SequentialCrawler(page, {
  startUrl: baseURL!,
  allowPatterns: [
    /\/jobs/i,      // Only jobs pages
    /\/profile/i,   // Only profile pages
  ],
});
```

### 3. Add Form Flow Tests

Create `tests/e2e/40_flows.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { login, getCustomerCredentials } from './lib/auth';

test.describe('Customer Flows', () => {
  test('should post a new job', async ({ page, baseURL }) => {
    const creds = getCustomerCredentials();
    if (!creds) return test.skip();

    // Login
    await login(page, creds, baseURL!);

    // Navigate to post job
    await page.goto(`${baseURL}/jobs/new`);

    // Fill form
    await page.fill('input[name="title"]', 'Test Plumbing Job');
    await page.fill('textarea[name="description"]', 'Fix leaking tap...');
    await page.selectOption('select[name="category"]', 'Plumbing');

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect to job detail
    await page.waitForURL(/\/jobs\/\d+/);

    console.log(`   ✅ Job posted successfully`);
  });

  test('should accept a quote', async ({ page, baseURL }) => {
    const creds = getCustomerCredentials();
    if (!creds) return test.skip();

    await login(page, creds, baseURL!);

    // Navigate to a job with quotes
    await page.goto(`${baseURL}/jobs/123`);

    // Click accept button on first quote
    await page.click('button:has-text("Accept"):first');

    // Confirm dialog (if any)
    await page.click('button:has-text("Confirm")');

    // Verify quote accepted
    await expect(page.locator('text=/Accepted|Awarded/i')).toBeVisible();

    console.log(`   ✅ Quote accepted`);
  });
});
```

### 4. Add Accessibility Testing

Install axe-core:

```bash
npm install -D @axe-core/playwright
```

Create `tests/e2e/50_accessibility.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('should have no accessibility violations on home', async ({ page, baseURL }) => {
    await page.goto(baseURL!);
    await injectAxe(page);

    await checkA11y(page, undefined, {
      axeOptions: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
      },
    });
  });
});
```

### 5. Run in Headed Mode

See the browser while tests run:

```bash
npm run test:e2e:headed
```

Or set environment variable:

```bash
E2E_HEADED=true npm run test:e2e
```

### 6. Debug Failed Tests

Use Playwright UI mode for debugging:

```bash
npm run test:e2e:ui
```

Or run with debug flag:

```bash
npx playwright test --debug
```

---

## 🐛 Troubleshooting

### Issue: "No tests found"

**Solution:** Check that test files are in `tests/e2e/` directory.

### Issue: "Timeout waiting for page"

**Solution:**
- Increase timeout in `playwright.config.ts`
- Check dev server is running
- Try `E2E_SKIP_SERVER=true` if server already running

### Issue: "Login failed"

**Solution:**
- Verify credentials in `.env.e2e.local`
- Check selectors in `tests/e2e/lib/auth.ts`
- Ensure backend is running
- Try logging in manually first

### Issue: "Too many pages crawled"

**Solution:**
- Reduce `E2E_MAX_PAGES` in `.env.e2e.local`
- Add more skip patterns

### Issue: "Customer/Provider tests skipped"

**Solution:**
- Set `E2E_CUSTOMER_EMAIL` and `E2E_CUSTOMER_PASSWORD` in `.env.e2e.local`
- Set `E2E_PROVIDER_EMAIL` and `E2E_PROVIDER_PASSWORD` in `.env.e2e.local`
- Ensure test accounts exist in database

### Issue: "Port 3000 already in use"

**Solution:**
```bash
# Skip starting dev server
E2E_SKIP_SERVER=true npm run test:e2e

# Or change base URL
E2E_BASE_URL=http://localhost:3001 npm run test:e2e
```

---

## 📈 CI/CD Integration

### GitHub Actions

Create `.github/workflows/e2e.yml`:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        env:
          E2E_CUSTOMER_EMAIL: ${{ secrets.E2E_CUSTOMER_EMAIL }}
          E2E_CUSTOMER_PASSWORD: ${{ secrets.E2E_CUSTOMER_PASSWORD }}
          E2E_PROVIDER_EMAIL: ${{ secrets.E2E_PROVIDER_EMAIL }}
          E2E_PROVIDER_PASSWORD: ${{ secrets.E2E_PROVIDER_PASSWORD }}
        run: npm run test:ci

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Store Secrets

In GitHub repository settings → Secrets:
- `E2E_CUSTOMER_EMAIL`
- `E2E_CUSTOMER_PASSWORD`
- `E2E_PROVIDER_EMAIL`
- `E2E_PROVIDER_PASSWORD`

---

## 📝 Best Practices

### 1. Sequential Execution

Tests run **one page at a time** to:
- Avoid race conditions
- Ensure deterministic results
- Make debugging easier
- Reduce server load

### 2. Avoid Destructive Actions

The crawler skips:
- Delete/Remove buttons
- Cancel/Logout links
- Award/Complete actions

Test these separately in dedicated flow tests.

### 3. Test Data

Create dedicated test accounts:
- `customer1@test.com` / `Test1234!`
- `provider1@test.com` / `Test1234!`

Don't use production accounts!

### 4. Assertions

Every page is validated for:
- HTTP status < 400
- No "404 Not Found" text
- Main content present
- Page has title
- Console errors logged (but don't fail)

### 5. Cleanup

Tests don't modify data, so no cleanup needed. They only:
- Navigate pages
- Click links
- Read content

---

## 🎓 Learning Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Selectors](https://playwright.dev/docs/selectors)
- [Debugging Tests](https://playwright.dev/docs/debug)

---

## ✅ Summary

**One command to run everything:**

```bash
npm run test:ci
```

This will:
1. ✅ Lint your code
2. ✅ Type-check with TypeScript
3. ✅ Run all E2E tests:
   - Health checks
   - Guest crawl (public pages)
   - Customer crawl (authenticated)
   - Provider crawl (authenticated)
4. ✅ Generate reports

**Total files created:**
- 10 TypeScript files (config + tests + utilities)
- 1 environment config
- 1 documentation file

**Ready to use!** 🚀


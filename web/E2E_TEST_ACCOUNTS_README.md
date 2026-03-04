# E2E Test Accounts - Setup Complete

## Summary

I've prepared everything for E2E testing with customer and provider accounts. Here's what was created:

### Files Created:

1. **`.env.e2e.local`** - Test credentials configuration
   - Contains credentials for customer1 and provider1 test accounts
   - Password: `Test1234!` for all accounts

2. **`scripts/create-test-accounts.ts`** - API-based account creation script
   - Creates 5 customer and 5 provider accounts via registration API
   - Requires backend to be running

3. **`tests/e2e/setup/create-accounts.ts`** - UI-based account creation script
   - Creates accounts using Playwright automation
   - Fills registration forms automatically

4. **`TEST_ACCOUNTS_SETUP.md`** - Comprehensive setup guide
   - Multiple methods to create accounts
   - Troubleshooting guide
   - Manual and automated options

5. **Backend seed script**: `backend/src/scripts/seed-test-accounts.ts`
   - Direct database seeding
   - Requires PostgreSQL running

---

## Quick Start (You Need To Do This)

Since the backend and database are not currently running, you have **3 options** to create test accounts:

### Option 1: Manual Account Creation (Easiest - No backend needed)

1. Start only the web app:
   ```bash
   cd C:/tmp/tradeconnect/web
   npm run dev
   ```

2. Open http://localhost:3000 in your browser

3. Click "Get Started" and create these accounts manually:

   **Customer Account:**
   - Click "Hire a Tradie"
   - Full Name: `Test Customer 1`
   - Email: `customer1@test.com`
   - Phone: `0400000000`
   - Password: `Test1234!`
   - Click "Create Account"

   **Provider Account:**
   - Click "Get Started" again (or logout first)
   - Click "Work as a Tradie"
   - Full Name: `Test Provider 1`
   - Email: `provider1@test.com`
   - Phone: `0400000000`
   - Password: `Test1234!`
   - Click "Create Account"

### Option 2: Start Backend + Use Automated Script

1. **Start PostgreSQL** (if not running):
   ```bash
   docker run -d \
     --name tradeconnect-db \
     -e POSTGRES_USER=tc_user \
     -e POSTGRES_PASSWORD=tc_dev_password \
     -e POSTGRES_DB=tradeconnect_dev \
     -p 5432:5432 \
     postgres:15
   ```

2. **Start Backend**:
   ```bash
   cd C:/tmp/tradeconnect/backend
   npm run dev
   ```

3. **Create accounts via API**:
   ```bash
   cd C:/tmp/tradeconnect/web
   npm run create:test-accounts
   ```

### Option 3: Direct Database Seeding

1. Start PostgreSQL (see Option 2, step 1)

2. Seed directly:
   ```bash
   cd C:/tmp/tradeconnect/backend
   npm run seed:test
   ```

---

## Running E2E Tests

Once accounts are created:

```bash
cd C:/tmp/tradeconnect/web

# Run all tests (will include customer and provider crawls)
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Run full CI suite
npm run test:ci
```

### Expected Results:

**Without test accounts:**
- Health checks: ✅ Pass (6 tests)
- Guest crawl: ✅ Pass (4 tests)
- Customer crawl: ⏭️ Skipped (6 tests) - "Customer credentials not configured"
- Provider crawl: ⏭️ Skipped (6 tests) - "Provider credentials not configured"

**With test accounts created:**
- Health checks: ✅ Pass (6 tests)
- Guest crawl: ✅ Pass (4 tests)
- Customer crawl: ✅ Pass (6 tests) - Tests customer dashboard, jobs, messages, profile
- Provider crawl: ✅ Pass (6 tests) - Tests provider dashboard, feed, quotes, messages

---

## Test Account Credentials

All configured in `.env.e2e.local`:

| Role | Email | Password |
|------|-------|----------|
| Customer | customer1@test.com | Test1234! |
| Provider | provider1@test.com | Test1234! |

**Additional accounts available** (if you use the automated scripts):
- customer2-5@test.com
- provider2-5@test.com

---

## Current Status

✅ Test infrastructure ready
✅ Configuration files created
✅ Documentation complete
⏳ **Action Required**: Create test accounts using one of the 3 options above

---

## Quick Test (Without Creating Accounts)

You can run the tests right now to see the skip behavior:

```bash
cd C:/tmp/tradeconnect/web
npm run test:e2e
```

You'll see:
- ✅ 10 tests pass (health + guest crawl)
- ⏭️ 12 tests skipped (customer + provider crawls)

This is **expected behavior** when test accounts don't exist yet.

---

## Verification

After creating accounts, verify they work:

1. Open http://localhost:3000/login
2. Login with `customer1@test.com` / `Test1234!`
3. You should see the customer dashboard
4. Logout and try `provider1@test.com` / `Test1234!`
5. You should see the provider dashboard

Once verified, run `npm run test:e2e` and all 22 tests should pass!

---

## Need Help?

See `TEST_ACCOUNTS_SETUP.md` for detailed troubleshooting and multiple setup methods.

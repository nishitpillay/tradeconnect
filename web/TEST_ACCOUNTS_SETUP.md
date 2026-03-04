# Test Accounts Setup Guide

This guide explains how to create test accounts for E2E testing.

---

## Quick Start (Automated)

If you have the backend running with a database, you can create all test accounts automatically:

```bash
# 1. Start the backend (in a separate terminal)
cd ../backend
npm run dev

# 2. Create test accounts via API
cd ../web
npm run create:test-accounts
```

This will create:
- **5 Customer accounts**: `customer1@test.com` through `customer5@test.com`
- **5 Provider accounts**: `provider1@test.com` through `provider5@test.com`
- **All passwords**: `Test1234!`

---

## Manual Account Creation

If the automated script doesn't work, you can create accounts manually:

### Option 1: Via Web UI

1. Start the web app:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Click "Get Started" or "Sign Up"

4. Fill in the registration form:

   **Customer Account 1:**
   - Email: `customer1@test.com`
   - Password: `Test1234!`
   - Full Name: `Test Customer 1`
   - Role: Customer
   - Accept terms and privacy policy

   **Provider Account 1:**
   - Email: `provider1@test.com`
   - Password: `Test1234!`
   - Full Name: `Test Provider 1`
   - Business Name: `Test Plumbing Services`
   - Role: Provider
   - Accept terms and privacy policy

5. Repeat for additional accounts (customer2-5, provider2-5)

### Option 2: Via API (curl)

**Create Customer Account:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer1@test.com",
    "password": "Test1234!",
    "role": "customer",
    "full_name": "Test Customer 1",
    "terms_accepted": true,
    "privacy_accepted": true,
    "marketing_consent": false
  }'
```

**Create Provider Account:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "provider1@test.com",
    "password": "Test1234!",
    "role": "provider",
    "full_name": "Test Provider 1",
    "business_name": "Test Plumbing Services",
    "terms_accepted": true,
    "privacy_accepted": true,
    "marketing_consent": false
  }'
```

---

## Test Account Details

### Customer Accounts

| Email | Password | Full Name | Role |
|-------|----------|-----------|------|
| customer1@test.com | Test1234! | Test Customer 1 | customer |
| customer2@test.com | Test1234! | Test Customer 2 | customer |
| customer3@test.com | Test1234! | Test Customer 3 | customer |
| customer4@test.com | Test1234! | Test Customer 4 | customer |
| customer5@test.com | Test1234! | Test Customer 5 | customer |

### Provider Accounts

| Email | Password | Full Name | Business Name | Role |
|-------|----------|-----------|---------------|------|
| provider1@test.com | Test1234! | Test Provider 1 | Test Plumbing Services | provider |
| provider2@test.com | Test1234! | Test Provider 2 | Test Electrical Works | provider |
| provider3@test.com | Test1234! | Test Provider 3 | Test Carpentry Co. | provider |
| provider4@test.com | Test1234! | Test Provider 4 | Test Painting Services | provider |
| provider5@test.com | Test1234! | Test Provider 5 | Test Landscaping | provider |

---

## Verify Setup

Once accounts are created, verify the E2E configuration:

1. Check `.env.e2e.local` exists and has credentials:
   ```bash
   cat .env.e2e.local | grep E2E_CUSTOMER_EMAIL
   cat .env.e2e.local | grep E2E_PROVIDER_EMAIL
   ```

2. Try logging in manually:
   - Open http://localhost:3000/login
   - Login with `customer1@test.com` / `Test1234!`
   - You should see the customer dashboard

3. Try provider login:
   - Logout
   - Login with `provider1@test.com` / `Test1234!`
   - You should see the provider dashboard

---

## Run E2E Tests

Once accounts are created and verified:

```bash
# Run all E2E tests (including customer and provider crawls)
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Run full CI suite
npm run test:ci

# View HTML report
npm run playwright:report
```

---

## Troubleshooting

### Issue: "Customer credentials not configured"

**Solution:** Ensure `.env.e2e.local` exists with:
```env
E2E_CUSTOMER_EMAIL=customer1@test.com
E2E_CUSTOMER_PASSWORD=Test1234!
```

### Issue: "Login failed - still on login page"

**Causes:**
1. Account doesn't exist - create it first
2. Wrong password - ensure it's `Test1234!` (capital T, exclamation mark)
3. Backend not running - start it with `cd ../backend && npm run dev`
4. Database not running - start PostgreSQL

**Solution:** Verify account exists by trying to login manually in the browser.

### Issue: "ECONNREFUSED" when creating accounts

**Solution:**
1. Start the backend:
   ```bash
   cd ../backend
   npm run dev
   ```
2. Ensure PostgreSQL is running
3. Check backend logs for any errors

### Issue: Backend requires database

**Solution:**
If you don't have PostgreSQL set up, you have two options:
1. Use Docker to run PostgreSQL:
   ```bash
   docker run -d \
     --name tradeconnect-db \
     -e POSTGRES_USER=tc_user \
     -e POSTGRES_PASSWORD=tc_dev_password \
     -e POSTGRES_DB=tradeconnect_dev \
     -p 5432:5432 \
     postgres:15
   ```

2. Create accounts manually via the web UI (doesn't require backend)

---

## Database Seeding (Advanced)

If you have direct database access, you can seed accounts using SQL:

```bash
cd ../backend
npm run seed:test
```

This requires:
- PostgreSQL running on localhost:5432
- Database `tradeconnect_dev` exists
- User `tc_user` with password configured in backend `.env`

---

## Notes

- Test accounts use the standard password `Test1234!` for simplicity
- Accounts are auto-verified (email_verified = true) for testing
- All accounts accept terms and privacy policy by default
- Marketing consent is set to false for test accounts
- You can delete test accounts from the database when done testing

---

## Summary

**Minimum Required for E2E Tests:**
- 1 Customer account: `customer1@test.com` / `Test1234!`
- 1 Provider account: `provider1@test.com` / `Test1234!`
- `.env.e2e.local` with these credentials

**Recommended for Full Testing:**
- 5 Customer accounts
- 5 Provider accounts
- All with password `Test1234!`

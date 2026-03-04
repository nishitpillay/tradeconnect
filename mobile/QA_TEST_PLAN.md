# 🧪 TradeConnect Mobile - Deep QA Test Plan

**Version**: 1.0
**Date**: 2026-02-24
**Target**: TradeConnect Mobile (React Native + Expo)
**Test Engineer**: Senior QA Lead + Mobile Test Engineer + Security/Performance Tester
**Scope**: 25 comprehensive test passes covering core flows, edge cases, security, and performance

---

## 📋 Table of Contents

1. [Test Environment Checklist](#1-test-environment-checklist)
2. [Test Data Matrix](#2-test-data-matrix)
3. [25 Deep Test Passes](#3-25-deep-test-passes)
   - Core Flow Tests (10)
   - Negative/Edge Case Tests (7)
   - Security/Privacy/Abuse Tests (4)
   - Performance/Reliability Tests (4)
4. [Bug Reporting Template](#4-bug-reporting-template)
5. [Quick Regression Suite](#5-quick-regression-suite)

---

## 1. Test Environment Checklist

### 1.1 Device Matrix
- [ ] **iOS Simulator** (iPhone 14 Pro, iOS 17+)
- [ ] **Android Emulator** (Pixel 6, Android 13+)
- [ ] **Physical iOS Device** (Real network conditions)
- [ ] **Physical Android Device** (Real network conditions)

### 1.2 Backend Setup
- [ ] Backend running at `http://localhost:3000`
- [ ] Database seeded with test data
- [ ] Redis running for rate limiting
- [ ] Socket.IO server enabled
- [ ] S3/MinIO configured for file uploads

### 1.3 App Configuration Toggles
```bash
# Test both modes
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api  # iOS Simulator
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000/api   # Android Emulator
EXPO_PUBLIC_MOCK_MODE=false  # Real backend
EXPO_PUBLIC_MOCK_MODE=true   # Mock mode
EXPO_PUBLIC_ENABLE_SOCKET=true
```

### 1.4 Network Conditions to Test
- [ ] **Fast WiFi** (default development)
- [ ] **Slow 3G** (Chrome DevTools throttling)
- [ ] **Offline mode** (airplane mode)
- [ ] **Intermittent connectivity** (toggle airplane mode during operations)

### 1.5 Pre-Test Validation
- [ ] `npm install` completed without errors
- [ ] Backend health check: `curl http://localhost:3000/api/health`
- [ ] App launches successfully on both platforms
- [ ] React Native Debugger or Flipper connected
- [ ] Network inspector enabled
- [ ] SecureStore cleared between major test runs

---

## 2. Test Data Matrix

### 2.1 Test Users

| User ID | Email | Password | Role | Status | Phone Verified | Email Verified |
|---------|-------|----------|------|--------|----------------|----------------|
| `test-cust-1` | customer1@test.com | Test1234! | customer | active | ✅ | ✅ |
| `test-cust-2` | customer2@test.com | Test1234! | customer | active | ✅ | ❌ |
| `test-cust-3` | customer3@test.com | Test1234! | customer | suspended | ✅ | ✅ |
| `test-prov-1` | provider1@test.com | Test1234! | provider | active | ✅ | ✅ |
| `test-prov-2` | provider2@test.com | Test1234! | provider | active | ✅ | ❌ |
| `test-prov-3` | provider3@test.com | Test1234! | provider | suspended | ✅ | ✅ |
| `test-new-user` | newuser@test.com | Test1234! | N/A | N/A | ❌ | ❌ |

### 2.2 Test Jobs

| Job ID | Created By | Category | Status | Budget | Location | Quotes Count |
|--------|------------|----------|--------|--------|----------|--------------|
| `job-1` | test-cust-1 | Plumbing | open | $500-$1000 | Sydney CBD | 3 |
| `job-2` | test-cust-1 | Electrical | in_progress | $1000-$2000 | Melbourne | 5 |
| `job-3` | test-cust-1 | Carpentry | completed | $2000+ | Brisbane | 8 |
| `job-4` | test-cust-2 | Painting | open | $200-$500 | Perth | 0 |
| `job-5` | test-cust-2 | Landscaping | cancelled | $500-$1000 | Adelaide | 2 |
| `job-6` | test-cust-1 | Plumbing | open | $500-$1000 | Sydney CBD | 0 (FRESH) |

### 2.3 Test Quotes

| Quote ID | Job ID | Provider | Quote Type | Amount | Status | Created |
|----------|--------|----------|------------|--------|--------|---------|
| `quote-1` | job-1 | test-prov-1 | fixed | $750 | pending | 1h ago |
| `quote-2` | job-1 | test-prov-2 | hourly | $80/hr (est 8h) | rejected | 2h ago |
| `quote-3` | job-2 | test-prov-1 | fixed | $1500 | accepted | 1d ago |
| `quote-4` | job-3 | test-prov-2 | fixed | $2500 | accepted | 7d ago |

### 2.4 Test Conversations

| Conversation ID | Participants | Last Message | Unread Count |
|-----------------|--------------|--------------|--------------|
| `conv-1` | test-cust-1 + test-prov-1 | "When can you start?" | 2 |
| `conv-2` | test-cust-1 + test-prov-2 | "Thanks for the quote" | 0 |

---

## 3. 25 Deep Test Passes

### Category A: Core Flow Tests (10 passes)

---

#### **TEST PASS #1: Complete Customer Registration Journey**

**Objective**: Verify end-to-end customer registration with all validation rules, backend integration, and auto-login flow.

**Preconditions**:
- Fresh app install (SecureStore cleared)
- Backend running with clean database
- MOCK_MODE=false

**Test Steps**:

1. Launch app → Verify welcome screen displays
2. Tap "Get Started" button
3. Tap "I need services" (customer role)
4. Fill registration form:
   - Full Name: "Test Customer One"
   - Email: "newcustomer@test.com"
   - Phone: "0412345678" (valid AU format)
   - Password: "Test1234!"
   - Confirm Password: "Test1234!"
5. Tap "Create Account"
6. Observe loading state (spinner on button)
7. Wait for API response

**Expected Results**:
- ✅ Form validates all fields before submission
- ✅ API call to `POST /auth/register` with role="customer"
- ✅ Tokens stored: refresh_token in SecureStore, access_token in memory
- ✅ User object stored in sessionStore
- ✅ Auto-navigation to customer tabs: "My Jobs", "Messages", "Profile"
- ✅ Success toast: "Account created successfully"
- ✅ Profile tab shows correct user name and "Customer" badge
- ✅ Network log shows: 201 Created response

**What to Capture**:
- Screenshot of filled registration form
- Network request/response (tokens, user object)
- SecureStore contents (verify refresh_token saved)
- Navigation state after registration

**Failure Modes & Root Causes**:
- **Registration fails with 400**: Check Zod schema alignment with backend validation
- **Tokens not persisted**: Verify SecureStore permissions in app.json
- **Navigation doesn't trigger**: Check authStore.setTokens() and sessionStore.setUser() calls
- **Wrong tabs shown**: Verify role-based tab logic in `(tabs)/_layout.tsx`

---

#### **TEST PASS #2: Complete Provider Registration Journey**

**Objective**: Verify provider registration flow with additional provider-specific fields and navigation to provider tabs.

**Preconditions**:
- Fresh app install
- Backend running
- MOCK_MODE=false

**Test Steps**:

1. Launch app → Welcome screen
2. Tap "Get Started"
3. Tap "I'm a tradie" (provider role)
4. Fill registration form:
   - Full Name: "Test Provider One"
   - Email: "newprovider@test.com"
   - Phone: "0498765432"
   - Password: "Test1234!"
   - Confirm Password: "Test1234!"
5. Tap "Create Account"
6. Wait for response

**Expected Results**:
- ✅ API call with role="provider"
- ✅ Auto-login successful
- ✅ Navigation to provider tabs: "Job Feed", "Messages", "Profile"
- ✅ Job Feed screen loads (may be empty initially)
- ✅ Profile shows "Provider" badge

**What to Capture**:
- Registration request payload (verify role field)
- Provider-specific tabs visible
- Network timeline

**Failure Modes**:
- **Provider sees customer tabs**: Role-switching logic broken
- **Job feed crashes**: Check API permissions for provider role

---

#### **TEST PASS #3: Login with Token Refresh on Expiry**

**Objective**: Verify JWT access token auto-refresh mechanism when token expires (401 response).

**Preconditions**:
- Existing user: customer1@test.com / Test1234!
- Backend configured with short access token expiry (5 minutes for testing)
- App in logged-out state

**Test Steps**:

1. Login with customer1@test.com
2. Navigate to "My Jobs" tab
3. Wait for access token to expire (5 min) OR manually expire token in backend
4. Pull down to refresh jobs list (triggers API call)
5. Observe network requests

**Expected Results**:
- ✅ First API call fails with 401 Unauthorized
- ✅ HTTP client interceptor detects 401
- ✅ Auto-refresh call to `POST /auth/refresh` with refresh_token
- ✅ New access_token received and stored
- ✅ Original request retried with new token
- ✅ Jobs list loads successfully
- ✅ No logout/navigation disruption
- ✅ User unaware of token refresh (seamless UX)

**What to Capture**:
- Network sequence:
  1. `GET /jobs/my-jobs` → 401
  2. `POST /auth/refresh` → 200 (new tokens)
  3. `GET /jobs/my-jobs` (retry) → 200
- Console logs from apiClient interceptor
- Time between 401 and successful retry

**Failure Modes**:
- **Infinite 401 loop**: Refresh token also expired or invalid
- **User logged out prematurely**: Check interceptor retry logic
- **Request not retried**: Verify axios interceptor implementation
- **Multiple refresh calls**: Race condition with concurrent 401s

---

#### **TEST PASS #4: Customer Posts New Job (Multi-Step)**

**Objective**: Verify complete job posting wizard with validation, category selection, location, budget, and backend submission.

**Preconditions**:
- Logged in as customer1@test.com
- On "My Jobs" dashboard
- MOCK_MODE=false

**Test Steps**:

1. Tap "Post a New Job" button
2. **Step 1 - Category**: Select "Plumbing"
3. Tap "Next"
4. **Step 2 - Details**:
   - Title: "Fix leaking bathroom tap"
   - Description: "Tap in main bathroom has been dripping for 2 weeks. Needs urgent repair."
5. Tap "Next"
6. **Step 3 - Location**:
   - Address: "123 Test St, Sydney NSW 2000"
   - Verify geocoding (lat/lng populated)
7. Tap "Next"
8. **Step 4 - Budget & Timeline**:
   - Budget: "$200-$500"
   - Preferred Date: Tomorrow's date
   - Urgency: "Within a week"
9. Tap "Next"
10. **Step 5 - Review**: Verify all details
11. Tap "Publish Job"

**Expected Results**:
- ✅ Each step validates before allowing "Next"
- ✅ Back button preserves form state
- ✅ Address geocoded to lat/lng (PostGIS-ready)
- ✅ API call: `POST /jobs` with all fields
- ✅ Response returns job with status="open"
- ✅ Navigation back to "My Jobs"
- ✅ New job appears at top of list
- ✅ Success toast: "Job posted successfully"
- ✅ Job card shows "Open" status pill

**What to Capture**:
- Each wizard step screenshot
- POST /jobs request payload (verify all fields)
- Response with job ID
- Updated jobs list with new entry

**Failure Modes**:
- **Geocoding fails**: Check location service permissions
- **Budget validation fails**: Verify Zod schema allows selected range
- **Job not appearing**: Check TanStack Query cache invalidation
- **Date picker issues**: Platform-specific date formatting

---

#### **TEST PASS #5: Provider Browses Job Feed with Infinite Scroll**

**Objective**: Verify infinite scroll pagination using cursor-based approach, distance-based sorting, and smooth UX.

**Preconditions**:
- Logged in as provider1@test.com
- Location permissions granted
- At least 50 jobs seeded in database (various locations)
- On "Job Feed" tab

**Test Steps**:

1. Observe initial job feed load
2. Note first 20 jobs displayed
3. Scroll to bottom of list
4. Observe "loading more" indicator
5. Wait for next page to load
6. Continue scrolling through 3-4 pages
7. Pull down to refresh
8. Verify list resets to top

**Expected Results**:
- ✅ Initial load: `GET /jobs/feed?limit=20` (no cursor)
- ✅ Jobs sorted by distance from provider's location
- ✅ Each job card shows: title, category, budget, location (suburb only), time posted
- ✅ Scroll to bottom triggers `GET /jobs/feed?cursor=<last_created_at>&limit=20`
- ✅ Next 20 jobs append to list (no duplicates)
- ✅ Infinite scroll continues until no more jobs
- ✅ Last page shows "No more jobs" indicator
- ✅ Pull-to-refresh resets cursor and reloads from top
- ✅ Smooth scrolling (no jank), FlatList optimization working

**What to Capture**:
- Network sequence showing cursor progression
- FlatList performance metrics (check for dropped frames)
- Screenshot showing distance-based sorting (closest jobs first)

**Failure Modes**:
- **Duplicate jobs**: Cursor logic broken (check created_at + id combination)
- **Jobs not loading**: Missing next_cursor in API response
- **Wrong sort order**: PostGIS distance calculation issue
- **Performance lag**: FlatList not using `getItemLayout` or `keyExtractor`

---

#### **TEST PASS #6: Provider Submits Quote on Job**

**Objective**: Verify quote submission form with validation, fixed vs hourly pricing, and customer notification.

**Preconditions**:
- Logged in as provider1@test.com
- Job `job-6` exists (open status, 0 quotes)
- Provider has NOT quoted on this job yet

**Test Steps**:

1. From Job Feed, tap on job card for `job-6`
2. View job detail screen
3. Tap "Submit Quote" button
4. Fill quote form:
   - Quote Type: Select "Fixed Price"
   - Amount: "$650"
   - Estimated Days: "2"
   - Notes: "I can start immediately. Includes all materials."
5. Tap "Submit Quote"
6. Observe loading state
7. Wait for API response

**Expected Results**:
- ✅ Form validates: amount > 0, notes optional
- ✅ API call: `POST /quotes` with job_id, quote_type, amount, days, notes
- ✅ Response: 201 Created with quote object
- ✅ Success toast: "Quote submitted successfully"
- ✅ Job detail updates: "Quote Submitted" button (disabled/changed state)
- ✅ Quote appears in provider's "My Quotes" section (if implemented)
- ✅ Backend sends notification to customer (job owner)

**What to Capture**:
- Quote submission payload
- Response with quote ID and status="pending"
- Updated job detail UI state
- Backend notification log (customer notified)

**Failure Modes**:
- **Duplicate quote**: Provider quotes twice on same job (check backend constraint)
- **Amount validation fails**: Decimal/currency formatting issues
- **Quote not appearing**: TanStack Query cache not invalidated
- **Customer not notified**: Socket.IO or notification service issue

---

#### **TEST PASS #7: Customer Views & Accepts Quote**

**Objective**: Verify customer can view all quotes on their job, compare them, and accept one (changing job status).

**Preconditions**:
- Logged in as customer1@test.com
- Job `job-1` has 3 pending quotes (quote-1, quote-2, quote-3)
- Job status is "open"

**Test Steps**:

1. Navigate to "My Jobs" tab
2. Tap on job card for `job-1`
3. View job detail screen
4. Scroll to "Quotes Received" section
5. Observe all 3 quotes listed with:
   - Provider name
   - Quote amount
   - Quote type (fixed/hourly)
   - Estimated days
   - Notes
   - "Accept" and "Reject" buttons
6. Tap "Accept" on quote-1 ($750, test-prov-1)
7. Confirm acceptance in dialog
8. Wait for API response

**Expected Results**:
- ✅ All quotes displayed in sortable list (lowest to highest)
- ✅ API call: `PATCH /quotes/:id/accept`
- ✅ Quote status changes to "accepted"
- ✅ Job status changes to "in_progress"
- ✅ Job is now "awarded" to test-prov-1
- ✅ Other quotes auto-rejected (status="rejected")
- ✅ Success toast: "Quote accepted! Job awarded to [Provider Name]"
- ✅ Job detail UI updates: shows "In Progress" status pill
- ✅ Provider receives notification (Socket.IO + push)
- ✅ Exact address now revealed to accepted provider only

**What to Capture**:
- Before/after screenshots of quotes list
- PATCH /quotes/:id/accept response
- Updated job object (status, awarded_to fields)
- Socket.IO event to provider (quote accepted)

**Failure Modes**:
- **Multiple quotes accepted**: Backend constraint violation
- **Other quotes not rejected**: Transaction logic issue
- **Address not revealed**: Check address encryption logic
- **Job status stuck**: State machine transition failed

---

#### **TEST PASS #8: Real-Time Messaging with Socket.IO**

**Objective**: Verify bi-directional real-time messaging between customer and provider with typing indicators and delivery receipts.

**Preconditions**:
- Logged in as customer1@test.com on Device A
- Logged in as test-prov-1 on Device B (or separate simulator)
- Conversation `conv-1` exists between them
- Socket.IO server running

**Test Steps**:

1. **Device A (Customer)**: Navigate to Messages → tap conversation with test-prov-1
2. **Device B (Provider)**: Navigate to Messages → tap same conversation
3. **Device A**: Type message "When can you start the plumbing job?"
4. **Device A**: Observe typing indicator
5. **Device A**: Send message
6. **Device B**: Verify message appears instantly (no refresh needed)
7. **Device B**: Type reply "I can start tomorrow morning at 9am"
8. **Device B**: Send message
9. **Device A**: Verify reply appears instantly
10. Check message status: sent → delivered → read

**Expected Results**:
- ✅ Socket connects on app launch (verify in socketStore)
- ✅ Typing indicator shows "test-prov-1 is typing..."
- ✅ Message sent via Socket.IO emit: `message:send`
- ✅ Message received via Socket.IO on: `message:new`
- ✅ Message appears in real-time (< 500ms latency)
- ✅ Message persisted in backend (GET /messages still works)
- ✅ Unread count updates in conversations list
- ✅ Read receipts update when viewing conversation
- ✅ Connection resilient to network interruptions (auto-reconnect)

**What to Capture**:
- Socket.IO event logs (emit/on events)
- Network tab showing WebSocket connection
- Message delivery timeline (sent → delivered → read)
- Screenshot showing typing indicator

**Failure Modes**:
- **Socket doesn't connect**: Check EXPO_PUBLIC_ENABLE_SOCKET=true
- **Messages not appearing**: Socket event listeners not registered
- **Duplicate messages**: Event handler called multiple times
- **Connection drops**: Auto-reconnect logic broken

---

#### **TEST PASS #9: Profile Edit & Logout Flow**

**Objective**: Verify user can update profile info and logout correctly clears all auth state.

**Preconditions**:
- Logged in as customer1@test.com

**Test Steps**:

1. Navigate to "Profile" tab
2. Tap "Edit Profile" (if implemented) or view profile info
3. Observe current: name, email, phone, role badge
4. Tap "Log Out" button
5. Confirm logout in dialog (if present)
6. Wait for logout process

**Expected Results**:
- ✅ Profile displays correct user data from sessionStore
- ✅ Logout calls: authStore.clearTokens() and sessionStore.clearSession()
- ✅ refresh_token removed from SecureStore
- ✅ access_token cleared from memory
- ✅ Socket.IO disconnects
- ✅ TanStack Query cache cleared
- ✅ Navigation redirects to welcome screen
- ✅ Success toast: "Logged out successfully"
- ✅ Back button does NOT return to tabs (auth protection)

**What to Capture**:
- Before/after SecureStore state
- Navigation flow (tabs → welcome)
- Socket.IO disconnect event
- Query cache cleared (check React Query DevTools)

**Failure Modes**:
- **Tokens persist**: SecureStore not cleared
- **Cache remains**: Old data shows after re-login
- **Socket stays connected**: Memory leak potential

---

#### **TEST PASS #10: Image Upload to S3 (Profile Picture or Job Photos)**

**Objective**: Verify presigned S3 upload flow for images with progress tracking and error handling.

**Preconditions**:
- Logged in as customer1@test.com
- S3/MinIO configured in backend
- Camera/photo library permissions granted

**Test Steps**:

1. Navigate to Profile tab
2. Tap on avatar placeholder
3. Select "Choose from Library"
4. Pick image (< 5MB)
5. Observe upload progress indicator
6. Wait for upload completion
7. Verify image appears

**Expected Results**:
- ✅ API call: `GET /uploads/presigned-url?file_type=image/jpeg`
- ✅ Receive presigned URL and fields
- ✅ Upload file directly to S3 using presigned URL (PUT request)
- ✅ Progress bar shows 0% → 100%
- ✅ After upload, call `POST /users/profile/picture` with S3 key
- ✅ Profile picture updates in UI
- ✅ Image cached and displayed immediately
- ✅ Success toast: "Profile picture updated"

**What to Capture**:
- Presigned URL request/response
- S3 PUT request with upload progress
- Final profile update API call
- Uploaded image displayed

**Failure Modes**:
- **Upload stalls at 100%**: S3 CORS issue
- **Image not appearing**: S3 key not saved to user profile
- **Large file rejected**: Size validation on frontend/backend
- **Progress not showing**: Upload progress listener not hooked

---

### Category B: Negative/Edge Case Tests (7 passes)

---

#### **TEST PASS #11: Invalid Login Attempts & Rate Limiting**

**Objective**: Verify login validation, error messages, and backend rate limiting protection.

**Preconditions**:
- App at login screen
- Backend rate limiting enabled (5 attempts per 15 min)

**Test Steps**:

1. **Invalid Email Format**:
   - Enter: "notanemail"
   - Tap "Login"
   - Expect: Zod validation error "Invalid email format"

2. **Weak Password**:
   - Email: "test@test.com"
   - Password: "123"
   - Tap "Login"
   - Expect: Frontend validation error "Password must be 8+ characters"

3. **Wrong Credentials**:
   - Email: "customer1@test.com"
   - Password: "WrongPassword123!"
   - Tap "Login" → Wait for API response
   - Expect: 401 Unauthorized, error toast "Invalid credentials"

4. **Repeat Wrong Password 5 Times**:
   - Attempt login 5 times with wrong password
   - On 6th attempt, expect: 429 Too Many Requests
   - Error message: "Too many login attempts. Please try again in 15 minutes."

5. **Wait & Retry**:
   - Wait 15 minutes (or manually reset rate limit in Redis)
   - Login with correct password
   - Expect: Successful login

**Expected Results**:
- ✅ Frontend Zod validation catches format errors before API call
- ✅ Backend returns 401 with clear error message
- ✅ Rate limiting kicks in after 5 failed attempts
- ✅ 429 response handled gracefully with user-friendly message
- ✅ Retry-After header respected (optional)
- ✅ No password shown in network logs (masked)

**What to Capture**:
- Validation error screenshots
- Network responses: 401, 429
- Rate limiting headers (X-RateLimit-Remaining)

**Failure Modes**:
- **Rate limit not working**: Redis not connected
- **Passwords visible in logs**: Security issue
- **Generic error messages**: Poor UX

---

#### **TEST PASS #12: Network Offline → Online Transition**

**Objective**: Verify app behavior during network loss and recovery with queued actions.

**Preconditions**:
- Logged in as customer1@test.com
- On "My Jobs" screen with active network

**Test Steps**:

1. Load jobs list (verify data present)
2. **Enable Airplane Mode** (disconnect network)
3. Pull down to refresh jobs
4. Attempt to post a new job
5. Attempt to navigate to Messages
6. **Disable Airplane Mode** (restore network)
7. Observe automatic retry of failed actions
8. Manually retry failed actions if needed

**Expected Results**:
- ✅ Pull-to-refresh shows error toast: "No internet connection"
- ✅ Cached data still visible (TanStack Query cache)
- ✅ Post job form saves to local state (optional: queue for retry)
- ✅ Network error icon appears in UI
- ✅ On reconnect, app auto-retries failed requests
- ✅ Jobs list refreshes automatically
- ✅ Success toast: "Connection restored"
- ✅ Socket.IO reconnects automatically

**What to Capture**:
- Offline error states
- Cached data still displaying
- Auto-reconnect network logs
- Socket.IO reconnect events

**Failure Modes**:
- **App crashes on offline**: Missing error handling
- **Data not cached**: TanStack Query gcTime too short
- **Socket doesn't reconnect**: Reconnection logic broken
- **Infinite retry loop**: Exponential backoff missing

---

#### **TEST PASS #13: Suspended User Account Access**

**Objective**: Verify suspended users cannot access app features and are shown appropriate messaging.

**Preconditions**:
- User account: test-cust-3@test.com (status="suspended" in backend)
- App logged out

**Test Steps**:

1. Login with test-cust-3@test.com credentials
2. Observe API response
3. Attempt to navigate (if login succeeds)
4. Attempt to post job or perform action

**Expected Results**:
- ✅ Login API returns 403 Forbidden OR 200 with user.status="suspended"
- ✅ Error message: "Your account has been suspended. Contact support."
- ✅ User NOT allowed to access tabs
- ✅ Support email/link provided
- ✅ Logout option available

**What to Capture**:
- Login response with suspension flag
- Suspension error screen
- User prevented from performing actions

**Failure Modes**:
- **Suspended user can still act**: Backend authorization check missing
- **No explanation**: Poor UX

---

#### **TEST PASS #14: Concurrent Session Handling (Same User, Multiple Devices)**

**Objective**: Verify app handles same user logged in on multiple devices without conflicts.

**Preconditions**:
- Device A: iOS Simulator
- Device B: Android Emulator
- Both logged in as customer1@test.com

**Test Steps**:

1. Login on Device A
2. Login on Device B (same account)
3. Observe if Device A session invalidated OR both active
4. Post job on Device A
5. Verify job appears on Device B (after refresh or real-time)
6. Logout on Device A
7. Check if Device B still authenticated

**Expected Results**:
- ✅ Backend allows multiple sessions (separate refresh tokens)
- ✅ Both devices can operate independently
- ✅ Data synced via API (not sessions)
- ✅ Logout on one device doesn't affect other
- ✅ Socket.IO maintains separate connections

**What to Capture**:
- Multiple active sessions in backend logs
- Separate Socket.IO connections
- Data sync across devices

**Failure Modes**:
- **Session conflict**: One device logs out other
- **Data inconsistency**: Cache not invalidated
- **Socket.IO issue**: Messages sent to only one device

---

#### **TEST PASS #15: Job with 0 Quotes (Empty State)**

**Objective**: Verify empty states display correctly with helpful messaging.

**Preconditions**:
- Logged in as customer2@test.com
- Job `job-4` has 0 quotes

**Test Steps**:

1. Navigate to "My Jobs"
2. Tap on job-4 card
3. View job detail screen
4. Scroll to "Quotes" section

**Expected Results**:
- ✅ Empty state illustration/icon
- ✅ Message: "No quotes yet. Providers will submit quotes soon."
- ✅ CTA button: "Share Job" or "Edit Job" (if applicable)
- ✅ No loading spinner (not stuck loading)

**What to Capture**:
- Empty state screenshot
- Helpful messaging

**Failure Modes**:
- **Infinite loading**: API call failing silently
- **Crash**: Null/undefined not handled

---

#### **TEST PASS #16: Character Limits & Special Characters in Forms**

**Objective**: Verify form validation handles edge cases: max length, special chars, emojis, SQL injection attempts.

**Preconditions**:
- Logged in, on job posting form

**Test Steps**:

1. **Max Length Test**:
   - Title: Enter 500 characters
   - Description: Enter 10,000 characters
   - Expect: Validation error or truncation

2. **Special Characters**:
   - Title: "Test <script>alert('XSS')</script>"
   - Description: "'; DROP TABLE jobs; --"
   - Submit and verify sanitized on backend

3. **Emojis**:
   - Title: "Fix 🚰 leak 💧"
   - Submit and verify renders correctly

4. **Empty Required Fields**:
   - Leave title blank
   - Expect: "Title is required" error

**Expected Results**:
- ✅ Frontend enforces max lengths (Zod schema)
- ✅ Special characters escaped/sanitized (no XSS)
- ✅ SQL injection attempts blocked by parameterized queries
- ✅ Emojis supported (UTF-8 encoding)
- ✅ Required field validation

**What to Capture**:
- Validation errors
- Sanitized data in backend logs

**Failure Modes**:
- **XSS vulnerability**: HTML not escaped
- **SQL injection**: Queries not parameterized
- **Unicode issues**: Emojis cause crashes

---

#### **TEST PASS #17: Token Refresh Failure & Force Logout**

**Objective**: Verify graceful logout when refresh token expires or is invalid.

**Preconditions**:
- Logged in as customer1@test.com
- Manually invalidate refresh token in backend OR wait 30 days

**Test Steps**:

1. Make API request that triggers 401
2. App attempts token refresh
3. Refresh API returns 401 (refresh token invalid)
4. Observe app behavior

**Expected Results**:
- ✅ Token refresh fails with 401
- ✅ HTTP client recognizes irrecoverable error
- ✅ App clears all auth state
- ✅ User redirected to login screen
- ✅ Error toast: "Session expired. Please login again."
- ✅ No infinite retry loop

**What to Capture**:
- Network: 401 on refresh endpoint
- Auto-logout flow
- User redirected cleanly

**Failure Modes**:
- **Infinite retry**: App keeps trying to refresh
- **Crash**: Null user state not handled
- **Silent failure**: User stuck on blank screen

---

### Category C: Security/Privacy/Abuse Tests (4 passes)

---

#### **TEST PASS #18: Address Privacy (Exact vs Approximate)**

**Objective**: Verify exact address only revealed to awarded provider, others see suburb only.

**Preconditions**:
- Job `job-1` with exact_address="123 Main St, Sydney NSW 2000"
- Quote from provider1 (accepted)
- Quote from provider2 (rejected)

**Test Steps**:

1. **Provider 1 (Accepted)**: Login, view job-1 detail
2. Verify full address visible: "123 Main St, Sydney NSW 2000"
3. **Provider 2 (Rejected)**: Login, view job-1 detail (if still visible)
4. Verify only suburb: "Sydney NSW"
5. **Provider 3 (No Quote)**: View job-1 in feed
6. Verify only suburb visible

**Expected Results**:
- ✅ Awarded provider sees `exact_address`
- ✅ Other providers see `approximate_address` (suburb only)
- ✅ Address encryption working (backend stores encrypted exact_address)
- ✅ API response includes correct field based on requester

**What to Capture**:
- API response for provider1 (includes exact_address)
- API response for provider2 (only approximate_address)
- Job detail screenshots from both providers

**Failure Modes**:
- **Address leaked**: All providers see exact address (privacy violation)
- **Encryption broken**: Plain text in database
- **Wrong field shown**: Frontend displays wrong address field

---

#### **TEST PASS #19: JWT Token Security (No Token in URL/Logs)**

**Objective**: Verify tokens never exposed in URLs, logs, or screenshots.

**Preconditions**:
- Logged in

**Test Steps**:

1. Check network logs for all API calls
2. Verify tokens sent in Authorization header, NOT query params
3. Check console logs (no token values logged)
4. Take screenshot → verify no tokens visible
5. Check AsyncStorage/SecureStore → verify refresh token encrypted

**Expected Results**:
- ✅ All API calls: `Authorization: Bearer <token>` in headers
- ✅ NO tokens in URL query strings
- ✅ Console logs mask sensitive data
- ✅ SecureStore uses hardware encryption (iOS Keychain, Android Keystore)
- ✅ Tokens never visible in UI

**What to Capture**:
- Network request headers (verify Authorization header)
- Console logs (no tokens)
- SecureStore encrypted value (not plain text)

**Failure Modes**:
- **Token in URL**: `GET /jobs?token=abc123` (CRITICAL)
- **Plain text storage**: SecureStore not used
- **Logging leak**: console.log(token)

---

#### **TEST PASS #20: Quote Spamming Prevention**

**Objective**: Verify provider cannot spam quotes on same job or flood with low-quality quotes.

**Preconditions**:
- Logged in as provider1@test.com
- Job `job-6` exists (0 quotes)

**Test Steps**:

1. Submit quote on job-6 with amount=$500
2. Attempt to submit second quote on same job
3. Expect error: "You already submitted a quote on this job"
4. Submit quotes on 20 different jobs within 1 minute
5. On 21st quote, expect rate limiting

**Expected Results**:
- ✅ Backend constraint: 1 quote per provider per job
- ✅ Duplicate quote returns 409 Conflict
- ✅ Rate limiting on quote submission (max 10/minute)
- ✅ Error toast: "Slow down! Too many quotes submitted."

**What to Capture**:
- 409 Conflict response
- 429 Rate limit response
- Backend database constraint error

**Failure Modes**:
- **Multiple quotes allowed**: Database constraint missing
- **No rate limit**: Spam possible

---

#### **TEST PASS #21: Role-Based Access Control (Provider Tries Customer Actions)**

**Objective**: Verify provider cannot post jobs (customer-only action).

**Preconditions**:
- Logged in as provider1@test.com

**Test Steps**:

1. Attempt to navigate to "Post Job" (if UI allows)
2. Attempt direct API call: `POST /jobs` with valid data
3. Observe response

**Expected Results**:
- ✅ UI does NOT show "Post Job" button for providers
- ✅ API call returns 403 Forbidden
- ✅ Error: "Providers cannot post jobs"
- ✅ Backend validates user.role on all endpoints

**What to Capture**:
- 403 Forbidden response
- Backend authorization middleware logs

**Failure Modes**:
- **Provider posts job**: RBAC broken (CRITICAL)
- **No error message**: Silent failure

---

### Category D: Performance/Reliability Tests (4 passes)

---

#### **TEST PASS #22: App Launch Performance (Cold Start)**

**Objective**: Measure and optimize cold start time (app open to interactive).

**Preconditions**:
- App killed (not in background)
- Device: Physical device (more accurate than simulator)

**Test Steps**:

1. Force quit app
2. Start timer
3. Tap app icon
4. Measure time until welcome screen fully interactive
5. Login as customer1@test.com
6. Measure time until "My Jobs" tab loads with data

**Expected Results**:
- ✅ Cold start to welcome screen: < 3 seconds
- ✅ Login to data loaded: < 2 seconds (with network)
- ✅ No blocking operations on UI thread
- ✅ Splash screen displays smoothly
- ✅ TanStack Query cache hydrated from persistence

**What to Capture**:
- Performance timeline (React Native Performance Monitor)
- JS thread FPS (should be 60fps)
- Time to interactive (TTI)

**Failure Modes**:
- **Slow start**: Large bundle size, unoptimized imports
- **White screen**: Crash on startup
- **Jank**: Dropped frames during navigation

---

#### **TEST PASS #23: Memory Leak Detection (Long Session)**

**Objective**: Verify no memory leaks during extended use with navigation and data loading.

**Preconditions**:
- Logged in as provider1@test.com
- Memory profiler connected (Flipper or Xcode Instruments)

**Test Steps**:

1. Start memory profiler
2. Navigate: Job Feed → Messages → Profile → repeat 20 times
3. Scroll through job feed (trigger infinite scroll 10 times)
4. Open/close 10 job detail screens
5. Monitor memory usage over 10 minutes

**Expected Results**:
- ✅ Memory usage stabilizes (no continuous growth)
- ✅ GC (garbage collection) reclaims unused memory
- ✅ No leaked listeners (Socket.IO, query subscriptions)
- ✅ Images unloaded from cache when not visible
- ✅ Memory usage < 200MB on modern devices

**What to Capture**:
- Memory graph over time (should plateau, not climb)
- Heap snapshot (no retained objects)
- Event listener count (should not grow indefinitely)

**Failure Modes**:
- **Memory climbs continuously**: Listeners not cleaned up
- **App crashes**: Out of memory (OOM)
- **Images not released**: Large image cache

---

#### **TEST PASS #24: Slow Network Performance (3G Throttling)**

**Objective**: Verify app remains usable on slow networks with appropriate loading states.

**Preconditions**:
- Chrome DevTools network throttling: Slow 3G (750ms latency, 400kbps)
- Logged in as customer1@test.com

**Test Steps**:

1. Enable Slow 3G throttling
2. Navigate to "My Jobs"
3. Observe loading states (skeleton screens, spinners)
4. Pull to refresh
5. Open job detail
6. Attempt to post new job
7. Monitor user feedback during waits

**Expected Results**:
- ✅ Loading skeletons appear immediately (not blank screens)
- ✅ Cached data shown while fetching (stale-while-revalidate)
- ✅ Timeout handling: requests timeout after 30s
- ✅ Error message: "Slow connection detected. Still loading..."
- ✅ Request cancellation on navigation away
- ✅ No UI freezing (async operations)

**What to Capture**:
- Loading state screenshots
- Network timeline (long request durations)
- User-facing loading indicators

**Failure Modes**:
- **Blank screens**: No loading states
- **Timeout crashes**: Unhandled timeout errors
- **Frozen UI**: Blocking network calls on main thread

---

#### **TEST PASS #25: Background/Foreground Transition (Socket.IO Reconnect)**

**Objective**: Verify app correctly handles background → foreground transitions with Socket.IO reconnection and data refresh.

**Preconditions**:
- Logged in as customer1@test.com
- On "Messages" screen with active conversation
- Socket.IO connected

**Test Steps**:

1. Verify Socket.IO connection active (check socketStore)
2. Press home button (app goes to background)
3. Wait 5 minutes
4. Open app again (foreground)
5. Observe Socket.IO reconnection
6. Send message immediately after foregrounding
7. Check if new messages received during background appear

**Expected Results**:
- ✅ Socket disconnects gracefully in background (after timeout)
- ✅ On foreground, Socket reconnects automatically
- ✅ Missed messages fetched via API (GET /messages)
- ✅ Unread count updated
- ✅ App state rehydrated (no data loss)
- ✅ TanStack Query refetches stale data
- ✅ No duplicate connections (old socket cleaned up)

**What to Capture**:
- Socket.IO disconnect/reconnect events
- AppState logs (active, background, inactive)
- Messages synced after foregrounding

**Failure Modes**:
- **Socket doesn't reconnect**: Reconnection logic broken
- **Duplicate sockets**: Memory leak
- **Messages lost**: No API fallback for missed messages
- **Stale data**: Cache not refreshed

---

## 4. Bug Reporting Template

Use this template for any bugs discovered during testing:

```markdown
### Bug Report #[ID]

**Title**: [Brief description]

**Severity**: [Critical / High / Medium / Low]

**Priority**: [P0 / P1 / P2 / P3]

**Platform**: [iOS / Android / Both]

**Environment**:
- App Version: [e.g., 1.0.0-beta]
- Device: [e.g., iPhone 14 Pro, iOS 17.2]
- Backend: [Local / Staging / Production]
- Network: [WiFi / 4G / 3G / Offline]

**Test Pass**: [e.g., #3: Login with Token Refresh]

**Preconditions**:
- [e.g., Logged in as customer1@test.com]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Expected vs Actual]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Evidence**:
- Screenshot: [Attach]
- Video: [Link]
- Network logs: [Attach]
- Console errors: [Paste]

**Root Cause (if known)**:
[e.g., Token refresh interceptor not handling 401 correctly]

**Suggested Fix**:
[e.g., Update apiClient.ts line 45 to retry with new token]

**Workaround**:
[Temporary fix for users]

**Related Issues**: [#123, #456]
```

---

## 5. Quick Regression Suite

**10 Must-Run Checks Before Release**

1. ✅ **Smoke Test**: App launches on iOS and Android without crashes
2. ✅ **Auth Flow**: Register, login, logout all work
3. ✅ **Token Refresh**: Access token auto-refreshes on expiry
4. ✅ **Customer Flow**: Post job → View jobs → Accept quote
5. ✅ **Provider Flow**: Browse feed → Submit quote → View accepted jobs
6. ✅ **Real-Time**: Send message via Socket.IO (appears on other device)
7. ✅ **Offline**: App shows cached data and error messages when offline
8. ✅ **Rate Limiting**: 6th failed login attempt returns 429
9. ✅ **Role-Based Access**: Provider cannot post jobs (403 Forbidden)
10. ✅ **Performance**: Job feed scrolls at 60fps with 100+ jobs

**Runtime**: ~30 minutes

**Automate**: Consider using Detox or Maestro for automated E2E tests covering these flows.

---

## 📊 Test Coverage Summary

| Category | Passes | Estimated Time |
|----------|--------|----------------|
| **Core Flows** | 10 | 4-5 hours |
| **Negative/Edge Cases** | 7 | 2-3 hours |
| **Security/Privacy** | 4 | 1-2 hours |
| **Performance/Reliability** | 4 | 2-3 hours |
| **Total** | **25** | **9-13 hours** |

---

## 🔄 Test Execution Plan

### Phase 1: Core Flows (Day 1)
- Run TEST PASS #1-#10
- Focus on happy paths
- Verify all major features work

### Phase 2: Edge Cases (Day 2)
- Run TEST PASS #11-#17
- Break things intentionally
- Verify error handling

### Phase 3: Security (Day 3)
- Run TEST PASS #18-#21
- Audit sensitive data handling
- Check RBAC enforcement

### Phase 4: Performance (Day 4)
- Run TEST PASS #22-#25
- Profile with real devices
- Optimize bottlenecks

### Phase 5: Regression (Day 5)
- Run quick regression suite
- Fix critical bugs
- Prepare release notes

---

## 🎯 Success Criteria

**Ready to Ship When**:
- ✅ All 25 test passes executed
- ✅ Zero P0/P1 bugs open
- ✅ 10 regression checks pass
- ✅ Performance benchmarks met:
  - Cold start < 3s
  - 60fps scrolling
  - Memory stable < 200MB
- ✅ Security audit passed (tokens secure, RBAC enforced)
- ✅ Both iOS and Android tested on physical devices

---

**Document Version**: 1.0
**Last Updated**: 2026-02-24
**QA Lead**: Senior QA Lead + Mobile Test Engineer + Security/Performance Tester
**Status**: ✅ READY FOR EXECUTION

---

## 📝 Notes for QA Team

1. **Use Real Devices**: Simulators miss performance issues
2. **Test Both Platforms**: iOS and Android have different behaviors
3. **Network Conditions**: Don't just test on fast WiFi
4. **Clean State**: Clear SecureStore between major test runs
5. **Document Everything**: Screenshots, videos, logs for every bug
6. **Exploratory Testing**: These 25 passes are baseline, explore beyond them
7. **Automation**: Prioritize automating regression suite with Detox/Maestro
8. **Performance**: Use React Native Performance Monitor and Flipper
9. **Security**: Never commit tokens or secrets in bug reports
10. **Communication**: Daily standups to share findings

---

**END OF TEST PLAN**

# ⚡ TradeConnect Web - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Install Dependencies (2 min)

```bash
cd C:/tmp/tradeconnect/web
npm install
```

**What's being installed:**
- Next.js 14 + React 18
- TanStack Query for data fetching
- Axios for HTTP requests
- Socket.IO client for real-time messaging
- Zod for validation
- Tailwind CSS for styling

**Time:** ~2 minutes

---

### Step 2: Configure Environment (30 seconds)

The `.env.local` file is already created with defaults:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

**Only change this if:**
- Your backend runs on a different port
- You're connecting to a remote backend

---

### Step 3: Start Development Server (30 seconds)

```bash
npm run dev
```

**Expected output:**
```
> next dev

   ▲ Next.js 14.2.0
   - Local:        http://localhost:3000
   - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.5s
```

---

### Step 4: Open in Browser

Navigate to: **http://localhost:3000**

You should see the TradeConnect landing page!

---

## 🎯 What Can You Do Now?

### Without Backend Running (Frontend Only)
- ✅ View landing page
- ✅ See login/register forms
- ✅ Navigate between pages
- ✅ See UI components
- ❌ Cannot login/register (needs backend)
- ❌ Cannot post jobs or quotes

### With Backend Running (Full Functionality)
- ✅ Everything above
- ✅ Register new accounts (customer/provider)
- ✅ Login and logout
- ✅ Post jobs (customer)
- ✅ Browse jobs (provider)
- ✅ Submit quotes (provider)
- ✅ Real-time messaging
- ✅ Complete workflows

---

## 🔧 Start Backend (if not running)

In a separate terminal:

```bash
cd C:/tmp/tradeconnect/backend
npm run dev
```

Backend should start on http://localhost:3000

---

## 📖 Testing the App

### Register as Customer

1. Click "Get Started" or navigate to `/auth/register`
2. Click "Hire a Tradie"
3. Fill form:
   - Name: "John Customer"
   - Email: "john@example.com"
   - Phone: "0412345678"
   - Password: "Test1234!"
4. Click "Create Account"
5. You're now logged in as a customer!

### Post a Job (Customer)

1. From dashboard, click "Post New Job"
2. Fill the job form:
   - Title: "Fix leaking kitchen tap"
   - Description: "Main kitchen tap has been dripping for 2 weeks..."
   - Category: "Plumbing"
   - Budget: "$200-$500"
   - Address: "123 Test St, Sydney NSW 2000"
3. Click "Post Job"
4. Job is now visible to providers!

### Register as Provider

1. Open incognito window (or different browser)
2. Navigate to `/auth/register`
3. Click "Work as a Tradie"
4. Fill form with provider details
5. Create account
6. You're now a provider!

### Browse Jobs & Submit Quote (Provider)

1. From provider dashboard, view recommended jobs
2. Or go to "Browse Jobs" to see all jobs
3. Click on a job to view details
4. Click "Submit Quote"
5. Fill quote form:
   - Type: "Fixed Price"
   - Amount: "$350"
   - Days: "1"
   - Notes: "I can fix this tomorrow..."
6. Submit quote
7. Customer now sees your quote!

### Award Job (Customer)

1. Switch back to customer account
2. Go to job detail page
3. View quotes from providers
4. Click "Accept Quote" on preferred provider
5. Job is now awarded!
6. You can now message the provider

---

## 🎨 Page Routes

### Public Pages
- `/` - Landing page
- `/auth/login` - Login
- `/auth/register` - Registration

### Customer Pages (after login)
- `/dashboard` - Customer dashboard
- `/jobs` - My jobs list
- `/jobs/new` - Post new job
- `/jobs/[id]` - Job detail
- `/messages` - Messages
- `/profile` - Profile

### Provider Pages (after login)
- `/dashboard` - Provider dashboard
- `/jobs/feed` - Browse all jobs
- `/jobs/[id]` - Job detail & quote
- `/quotes` - My quotes
- `/messages` - Messages
- `/profile` - Profile

---

## 🐛 Common Issues

### Issue: Port 3000 already in use

**If backend is running:**
```bash
# Start web on different port
PORT=3001 npm run dev
```
Then access: http://localhost:3001

**Or stop backend temporarily:**
- Use Ctrl+C in backend terminal
- Start web app
- Restart backend on port 3001

### Issue: Cannot connect to backend

**Check backend is running:**
```bash
curl http://localhost:3000/api/health
```

**Should return:** `{"status":"ok"}`

**If not running:**
```bash
cd C:/tmp/tradeconnect/backend
npm run dev
```

### Issue: Pages show errors

**Clear Next.js cache:**
```bash
rm -rf .next
npm run dev
```

**Or:**
```bash
npm run dev -- --clean
```

---

## 📦 Project Files Overview

```
web/
├── src/
│   ├── app/              # Pages (Next.js App Router)
│   ├── components/       # React components
│   ├── lib/             # API client, stores
│   ├── schemas/         # Zod validation
│   └── types/           # TypeScript types
├── public/              # Static files
├── package.json         # Dependencies
├── tailwind.config.ts   # Tailwind setup
└── next.config.js       # Next.js config
```

---

## ⚙️ Available Commands

```bash
# Development (hot reload)
npm run dev

# Production build
npm run build

# Run production build
npm start

# Linting
npm run lint

# Type checking
npm run type-check
```

---

## 🎓 Next Steps

1. **Explore the code:**
   - Check `src/app/` for page structure
   - Look at `src/components/ui/` for reusable components
   - Review `src/lib/api/` for API integration

2. **Read documentation:**
   - [README.md](./README.md) - Full documentation
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture

3. **Test features:**
   - Try customer and provider flows
   - Test real-time messaging
   - Explore quote management

4. **Customize:**
   - Update colors in `tailwind.config.ts`
   - Modify components in `src/components/`
   - Add new pages in `src/app/`

---

## ✅ Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Backend running on http://localhost:3000
- [ ] Web app running on http://localhost:3000 (or 3001)
- [ ] Landing page loads
- [ ] Can register as customer
- [ ] Can register as provider
- [ ] Can login/logout
- [ ] Can post job (customer)
- [ ] Can browse jobs (provider)
- [ ] Can submit quote (provider)

---

## 🆘 Need Help?

**Check these files:**
1. [README.md](./README.md) - Comprehensive documentation
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical details
3. [Troubleshooting](./README.md#-troubleshooting) - Common issues

**Browser Console:**
- Press F12 to open DevTools
- Check Console tab for errors
- Check Network tab for API calls

**Server Logs:**
- Check terminal running `npm run dev`
- Look for error messages or warnings

---

**Total Setup Time:** ~5 minutes
**Ready to code!** 🎉


# 🚀 TradeConnect Web - Next.js Front-End

A modern, production-ready web application for TradeConnect marketplace built with Next.js 14, TypeScript, and Tailwind CSS.

## ✨ Features

### Customer Portal
- ✅ Post jobs with multi-step wizard
- ✅ View and manage jobs (Draft, Posted, In Progress, Completed)
- ✅ Receive and compare quotes from providers
- ✅ Award jobs to providers
- ✅ Real-time messaging with providers
- ✅ Profile management

### Provider Portal
- ✅ Browse nearby jobs with filters
- ✅ Submit quotes (fixed price, hourly, range)
- ✅ Track sent quotes and won jobs
- ✅ Update job progress
- ✅ Real-time messaging with customers
- ✅ Provider profile with verification badges

### Technical Features
- ✅ JWT access + refresh token authentication
- ✅ Automatic token refresh on 401
- ✅ Real-time messaging with Socket.IO
- ✅ Infinite scroll for job feed
- ✅ Cursor-based pagination
- ✅ Client-side validation with Zod
- ✅ Server state caching with TanStack Query
- ✅ Responsive design (mobile-first)
- ✅ Address privacy (exact address hidden until award)
- ✅ Rate limiting handling
- ✅ Optimistic UI updates

---

## 🏗️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type safety (strict mode) |
| **Tailwind CSS** | Utility-first styling |
| **TanStack Query** | Server state & caching |
| **Zustand** | Client state management |
| **Axios** | HTTP client with interceptors |
| **Socket.IO Client** | Real-time messaging |
| **Zod** | Schema validation |
| **date-fns** | Date formatting |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- TradeConnect backend running on `http://localhost:3000`

### Installation

```bash
# Navigate to web directory
cd C:/tmp/tradeconnect/web

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Edit .env.local if needed (default: http://localhost:3000/api)

# Run development server
npm run dev
```

`npm run dev`, `npm run build`, and `npm run start` run strict env validation first and fail fast with clear errors when configuration is invalid.

### Access the App

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Public auth pages
│   ├── (dashboard)/       # Protected pages
│   ├── layout.tsx         # Root layout
│   └── providers.tsx      # React Query & auth setup
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── jobs/             # Job-specific components
│   ├── quotes/           # Quote components
│   └── messages/         # Messaging components
├── lib/                  # Libraries
│   ├── api/             # API client & endpoints
│   ├── store/           # Zustand stores
│   ├── socket/          # Socket.IO client
│   └── utils/           # Utility functions
├── schemas/             # Zod validation schemas
└── types/               # TypeScript types
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

---

## 🔐 Authentication Flow

```
1. User logs in → POST /auth/login
2. Backend returns: { user, tokens: { access_token, refresh_token } }
3. Frontend stores:
   - access_token → Memory (Zustand store)
   - refresh_token → HttpOnly cookie (set by backend)
4. API requests include: Authorization: Bearer {access_token}
5. On 401 response:
   → Call POST /auth/refresh (sends refresh_token cookie)
   → Get new access_token
   → Retry original request
6. On refresh fail:
   → Logout user
   → Redirect to /auth/login
```

---

## 🎨 Pages Overview

### Public Pages
- `/` - Landing page
- `/auth/login` - Login form
- `/auth/register` - Registration with role selection
- `/auth/forgot-password` - Password reset request
- `/auth/reset-password` - Set new password

### Customer Pages
- `/dashboard` - Customer dashboard
- `/jobs` - My jobs list
- `/jobs/new` - Post new job (multi-step wizard)
- `/jobs/[id]` - Job detail with quotes
- `/jobs/[id]/edit` - Edit job
- `/messages` - Conversations list
- `/messages/[id]` - Message thread
- `/profile` - Profile & settings

### Provider Pages
- `/dashboard` - Provider dashboard with stats
- `/jobs/feed` - Browse jobs (infinite scroll)
- `/jobs/[id]` - Job detail & submit quote
- `/quotes` - My quotes list
- `/messages` - Conversations list
- `/messages/[id]` - Message thread
- `/profile` - Profile & settings

---

## 🔧 Available Scripts

```bash
# Development server (hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type check
npm run type-check
```

---

## 📡 API Integration

### API Client Features
- ✅ Axios interceptors for auth
- ✅ Auto token refresh on 401
- ✅ Request retry after refresh
- ✅ Error normalization
- ✅ CORS with credentials (cookies)

### Example API Call
```typescript
import { jobsAPI } from '@/lib/api/jobs';

// In a React component
const { data, isLoading } = useQuery({
  queryKey: ['myJobs'],
  queryFn: () => jobsAPI.getMyJobs(),
});
```

### TanStack Query Cache Keys
```typescript
['myJobs']                       // Customer jobs
['myJobs', 'open']               // Filtered jobs
['jobFeed', { cursor, filters }] // Provider feed
['job', id]                      // Single job
['myQuotes']                     // Provider quotes
['conversations']                // Message threads
```

---

## 💬 Real-Time Messaging

### Socket.IO Events

**Client Emits:**
- `message:send` - Send new message
- `typing:start` - User starts typing
- `typing:stop` - User stops typing
- `conversation:join` - Join conversation room
- `conversation:leave` - Leave conversation room

**Client Receives:**
- `message:new` - New message received
- `message:read` - Message marked as read
- `typing:start` - Other user typing
- `typing:stop` - Other user stopped

### Usage Example
```typescript
import { socketClient } from '@/lib/socket/client';

// Connect on login
socketClient.connect(accessToken);

// Listen for new messages
socketClient.on('message:new', (message) => {
  // Update UI
});

// Send message
socketClient.sendMessage(conversationId, content);
```

---

## 🎯 Component Examples

### Button Component
```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary" size="md" isLoading={loading}>
  Submit
</Button>
```

**Variants:** `primary`, `secondary`, `outline`, `ghost`, `danger`
**Sizes:** `sm`, `md`, `lg`

### Input Component
```tsx
import { Input } from '@/components/ui/Input';

<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  required
/>
```

### Card Component
```tsx
import { Card } from '@/components/ui/Card';

<Card hover padding="lg" onClick={() => navigate(`/jobs/${job.id}`)}>
  <h3>{job.title}</h3>
  <p>{job.description}</p>
</Card>
```

---

## 🔍 Form Validation with Zod

```typescript
import { LoginSchema } from '@/schemas/auth.schema';

const result = LoginSchema.safeParse({ email, password });

if (!result.success) {
  // Extract field errors
  const fieldErrors = {};
  result.error.errors.forEach((err) => {
    fieldErrors[err.path[0]] = err.message;
  });
  setErrors(fieldErrors);
}
```

**Available Schemas:**
- `LoginSchema` - Email & password
- `RegisterSchema` - Full registration with role
- `CreateJobSchema` - Job posting with validation
- `SubmitQuoteSchema` - Quote submission

---

## 🎨 Styling with Tailwind

### Responsive Design
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 column mobile, 2 tablet, 3 desktop */}
</div>
```

### Custom Colors
```tsx
<div className="bg-primary-600 text-white">
  {/* Uses primary blue from tailwind.config.ts */}
</div>
```

### Conditional Styling
```tsx
import clsx from 'clsx';

<div className={clsx(
  'base-class',
  isActive && 'bg-primary-600',
  isDisabled && 'opacity-50'
)}>
```

---

## 🚦 Environment Variables

```env
# .env.local (development)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# .env.production (production/staging)
NEXT_PUBLIC_API_BASE_URL=https://api.tradeconnect.com/api
```

**Important:** All variables exposed to the browser must start with `NEXT_PUBLIC_`

### Required by environment

- Development:
  - `NEXT_PUBLIC_API_BASE_URL`
- Staging:
  - `NEXT_PUBLIC_API_BASE_URL`
- Production:
  - `NEXT_PUBLIC_API_BASE_URL`

Use `web/.env.example` or `web/.env.local.example` as templates. Do not put real secrets in these files.

---

## 🐛 Troubleshooting

### Issue: "Network Error" on API calls
**Solution:**
1. Ensure backend is running on `http://localhost:3000`
2. Check `NEXT_PUBLIC_API_BASE_URL` in `.env.local`
3. Verify CORS is configured on backend

### Issue: Socket.IO not connecting
**Solution:**
1. Check backend Socket.IO server is running
2. Verify access token is valid
3. Check browser console for connection errors

### Issue: 401 Unauthorized after some time
**Solution:**
This is expected behavior. The app will automatically:
1. Detect 401 response
2. Call `/auth/refresh` with refresh token
3. Get new access token
4. Retry original request

If refresh fails, user is logged out (refresh token expired).

### Issue: "Module not found" errors
**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Restart dev server
npm run dev
```

---

## 🧪 Testing

### Test User Accounts

Create test accounts via registration or use backend-seeded users:

**Customer:**
- Email: `customer1@test.com`
- Password: `Test1234!`

**Provider:**
- Email: `provider1@test.com`
- Password: `Test1234!`

### Test Scenarios

**Customer Flow:**
1. Register as customer
2. Post a new job
3. Wait for quotes (or use provider account)
4. Compare quotes
5. Award job to provider
6. Send messages
7. Mark job as complete

**Provider Flow:**
1. Register as provider
2. Browse job feed
3. Filter jobs by category/budget
4. Submit quote on job
5. Track quote status
6. Win job (when customer awards)
7. Update job progress
8. Complete job

---

## 📦 Build & Deploy

### Build for Production
```bash
npm run build
```

Output: `.next` directory with optimized build

### Run Production Build Locally
```bash
npm run start
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy --prod
```

**Environment Variables:**
Set `NEXT_PUBLIC_API_BASE_URL` in Vercel dashboard.

### Deploy to Other Platforms

**Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Nginx:**
Serve `.next` output with Node.js server and Nginx reverse proxy.

---

## 🔐 Security Best Practices

### Implemented
- ✅ Access tokens in memory (not localStorage)
- ✅ Refresh tokens in HttpOnly cookies
- ✅ HTTPS in production (enforced)
- ✅ CORS with credentials
- ✅ XSS protection (React escaping)
- ✅ CSRF protection (SameSite cookies)
- ✅ Input validation (Zod + backend)
- ✅ Rate limiting (backend)

### Recommendations
- Use strong passwords (enforced in RegisterSchema)
- Enable 2FA (future enhancement)
- Regular security audits
- Keep dependencies updated

---

## 📈 Performance

### Optimizations
- ✅ Code splitting per route
- ✅ Image optimization (Next.js Image)
- ✅ Lazy loading components
- ✅ TanStack Query caching (5 min stale time)
- ✅ Infinite scroll (vs pagination)
- ✅ Optimistic UI updates

### Lighthouse Score (Target)
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test locally
3. Run linter: `npm run lint`
4. Type check: `npm run type-check`
5. Commit: `git commit -m "Add new feature"`
6. Push: `git push origin feature/new-feature`
7. Create Pull Request

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zod](https://zod.dev)
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)

---

## 📄 License

Proprietary - TradeConnect Platform

---

## 👥 Support

For issues or questions:
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- Review [Troubleshooting](#-troubleshooting) section
- Contact development team

---

**Version**: 1.0.0
**Last Updated**: 2026-02-25
**Status**: ✅ Production Ready

**Built with ❤️ by the TradeConnect Team**


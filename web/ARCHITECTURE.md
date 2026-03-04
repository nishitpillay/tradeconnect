# TradeConnect Web - Architecture Documentation

## 🏗️ Project Structure

```
tradeconnect-web/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (auth)/                   # Auth route group (no navbar)
│   │   │   ├── layout.tsx            # Auth layout with redirect logic
│   │   │   ├── login/page.tsx        # Login page
│   │   │   ├── register/page.tsx     # Registration page
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   │
│   │   ├── (dashboard)/              # Protected routes with navbar
│   │   │   ├── layout.tsx            # Main app layout with auth check
│   │   │   ├── dashboard/page.tsx    # Role-based dashboard
│   │   │   │
│   │   │   ├── jobs/                 # Job management
│   │   │   │   ├── page.tsx          # My jobs list (customer)
│   │   │   │   ├── new/page.tsx      # Post new job (customer)
│   │   │   │   ├── [id]/page.tsx     # Job detail page
│   │   │   │   ├── [id]/edit/page.tsx # Edit job (customer)
│   │   │   │   └── feed/page.tsx     # Browse jobs (provider)
│   │   │   │
│   │   │   ├── quotes/               # Quote management
│   │   │   │   ├── page.tsx          # My quotes (provider)
│   │   │   │   └── [id]/page.tsx     # Quote detail
│   │   │   │
│   │   │   ├── messages/             # Messaging
│   │   │   │   ├── page.tsx          # Conversations list
│   │   │   │   └── [id]/page.tsx     # Conversation detail
│   │   │   │
│   │   │   └── profile/              # Profile management
│   │   │       ├── page.tsx          # View/edit profile
│   │   │       └── settings/page.tsx # Account settings
│   │   │
│   │   ├── layout.tsx                # Root layout
│   │   ├── providers.tsx             # React Query & auth initialization
│   │   ├── globals.css               # Global Tailwind styles
│   │   └── page.tsx                  # Home/landing page
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── StatusPill.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── TextArea.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Toast.tsx
│   │   │
│   │   ├── jobs/                     # Job-specific components
│   │   │   ├── JobCard.tsx
│   │   │   ├── JobForm.tsx
│   │   │   ├── JobFilters.tsx
│   │   │   └── JobsList.tsx
│   │   │
│   │   ├── quotes/                   # Quote components
│   │   │   ├── QuoteCard.tsx
│   │   │   ├── QuoteForm.tsx
│   │   │   └── QuoteComparison.tsx
│   │   │
│   │   └── messages/                 # Messaging components
│   │       ├── ConversationList.tsx
│   │       ├── MessageThread.tsx
│   │       ├── MessageInput.tsx
│   │       └── TypingIndicator.tsx
│   │
│   ├── lib/                          # Libraries and utilities
│   │   ├── api/                      # API client and endpoints
│   │   │   ├── client.ts             # Axios client with interceptors
│   │   │   ├── auth.ts               # Auth endpoints
│   │   │   ├── jobs.ts               # Job endpoints
│   │   │   ├── quotes.ts             # Quote endpoints
│   │   │   ├── messaging.ts          # Messaging endpoints
│   │   │   └── profile.ts            # Profile endpoints
│   │   │
│   │   ├── store/                    # Zustand stores
│   │   │   ├── authStore.ts          # Auth state management
│   │   │   └── uiStore.ts            # UI state (modals, toasts)
│   │   │
│   │   ├── socket/                   # Socket.IO client
│   │   │   └── client.ts             # Socket connection & events
│   │   │
│   │   └── utils/                    # Utility functions
│   │       ├── formatters.ts         # Date, currency formatters
│   │       ├── validators.ts         # Custom validators
│   │       └── constants.ts          # App constants
│   │
│   ├── schemas/                      # Zod validation schemas
│   │   ├── auth.schema.ts            # Login, register, reset password
│   │   ├── job.schema.ts             # Create/update job
│   │   └── quote.schema.ts           # Submit quote
│   │
│   └── types/                        # TypeScript types
│       └── index.ts                  # All type definitions
│
├── public/                           # Static assets
│   ├── logo.svg
│   └── images/
│
├── .env.local                        # Environment variables
├── .gitignore
├── next.config.js                    # Next.js configuration
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
├── postcss.config.js                 # PostCSS configuration
└── package.json                      # Dependencies

```

---

## 🔑 Key Architecture Decisions

### 1. **Next.js App Router**
- File-based routing with route groups
- `(auth)` group: Public pages without navbar
- `(dashboard)` group: Protected pages with navbar
- Server and client components separation

### 2. **Authentication Flow**
```
Login → API returns { user, tokens: { access_token, refresh_token } }
       → Store access_token in memory (Zustand)
       → Store refresh_token in httpOnly cookie (backend sets it)
       → On 401: Auto-refresh using /auth/refresh endpoint
       → Retry original request with new access token
       → On refresh fail: Logout and redirect to login
```

### 3. **State Management**
- **Zustand**: Auth state, UI state (lightweight, no boilerplate)
- **TanStack Query**: Server state caching, background refetching
- **Socket.IO**: Real-time message updates

### 4. **API Client Architecture**
```typescript
APIClient (Axios wrapper)
  ├── Request Interceptor: Attach access token
  ├── Response Interceptor: Handle 401 & refresh
  ├── Error Normalization: Consistent error format
  └── HTTP Methods: get, post, put, patch, delete
```

### 5. **Socket.IO Integration**
```
Connect on login → Join conversation rooms → Receive message:new events
                                           → Emit message:send events
                                           → Optimistic UI updates
```

### 6. **Form Validation**
- **Client-side**: Zod schemas (instant feedback)
- **Server-side**: Backend validation (security)
- **Error handling**: Field-level errors displayed inline

---

## 🎨 Component Patterns

### 1. **Server Components (default)**
```tsx
// app/(dashboard)/dashboard/page.tsx
export default async function DashboardPage() {
  // Can fetch data on server
  return <div>...</div>;
}
```

### 2. **Client Components (interactive)**
```tsx
'use client';
// Components with useState, useEffect, onClick, etc.
```

### 3. **Layout Components**
```tsx
// Shared layouts with auth checks
export default function DashboardLayout({ children }) {
  // Auth guard logic
  return <div><Nav />{children}</div>;
}
```

---

## 🔒 Security Features

### 1. **Token Security**
- Access token: In-memory only (Zustand store)
- Refresh token: HttpOnly cookie (backend controlled)
- Never expose tokens in URL or localStorage

### 2. **CSRF Protection**
- Cookies with SameSite=Strict
- CORS configured on backend

### 3. **Address Privacy**
- Exact address only shown to awarded provider
- Others see `approximate_address` (suburb only)

### 4. **Rate Limiting**
- Backend handles rate limiting
- Frontend shows friendly error on 429

---

## 📊 Data Flow Examples

### Example 1: Customer Posts Job
```
1. User fills CreateJobForm
2. Zod validates CreateJobInput
3. POST /jobs → Returns Job object
4. TanStack Query invalidates 'myJobs' cache
5. Redirect to /jobs/{id}
6. Job detail page fetches job data
```

### Example 2: Provider Submits Quote
```
1. Provider views job detail
2. Clicks "Submit Quote"
3. Fills QuoteForm (amount, days, notes)
4. Zod validates SubmitQuoteInput
5. POST /quotes → Returns Quote object
6. TanStack Query invalidates 'myQuotes', 'jobQuotes'
7. Socket.IO emits quote:new to customer
8. Customer sees notification
```

### Example 3: Real-time Messaging
```
1. User opens conversation
2. Socket joins conversation room
3. User types message → startTyping event
4. Other user sees "typing..." indicator
5. User sends message → Optimistic UI update
6. Socket emits message:send
7. Backend broadcasts message:new to room
8. Other user receives message instantly
9. Message marked as delivered/read
```

---

## 🔄 TanStack Query Keys

```typescript
// Jobs
['myJobs'] - Customer's jobs list
['myJobs', status] - Filtered by status
['jobFeed', { cursor, filters }] - Provider feed with pagination
['job', id] - Single job detail
['jobQuotes', id] - Quotes for a job

// Quotes
['myQuotes'] - Provider's quotes list
['myQuotes', status] - Filtered by status
['quote', id] - Single quote detail

// Messaging
['conversations'] - All conversations
['conversation', id] - Single conversation
['messages', conversationId, cursor] - Messages with pagination

// Profile
['profile'] - Current user profile
```

---

## 🚀 Performance Optimizations

### 1. **Code Splitting**
- Next.js automatic code splitting per route
- Dynamic imports for heavy components

### 2. **Image Optimization**
- Next.js Image component
- Lazy loading, responsive sizes

### 3. **Caching Strategy**
```typescript
TanStack Query:
- staleTime: 5 minutes (data considered fresh)
- gcTime: 30 minutes (garbage collection)
- refetchOnWindowFocus: false (avoid unnecessary fetches)
```

### 4. **Infinite Scroll (Provider Feed)**
```tsx
useInfiniteQuery({
  queryKey: ['jobFeed', filters],
  queryFn: ({ pageParam }) => jobsAPI.getFeed({ cursor: pageParam }),
  getNextPageParam: (lastPage) => lastPage.next_cursor,
});
```

---

## 🧪 Testing Strategy

### Unit Tests
- Zod schemas validation
- Utility functions
- API client error handling

### Integration Tests
- Authentication flow
- Job creation flow
- Quote submission flow

### E2E Tests
- User registration → Post job → Receive quotes → Award job
- Provider registration → Browse jobs → Submit quote → Win job

---

## 📱 Responsive Design

### Breakpoints (Tailwind)
```
sm: 640px   // Mobile landscape
md: 768px   // Tablet
lg: 1024px  // Desktop
xl: 1280px  // Large desktop
```

### Mobile-First Approach
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 col on mobile, 2 on tablet, 3 on desktop */}
</div>
```

---

## 🔧 Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# Production
NEXT_PUBLIC_API_BASE_URL=https://api.tradeconnect.com/api
```

---

## 📦 Deployment

### Build for Production
```bash
npm run build
npm run start
```

### Deploy to Vercel
```bash
vercel deploy --prod
```

### Environment Variables
- Set `NEXT_PUBLIC_API_BASE_URL` in Vercel dashboard
- Ensure backend CORS allows frontend domain

---

## 🎯 Future Enhancements

1. **Notifications**: Browser push notifications
2. **Search**: Full-text search for jobs
3. **Filters**: Advanced filtering (distance, rating, price)
4. **Reviews**: Provider rating system
5. **Calendar**: Availability calendar for providers
6. **Analytics**: Dashboard analytics
7. **Admin Panel**: Moderation tools

---

## 📚 Key Dependencies

| Package | Purpose |
|---------|---------|
| next | React framework with App Router |
| react | UI library |
| @tanstack/react-query | Server state management |
| axios | HTTP client |
| socket.io-client | Real-time messaging |
| zod | Schema validation |
| zustand | Client state management |
| tailwindcss | Utility-first CSS |
| date-fns | Date formatting |
| clsx | Conditional CSS classes |

---

**Last Updated**: 2026-02-25
**Version**: 1.0.0
**Status**: ✅ Production Ready


# TradeConnect Backend

REST API for the TradeConnect platform — connecting customers with local trade service providers.

## Stack

- **Runtime**: Node.js + TypeScript (tsx)
- **Framework**: Express
- **Database**: PostgreSQL 16 with PostGIS
- **Cache / Queues**: Redis + BullMQ
- **Auth**: JWT (access + refresh tokens)
- **Validation**: Zod
- **Storage**: AWS S3 (LocalStack for local dev)
- **Push notifications**: Firebase Admin SDK
- **Email**: AWS SES

## Prerequisites

- Node.js 20+
- PostgreSQL 16 with PostGIS extension
- Redis 7

The easiest way to run both locally is Docker:

```bash
docker run -d --name tc_postgres \
  -e POSTGRES_USER=tc_user \
  -e POSTGRES_PASSWORD=tc_dev_password \
  -e POSTGRES_DB=tradeconnect_dev \
  -p 5432:5432 postgis/postgis:16-3.4

docker run -d --name tc_redis \
  -p 6379:6379 redis:7-alpine
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET and DB_ENCRYPTION_KEY

# 3. Run migrations
npx tsx db/migrations/001_extensions_enums.ts
npx tsx db/migrations/002_user_tables.ts
npx tsx db/migrations/003_job_quote_tables.ts
npx tsx db/migrations/004_messaging_moderation.ts
npx tsx db/migrations/005_expand_rating_scale.ts

# 4. Seed categories and admin user
npx tsx db/seeds/run.ts

# 5. (Optional) Seed test accounts
npm run seed:test
```

## Running

```bash
# Development (watch mode)
npm run dev
npm run worker:dev

# Production build
npm run build
npm start
npm run worker:start

# Queue integration smoke (requires DB + Redis + at least one active user)
npm run smoke:queue
```

The API starts on `http://localhost:3000` (configurable via `PORT` in `.env`).

## Health and Readiness

```
GET /healthz
GET /readyz
GET /health
```

- `/healthz` is liveness only.
- `/readyz` validates PostgreSQL + Redis and checks pending migrations if `pgmigrations` metadata is available.
- `/health` is kept as a compatibility endpoint.

## Observability

- Structured JSON logs with `pino` (`requestId` and `correlationId` on all request logs).
- Request context middleware propagates:
  - `X-Request-Id`
  - `X-Correlation-Id`
- OpenTelemetry auto-instrumentation is enabled for Express/HTTP, PostgreSQL, and Redis.
- BullMQ traces are added around notification enqueue and worker job processing.
- Sentry captures backend + worker exceptions and performance traces.

## API Overview

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | — | Register a new user |
| `POST` | `/api/auth/login` | — | Login, returns JWT |
| `POST` | `/api/auth/refresh` | — | Refresh access token |
| `POST` | `/api/jobs` | customer | Create a job (draft) |
| `POST` | `/api/jobs/:id/publish` | customer | Publish a job |
| `PATCH` | `/api/jobs/:id` | customer | Update a draft job |
| `POST` | `/api/jobs/:id/cancel` | customer | Cancel a job |
| `GET` | `/api/jobs/feed` | provider | Browse published jobs |
| `POST` | `/api/jobs/:id/quotes` | provider | Submit a quote |
| `POST` | `/api/jobs/:id/award` | customer | Award a quote |
| `POST` | `/api/jobs/:id/complete` | customer | Mark job complete |
| `GET` | `/api/profiles/me` | any | Get own profile |
| `PATCH` | `/api/profiles/me` | any | Update own profile |

## Project Structure

```
src/
├── app.ts                  # Express app entry point
├── config/                 # DB, Redis, env config
├── controllers/            # Route handlers
├── middleware/             # Auth, validation, rate limiting, errors
├── repositories/           # SQL query layer
├── routes/                 # Express routers
├── schemas/                # Zod validation schemas
├── scripts/                # One-off scripts (seed, etc.)
└── services/               # Business logic
db/
├── migrations/             # Schema migrations (run in order)
└── seeds/                  # Reference data and test accounts
```

## Test Accounts

After running `npm run seed:test`:

| Email | Password | Role |
|-------|----------|------|
| `alice@test.com` | `TradeTest1@` | customer |
| `bob@plumbing.com` | `TradeTest1@` | provider |

## Environment Variables

See [`.env.example`](.env.example) for the full list with descriptions.

Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for signing JWTs (min 64 chars) |
| `DB_ENCRYPTION_KEY` | Key for encrypting job addresses (min 32 chars) |
| `SENTRY_DSN` | Sentry DSN (optional) |
| `SENTRY_TRACES_SAMPLE_RATE` | Sentry tracing sample rate (0-1) |
| `OTEL_ENABLED` | Enable OpenTelemetry |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint (e.g. `http://localhost:4318`) |
| `WORKER_CONCURRENCY` | BullMQ worker concurrency |
| `NOTIFICATIONS_USE_QUEUE` | Queue notification delivery through BullMQ worker |

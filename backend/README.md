# TradeConnect Backend

REST API for TradeConnect with a dedicated BullMQ worker runtime.

## Stack

- Runtime: Node.js + TypeScript
- Framework: Express
- Database: PostgreSQL 16 + PostGIS
- Queue/Cache: Redis + BullMQ
- Observability: pino, OpenTelemetry, Sentry

## Run

```bash
# API (producer)
npm run dev

# Worker (consumer)
npm run worker:dev

# Production build + run
npm run build
npm run start
npm run worker:start

# Migrations
npm run migrate:dev
npm run migrate:deploy
npm run migrate:status
```

## Health

- `GET /healthz` liveness
- `GET /readyz` readiness (DB + Redis + pending migration check across legacy + Knex)
- `GET /health` compatibility endpoint

## API Versioning

- Preferred base path: `/api/v1`
- Legacy compatibility path: `/api` (deprecated; emits `Deprecation`, `Sunset`, and `Link` headers)
- Migration path:
  - Existing web/mobile clients can continue using `/api` short-term.
  - New integrations should switch to `/api/v1`.
  - Once all clients move, `/api` can be removed safely.

## API Contract (OpenAPI)

- Generate contract: `npm run openapi:generate`
- Output file: `backend/openapi/openapi.v1.json`
- Serve contract at runtime: `GET /api/v1/openapi.json`
- Drift guard: `npm run openapi:check-drift`
  - If OpenAPI changes, CI requires either:
    - `backend/package.json` version bump, or
    - `backend/CHANGELOG.md` update.

Example generated client usage:

```bash
npx openapi-typescript backend/openapi/openapi.v1.json -o web/src/lib/api/generated/tradeconnect-api.ts
```

```ts
import type { paths } from '@/lib/api/generated/tradeconnect-api';

type LoginRequest = paths['/auth/login']['post']['requestBody']['content']['application/json'];
```

## Worker Split

- API entrypoint: `src/app.ts`
- Worker entrypoint: `src/worker/index.ts`
- Processors are only in worker path:
  - `src/worker/processors/notifications.processor.ts`

Queue behavior:

- Idempotent enqueue with deterministic `jobId`
- Redis dedupe key with TTL (`NOTIFICATION_DEDUPE_TTL_SECONDS`)
- Retries with exponential backoff
- Dead-letter queue: `notifications-dead-letter`
- Periodic queue metrics/log snapshots

## Auth Hardening

- Access token TTL is controlled by `JWT_EXPIRY` (default `15m`).
- Refresh tokens are rotated on every refresh.
- Reuse detection revokes the entire refresh token family for the user.
- Refresh token metadata is persisted in Postgres:
  - `device_id`, `issued_at`, `last_used_at`, `ip_hash`, `user_agent_hash`
  - family lineage: `token_family_id`, `parent_token_id`, `replaced_by_token_id`
- Web refresh uses `HttpOnly` cookie + CSRF double-submit:
  - cookie: `csrf_token`
  - header: `X-CSRF-Token`

## Queue Smoke

```bash
npm run smoke:queue
```

Requires DB + Redis + at least one active user in `users`.

## Docker Compose

Root `docker-compose.yml` runs:

- `api` service (Express API)
- `worker` service (BullMQ consumer)
- shared `postgres` and `redis`

Both `api` and `worker` read `backend/.env` and override `DATABASE_URL` and `REDIS_URL` to container hostnames.

## Socket.IO Horizontal Scaling

- Socket bootstrap: `src/app.ts`
- Event contract helpers: `src/realtime/socket.events.ts`
- Socket.IO Redis adapter is enabled via `SOCKET_IO_REDIS_ADAPTER_ENABLED=true`
- API instances can scale horizontally and share room/event fan-out via Redis pub/sub

Security and reliability guardrails:

- Room joins are server-authorized using DB membership checks before `socket.join(...)`
- Client-provided room IDs are validated and never trusted directly
- Max inbound Socket.IO payload is enforced with `SOCKET_IO_MAX_HTTP_BUFFER_BYTES`
- Per-event payload input is bounded by `SOCKET_IO_MAX_EVENT_PAYLOAD_BYTES`
- Messaging sockets now follow a notify-then-fetch pattern:
  - emits lightweight `messaging.message.created` / `messaging.message.deleted`
  - clients fetch full message bodies over REST

## Security Baseline

TradeConnect backend now enforces a production-oriented baseline for transport and API protections:

- Tight Helmet profile (`src/config/security.ts`)
  - strict CSP for API surface
  - `frameguard: deny`, `referrerPolicy: no-referrer`, `noSniff`, `hidePoweredBy`
  - production HSTS (`max-age=31536000; includeSubDomains; preload`)
- CORS allowlist per environment
  - default: `CORS_ORIGINS`
  - optional overrides:
    - `CORS_ORIGINS_DEVELOPMENT`
    - `CORS_ORIGINS_STAGING`
    - `CORS_ORIGINS_PRODUCTION`
- Explicit preflight policy
  - allowed methods: `GET,POST,PATCH,PUT,DELETE,OPTIONS`
  - credentials enabled
  - `maxAge=600`

### Rate-limit Policy Matrix

Policy source: `src/middleware/rateLimit.middleware.ts` (`rateLimitPolicyMatrix`)

| Route | Bucket | Limit | Window | Purpose |
| --- | --- | --- | --- | --- |
| `POST /api/v1/auth/login` | IP | `RATE_LIMIT_LOGIN_PER_15MIN` | 15m | brute-force protection |
| `POST /api/v1/auth/register` | IP | `RATE_LIMIT_REGISTER_PER_HOUR` | 1h | signup abuse prevention |
| `POST /api/v1/auth/forgot-password` | IP | `RATE_LIMIT_PASSWORD_RESET_PER_HOUR` | 1h | reset abuse protection |
| `POST /api/v1/auth/phone/request-otp` | User | `RATE_LIMIT_PHONE_OTP_PER_10MIN` | 10m | OTP abuse protection |
| `GET /api/v1/jobs/feed` | User | `RATE_LIMIT_FEED_BROWSE_PER_MIN` | 1m | scrape/polling protection |
| `GET /api/v1/conversations` | User | `RATE_LIMIT_CONVERSATION_LIST_PER_MIN` | 1m | list polling control |
| `GET /api/v1/conversations/:id/messages` | User | `RATE_LIMIT_MESSAGE_LIST_PER_MIN` | 1m | chat polling control |
| `POST /api/v1/jobs` | User | `RATE_LIMIT_JOB_POST_DAILY` and `RATE_LIMIT_JOB_POST_WEEKLY` | 1d + 7d | job spam control |
| `POST /api/v1/jobs/:id/quotes` | User | `RATE_LIMIT_QUOTE_DAILY` and `RATE_LIMIT_QUOTE_WEEKLY` | 1d + 7d | quote spam control |
| `POST /api/v1/conversations/:id/messages` | User | `RATE_LIMIT_MESSAGE_PER_HOUR` | 1h | chat flood control |

Security-focused tests added:

- `src/config/__tests__/security.config.test.ts`
- `src/middleware/__tests__/rateLimit.policy.test.ts`

## Redis Caching Strategy

TradeConnect caches only non-sensitive, read-heavy responses:

- Category provider directory (`GET /api/v1/profiles/categories/:slug/providers`)
- Public provider profile (`GET /api/v1/profiles/providers/:userId`)
- Provider feed summaries (`GET /api/v1/jobs/feed`, short TTL)

Anything auth/session/token related is intentionally not cached.

### Cache Keys

- `cache:providers-by-category:{slug}:{limit}`
- `cache:provider:{userId}`
- `cache:feed:{providerId}:{queryHash}`

### TTLs

- `CACHE_TTL_CATEGORY_DIRECTORY_SECONDS` (default `300`)
- `CACHE_TTL_PROVIDER_PROFILE_SECONDS` (default `300`)
- `CACHE_TTL_FEED_SUMMARY_SECONDS` (default `30`)

### Invalidation Rules

- Provider/customer/profile updates invalidate provider directory/profile cache tags.
- Review + verification writes invalidate provider directory/profile cache tags.
- Job lifecycle writes (`publish`, `patch`, `award`, `cancel`, etc.) invalidate feed summary cache tag.
- Admin user/job status changes invalidate relevant provider/feed tags.

### Cache Metrics (Hit/Miss)

Cache hit/miss counters are tracked in Redis hash `cache:metrics` with fields:

- `category_directory:hit`, `category_directory:miss`
- `provider_profile:hit`, `provider_profile:miss`
- `feed_summary:hit`, `feed_summary:miss`

Quick check:

```bash
redis-cli HGETALL tc:cache:metrics
```

(`tc:` prefix depends on `QUEUE_PREFIX`.)

## Project Structure

```text
src/
  app.ts
  config/
  controllers/
  middleware/
  observability/
  queues/
  repositories/
  routes/
  schemas/
  scripts/
  services/
  worker/
    index.ts
    processors/
db/
  migrations/
  seeds/
```

## Deployment Notes

- Build once, run two runtimes:
  - API: `npm run start`
  - Worker: `npm run worker:start`
- Run migrations before deploying API/worker:
  - `npm run migrate:deploy`
- Scale worker replicas independently from API replicas.
- If OTLP is not available, set `OTEL_ENABLED=false`.

## Important Env Vars

- `DATABASE_URL`
- `DB_SSL_ENABLED` (set `false` for local non-SSL Postgres)
- `JWT_EXPIRY` (access token TTL, default `15m`)
- `REFRESH_TOKEN_EXPIRY` (refresh token TTL, default `30d`)
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `CORS_ORIGINS_DEVELOPMENT`
- `CORS_ORIGINS_STAGING`
- `CORS_ORIGINS_PRODUCTION`
- `REDIS_URL`
- `CACHE_ENABLED`
- `CACHE_TTL_CATEGORY_DIRECTORY_SECONDS`
- `CACHE_TTL_PROVIDER_PROFILE_SECONDS`
- `CACHE_TTL_FEED_SUMMARY_SECONDS`
- `CACHE_METRICS_TTL_SECONDS`
- `SOCKET_IO_REDIS_ADAPTER_ENABLED`
- `SOCKET_IO_MAX_HTTP_BUFFER_BYTES`
- `SOCKET_IO_MAX_EVENT_PAYLOAD_BYTES`
- `NOTIFICATIONS_USE_QUEUE`
- `WORKER_CONCURRENCY`
- `WORKER_METRICS_INTERVAL_MS`
- `WORKER_DLQ_ENABLED`
- `NOTIFICATION_MAX_ATTEMPTS`
- `NOTIFICATION_BACKOFF_MS`
- `NOTIFICATION_DEDUPE_TTL_SECONDS`
- `SENTRY_DSN`
- `OTEL_ENABLED`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `RATE_LIMIT_LOGIN_PER_15MIN`
- `RATE_LIMIT_REGISTER_PER_HOUR`
- `RATE_LIMIT_PASSWORD_RESET_PER_HOUR`
- `RATE_LIMIT_PHONE_OTP_PER_10MIN`
- `RATE_LIMIT_FEED_BROWSE_PER_MIN`
- `RATE_LIMIT_CONVERSATION_LIST_PER_MIN`
- `RATE_LIMIT_MESSAGE_LIST_PER_MIN`

## Environment Profiles

Use `backend/.env.example` as the source template.

- Development required:
  - `API_BASE_URL`, `FRONTEND_URL`, `CORS_ORIGINS`
  - `DATABASE_URL`, `DB_ENCRYPTION_KEY`
  - `JWT_SECRET`
  - `REDIS_URL`
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
  - `S3_BUCKET_NAME`, `CDN_BASE_URL`
  - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
  - `GOOGLE_MAPS_API_KEY`
- Staging required:
  - all Development required vars
  - `SENTRY_DSN` (recommended)
  - `OTEL_EXPORTER_OTLP_ENDPOINT` (recommended)
  - `DB_SSL_ENABLED=true` (unless your staging DB is intentionally non-SSL)
- Production required:
  - all Development required vars
  - `SENTRY_DSN`
  - `DB_SSL_ENABLED=true` for managed Postgres with SSL
  - strongly recommended: `OTEL_EXPORTER_OTLP_ENDPOINT`

Startup fails fast with detailed validation errors if required env vars are missing or invalid.
No env values are logged; application logs redact known secret fields.

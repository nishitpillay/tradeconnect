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
- `REDIS_URL`
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

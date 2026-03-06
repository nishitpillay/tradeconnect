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
```

## Health

- `GET /healthz` liveness
- `GET /readyz` readiness (DB + Redis + pending migration check)
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
- Run migrations before deploying API/worker.
- Scale worker replicas independently from API replicas.
- If OTLP is not available, set `OTEL_ENABLED=false`.

## Important Env Vars

- `DATABASE_URL`
- `DB_SSL_ENABLED` (set `false` for local non-SSL Postgres)
- `JWT_EXPIRY` (access token TTL, default `15m`)
- `REFRESH_TOKEN_EXPIRY` (refresh token TTL, default `30d`)
- `REDIS_URL`
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

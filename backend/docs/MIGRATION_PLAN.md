# TradeConnect Migration Plan (Knex)

## Why Knex
- Minimal disruption to existing SQL-first backend.
- Keeps migration ownership in code with deterministic, deploy-safe migration files.
- No ORM model rewrite required.

## Rollout Steps
1. Deploy code containing Knex migration runner and migrations.
2. Run `npm run migrate:deploy` once per environment before API/worker rollout.
3. Verify `/readyz` returns migration `pendingCount: 0`.
4. Roll API + worker containers.

## Baseline Strategy
- Existing `node-pg-migrate` migrations remain as historical source.
- Knex introduces hardening migrations that are idempotent:
  - `20260306090000_extensions_and_baseline_constraints.js`
  - `20260306091000_query_indexes_for_scale.js`

## What These Migrations Enforce
- Extensions:
  - `uuid-ossp`, `pgcrypto`, `postgis`
- Critical constraints:
  - Foreign keys on `jobs`, `messages`, `reviews`
  - `NOT NULL` on key relational columns
  - unique index on `quotes(job_id, provider_id)`
- Scale indexes:
  - Jobs feed paths (`status/category/state/published_at`)
  - Messaging threads (`conversation_id, created_at DESC`)
  - Reviews lookup (`reviewee_id, created_at DESC, rating DESC`)

## Runtime Readiness
- `/readyz` now checks both:
  - legacy `pgmigrations`
  - Knex `knex_migrations`
- Ready only when no pending files are detected.

## Commands
- Local dev migration: `npm run migrate:dev`
- Deploy migration: `npm run migrate:deploy`
- Migration status: `npm run migrate:status`

# TradeConnect

TradeConnect is a multi-surface marketplace platform that connects customers with trusted tradespeople.

It includes:

- a backend API for auth, jobs, quotes, reviews, messaging, and admin workflows
- a web application for customer and provider flows
- a mobile application built with Expo / React Native
- a shared schema package for cross-platform type and validation consistency

## Platform Overview

TradeConnect is designed to support the full job lifecycle:

1. Customers post work requests.
2. Providers browse and quote on relevant jobs.
3. Customers compare contractor profiles, ratings, and reviews.
4. Both sides communicate and move the work forward inside one platform.

## Architecture Summary

### Frontend

- Web: Next.js, React, TypeScript, React Query, Zustand, Axios, Tailwind CSS
- Mobile: Expo, React Native, Expo Router, TypeScript, React Query, Zustand, Axios, NativeWind

### Backend

- Node.js, TypeScript, Express, Socket.IO, PostgreSQL, Redis, BullMQ, JWT, Zod

### Infrastructure

- PostgreSQL/PostGIS for durable application data
- Redis for cache, rate limiting, token invalidation, and queue support
- Docker Compose for local infrastructure setup

## Repository Layout

```text
tradeconnect/
  backend/          Express + TypeScript API
  web/              Next.js web app
  mobile/           Expo / React Native app
  packages/shared/  Shared schemas and types
  docker-compose.yml
```

## Documentation

Detailed stack and architecture documentation is available in:

- [TECH_STACK_OVERVIEW.md](./TECH_STACK_OVERVIEW.md)

## Local Workspace Commands

This repo is now the TradeConnect monorepo root and tracks the cross-app workspace commands.

- Use `pnpm` from repo root with Turborepo task orchestration.

- `pnpm dev`
  Runs workspace `dev` scripts in parallel via Turbo.
- `pnpm build`
  Runs cached builds across shared/backend/web/mobile.
- `pnpm typecheck`
  Runs cached type-check tasks across workspaces.
- `pnpm test`
  Runs workspace tests (backend tests + no-op placeholders where tests are not configured).
- `pnpm lint`
  Runs workspace lint scripts.

- `pnpm run dev:all`
  Starts the backend stack, web app, and Expo from this repo.
- `pnpm run smoke:all`
  Runs backend and web smoke checks, isolated web production verification, and the mobile Android smoke test.
- `pnpm run shared:build`
- `pnpm run backend:build`
- `pnpm run backend:openapi:generate`
- `pnpm run backend:openapi:check`
- `pnpm run backend:test`
- `pnpm run web:type-check`
- `pnpm run web:build`
- `pnpm run web:verify`
- `pnpm run mobile:type-check`

`pnpm run web:verify` uses a dedicated Next build output (`.next-verify`) and port `3002`, so production-style verification does not interfere with the dev server on port `3001`.

## Current Product Areas

The current TradeConnect codebase covers:

- authentication and session handling
- customer and provider profile flows
- jobs and quote workflows
- contractor discovery by category
- customer reviews
- real-time messaging
- mobile and web experience surfaces

## Notes

This repository now owns the backend, web, mobile, and shared package codebases in one monorepo while preserving the imported histories from the original repos.

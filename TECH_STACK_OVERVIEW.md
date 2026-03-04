# TradeConnect Tech Stack Overview

## Purpose

This document describes the current TradeConnect application stack across:

- backend API
- web frontend
- mobile app
- middleware and shared infrastructure
- shared schema package
- local development services

It is written as a repository-ready reference that can be copied into the main TradeConnect GitHub repository.

## High-Level Architecture

TradeConnect is a multi-surface marketplace platform with:

- a TypeScript/Node.js backend API
- a Next.js web application
- an Expo/React Native mobile application
- a shared TypeScript schema package used by web and mobile
- PostgreSQL/PostGIS for durable application data
- Redis for cache, rate limiting, token invalidation, and queue support
- Socket.IO for real-time messaging and event delivery

At a high level:

1. Web and mobile clients call the backend REST API.
2. The backend reads and writes core business data in PostgreSQL.
3. Redis supports fast temporary state and backend operational features.
4. Shared request/response validation types are centralized in `@tradeconnect/shared`.
5. Socket.IO is used for authenticated real-time communication.

## Repository Structure

```text
tradeconnect/
  backend/          Express + TypeScript API
  web/              Next.js web app
  mobile/           Expo / React Native app
  packages/shared/  Shared schemas and types
  docker-compose.yml
```

## Infrastructure and Runtime Services

### PostgreSQL

PostgreSQL is the primary system of record.

It stores durable business data such as:

- users and authentication-related records
- customer and provider profiles
- categories and provider-category mappings
- jobs
- quotes
- reviews
- messaging and dispute data
- admin and moderation-related entities

TradeConnect uses PostGIS in development, which indicates location-aware features are part of the platform design.

### Redis

Redis is the fast, ephemeral support layer.

In this project it is used for:

- rate limiting
- short-lived OTP storage
- JWT/token invalidation flags
- cached values such as categories, provider data, and feed data
- BullMQ-compatible queue backing
- lightweight real-time/session coordination

Redis is operationally important, but not the primary source of truth. PostgreSQL remains the durable data store.

### Docker Compose

Local infrastructure is defined in [docker-compose.yml](/c:/tmp/tradeconnect/docker-compose.yml).

It provisions:

- `postgres`: `postgis/postgis:16-3.4`
- `redis`: `redis:7-alpine`

This gives the project a reproducible local backend environment.

## Backend Stack

### Core Backend Technologies

The backend is located in `backend/` and is built with:

- Node.js
- TypeScript
- Express
- Socket.IO
- PostgreSQL via `pg`
- Redis via `ioredis`
- BullMQ
- Zod
- JWT-based authentication

Primary package definition:
- [backend/package.json](/c:/tmp/tradeconnect/backend/package.json)

Main bootstrap file:
- [backend/src/app.ts](/c:/tmp/tradeconnect/backend/src/app.ts)

### Backend Responsibilities

The backend is responsible for:

- authentication and token lifecycle
- user and profile management
- job posting and job feed delivery
- provider quoting workflows
- reviews and disputes
- notifications
- verification flows
- messaging
- admin operations
- real-time socket events

### API Design

The backend exposes REST-style routes under `/api/...`.

Current route modules include:

- `auth.routes.ts`
- `jobs.routes.ts`
- `profiles.routes.ts`
- `messaging.routes.ts`
- `reviews.routes.ts`
- `disputes.routes.ts`
- `notifications.routes.ts`
- `verifications.routes.ts`
- `admin.routes.ts`

These are wired in [backend/src/app.ts](/c:/tmp/tradeconnect/backend/src/app.ts).

### Backend Middleware

The backend middleware layer currently includes:

- authentication/request identity middleware
- global error handling
- rate limiting
- role-based access control
- request validation

Middleware files:

- [auth.middleware.ts](/c:/tmp/tradeconnect/backend/src/middleware/auth.middleware.ts)
- [errorHandler.middleware.ts](/c:/tmp/tradeconnect/backend/src/middleware/errorHandler.middleware.ts)
- [rateLimit.middleware.ts](/c:/tmp/tradeconnect/backend/src/middleware/rateLimit.middleware.ts)
- [rbac.middleware.ts](/c:/tmp/tradeconnect/backend/src/middleware/rbac.middleware.ts)
- [validate.middleware.ts](/c:/tmp/tradeconnect/backend/src/middleware/validate.middleware.ts)

### Security and Operational Middleware

The backend uses:

- `helmet` for security headers
- `cors` for browser/mobile origin control
- `cookie-parser` for refresh-token cookie handling
- `morgan` for request logging
- Express JSON/body parsing for API payloads

### Authentication Model

TradeConnect uses JWT-based auth with refresh support.

Notable characteristics:

- access token is attached to requests
- refresh flow exists for web clients
- WebSocket connections require a token
- Redis is used for token invalidation and some auth-adjacent temporary state

### Real-Time Layer

Socket.IO is attached to the backend HTTP server.

It is used for:

- authenticated socket connections
- personal user rooms
- conversation rooms
- real-time messaging and targeted notifications

The socket server is initialized in [backend/src/app.ts](/c:/tmp/tradeconnect/backend/src/app.ts).

### Validation and Type Safety

The backend uses Zod-based validation patterns and shared schemas.

This helps keep:

- request validation
- schema consistency
- web/mobile/backend data contracts

aligned across the platform.

## Web Frontend Stack

### Core Web Technologies

The web app is located in `web/` and is built with:

- Next.js 14
- React 18
- TypeScript
- React Query
- Axios
- Zustand
- Tailwind CSS
- Zod
- Playwright for end-to-end testing

Primary package definition:
- [web/package.json](/c:/tmp/tradeconnect/web/package.json)

### Web Application Architecture

The web app uses the Next.js App Router pattern, with route-driven UI under `web/src/app`.

The homepage implementation is in:
- [web/src/app/page.tsx](/c:/tmp/tradeconnect/web/src/app/page.tsx)

That page currently demonstrates several core product capabilities:

- marketing landing page structure
- category browsing
- category-to-provider directory loading
- provider review display
- CTA flows into registration and login

### Web State and Data Fetching

The web app uses:

- `@tanstack/react-query` for server-state fetching/caching
- `axios` for HTTP requests
- `zustand` for client-side auth/session state

The API client is implemented in:
- [web/src/lib/api/client.ts](/c:/tmp/tradeconnect/web/src/lib/api/client.ts)

Key behaviors in the API client:

- attaches access tokens to outbound requests
- retries once after `401` by refreshing the access token
- normalizes API errors
- uses cookie-aware requests for refresh-token handling

### Web Styling

The web app uses:

- Tailwind CSS
- utility-first styling
- component-level React composition

The current UI follows a marketplace-style design with:

- category cards
- provider listings
- review blocks
- dashboard/auth flows

### Web Testing and Tooling

The web project includes:

- `eslint`
- TypeScript type-checking
- Playwright E2E tests

Useful scripts include:

- `npm run dev`
- `npm run build`
- `npm run type-check`
- `npm run test:e2e`

## Mobile App Stack

### Core Mobile Technologies

The mobile app is located in `mobile/` and is built with:

- Expo SDK 51
- React Native 0.74
- React 18
- Expo Router
- TypeScript
- React Query
- Axios
- Zustand
- NativeWind
- Zod
- Expo Secure Store
- Expo Notifications
- Expo Location
- React Native Reanimated

Primary package definition:
- [mobile/package.json](/c:/tmp/tradeconnect/mobile/package.json)

### Mobile Application Architecture

The mobile app uses Expo Router for file-based navigation.

The root app layout is:
- [mobile/app/_layout.tsx](/c:/tmp/tradeconnect/mobile/app/_layout.tsx)

It sets up:

- global navigation stacks
- auth-group vs app-group routing
- React Query provider
- safe-area provider
- toast container
- route protection
- socket connection lifecycle tied to auth state

### Mobile Routing Model

The mobile app is structured around:

- `(auth)` flows
- `(tabs)` application flows
- modal routes such as review/report screens

This gives the app a native-feeling navigation structure while keeping routes declarative.

### Mobile State and Persistence

The mobile app uses:

- Zustand for auth and socket state
- Expo Secure Store for refresh token persistence
- React Query for backend data fetching/caching

### Mobile Styling and UI

The mobile app uses:

- React Native native components
- NativeWind for utility-style styling
- Expo/React Native ecosystem libraries for status bar, safe areas, and animations

### Mobile Runtime Notes

The mobile app consumes the shared schema package and, for Expo/Metro stability on Windows, currently vendors the built shared `dist` output into:

- `mobile/vendor/tradeconnect-shared/dist`

This is referenced by Metro to avoid symlink-related resolution issues with Expo/Metro on local development setups.

## Shared Package

### `@tradeconnect/shared`

The shared package lives in `packages/shared/`.

Primary package definition:
- [packages/shared/package.json](/c:/tmp/tradeconnect/packages/shared/package.json)

It provides:

- shared schema exports
- shared type declarations
- compiled `dist` artifacts

It is used by both:

- `web`
- `mobile`

Current exported schema areas include:

- auth schemas
- job schemas
- quote schemas

### Why the Shared Package Matters

This package is the contract layer between frontend apps and backend expectations.

It reduces drift across:

- request payloads
- validation rules
- TypeScript types
- cross-platform form behavior

## Middleware and Cross-Cutting Concerns

Across the full stack, the main middleware/cross-cutting concerns are:

- authentication
- request validation
- authorization / RBAC
- error normalization
- rate limiting
- logging
- real-time event delivery
- token refresh
- schema sharing

These concerns are split appropriately:

- backend handles security, validation, authorization, persistence, and socket transport
- web/mobile handle auth state, token attachment, UI routing, and client rendering
- shared package handles data contract consistency

## Data Flow Summary

### Web and Mobile to Backend

Both clients communicate with the backend over HTTP using Axios-based API clients.

Typical flow:

1. User authenticates.
2. Client stores or refreshes auth state.
3. Client calls backend REST endpoints.
4. Backend validates and authorizes the request.
5. Backend reads/writes PostgreSQL.
6. Backend may also touch Redis for cache, auth flags, or rate limiting.
7. Response returns to the client.

### Real-Time Flow

For real-time experiences:

1. Client connects over Socket.IO with an auth token.
2. Backend authenticates the socket.
3. User joins personal or conversation-specific rooms.
4. Backend emits targeted updates.

## Development Tooling

### Backend

- `tsx` for local TypeScript execution/watch mode
- `tsc` for builds
- `jest` for tests

### Web

- Next.js dev/build tools
- Playwright
- TypeScript
- ESLint

### Mobile

- Expo CLI
- Expo Router
- TypeScript
- ESLint
- Android emulator testing

## Local Development Ports

Typical local ports in the current setup:

- backend API: `3000`
- web app: `3001`
- Expo Metro: `8081`
- PostgreSQL: `5432`
- Redis: `6379`

## Current Stack Summary

### Frontend

- Web: Next.js, React, TypeScript, React Query, Zustand, Axios, Tailwind CSS
- Mobile: Expo, React Native, Expo Router, TypeScript, React Query, Zustand, Axios, NativeWind

### Backend

- Node.js, TypeScript, Express, Socket.IO, PostgreSQL, Redis, BullMQ, JWT, Zod

### Shared Contracts

- `@tradeconnect/shared` for reusable schemas and types

### Infrastructure

- Docker Compose
- PostgreSQL/PostGIS
- Redis

### Testing and Tooling

- Jest on backend
- Playwright on web
- Expo emulator/device testing on mobile

## Recommendation for Main Repo Export

This file can be copied directly into the main TradeConnect repo as:

- `TECH_STACK_OVERVIEW.md`

or merged into an existing:

- `README.md`
- `docs/architecture.md`
- `docs/tech-stack.md`

depending on how you want the main repository documentation organized.

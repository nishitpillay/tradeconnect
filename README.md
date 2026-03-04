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

This repository currently acts as the main TradeConnect documentation and coordination repo. The implementation work is organized across the backend, web, mobile, and shared-package codebases.

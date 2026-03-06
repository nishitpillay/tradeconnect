FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json backend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --filter @tradeconnect/backend... --frozen-lockfile

FROM base AS builder
COPY backend backend
COPY packages/shared packages/shared

RUN pnpm --filter @tradeconnect/shared build
RUN pnpm --filter @tradeconnect/backend build

FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json backend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --filter @tradeconnect/backend --prod --frozen-lockfile

COPY --from=builder /repo/backend/dist backend/dist
COPY --from=builder /repo/backend/db backend/db

WORKDIR /repo/backend
EXPOSE 3000
CMD ["pnpm", "start"]

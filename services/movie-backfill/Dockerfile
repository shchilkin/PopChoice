# syntax=docker/dockerfile:1.7
# Build context: repo root
# docker build -f services/movie-backfill/Dockerfile .

FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY services/db-migrate/package.json ./services/db-migrate/
COPY services/movie-backfill/package.json ./services/movie-backfill/
COPY services/movie-discovery/package.json ./services/movie-discovery/
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --no-audit --fund=false

COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src/ ./packages/shared/src/
RUN npm run build --workspace=packages/shared

COPY services/movie-backfill/tsconfig.json ./services/movie-backfill/
COPY services/movie-backfill/src/ ./services/movie-backfill/src/
RUN npm run build --workspace=services/movie-backfill

FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY services/db-migrate/package.json ./services/db-migrate/
COPY services/movie-backfill/package.json ./services/movie-backfill/
COPY services/movie-discovery/package.json ./services/movie-discovery/
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --omit=dev --no-audit --fund=false

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/movie-backfill/dist ./services/movie-backfill/dist

WORKDIR /app/services/movie-backfill
CMD ["node", "dist/index.js"]

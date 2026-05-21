# syntax=docker/dockerfile:1.7
# Build context: repo root
# docker build -f services/movie-discovery/Dockerfile .

FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY services/movie-backfill/package.json ./services/movie-backfill/
COPY services/movie-discovery/package.json ./services/movie-discovery/
COPY services/movie-seed/package.json ./services/movie-seed/
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --no-audit --fund=false

COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src/ ./packages/shared/src/
RUN npm run build --workspace=packages/shared

COPY services/movie-discovery/tsconfig.json ./services/movie-discovery/
COPY services/movie-discovery/src/ ./services/movie-discovery/src/
RUN npm run build --workspace=services/movie-discovery

FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY services/movie-backfill/package.json ./services/movie-backfill/
COPY services/movie-discovery/package.json ./services/movie-discovery/
COPY services/movie-seed/package.json ./services/movie-seed/
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --omit=dev --no-audit --fund=false

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/movie-discovery/dist ./services/movie-discovery/dist

WORKDIR /app/services/movie-discovery
CMD ["node", "dist/index.js"]

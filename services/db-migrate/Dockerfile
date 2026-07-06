# syntax=docker/dockerfile:1.7
# Build context: repo root
# docker build -f services/db-migrate/Dockerfile .
#
# One-shot deployment job: applies all db/init/*.sql migrations and exits.
# In Coolify this is wired by coolify.compose.yml with restart: "no".

FROM node:24-slim

WORKDIR /app

# Copy root workspace manifest + every service package.json so `npm ci`
# can resolve the full workspace graph without errors.
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY services/db-migrate/package.json ./services/db-migrate/
COPY services/movie-backfill/package.json ./services/movie-backfill/
COPY services/movie-discovery/package.json ./services/movie-discovery/
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --omit=dev --workspace=services/db-migrate --no-audit --fund=false

# Migration script and SQL files
COPY services/db-migrate/migrate.js ./services/db-migrate/
COPY db/init/ ./db/init/

CMD ["node", "services/db-migrate/migrate.js"]

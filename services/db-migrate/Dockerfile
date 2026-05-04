# Build context: repo root
# docker build -f services/db-migrate/Dockerfile .
#
# One-shot Railway job: applies all db/init/*.sql migrations and exits.
# Configure in Railway dashboard:
#   • Dockerfile Path: services/db-migrate/Dockerfile
#   • Restart Policy: never  (Job runs once per deploy)

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
COPY services/movie-seed/package.json ./services/movie-seed/
RUN npm ci --omit=dev --workspace=services/db-migrate

# Migration script and SQL files
COPY services/db-migrate/migrate.js ./services/db-migrate/
COPY db/init/ ./db/init/

CMD ["node", "services/db-migrate/migrate.js"]

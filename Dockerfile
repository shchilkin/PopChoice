# Build context: repo root
# Builds Storybook using npm workspaces and serves on port 6006

FROM node:24-slim AS builder

WORKDIR /app

# Copy workspace manifests for all packages so npm ci resolves the full graph
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY services/movie-backfill/package.json ./services/movie-backfill/
COPY services/movie-discovery/package.json ./services/movie-discovery/
COPY services/movie-seed/package.json ./services/movie-seed/
RUN npm ci

# Build the shared package first (apps/web depends on it)
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src/ ./packages/shared/src/
RUN npm run build --workspace=packages/shared

# Build Storybook
COPY apps/web/.storybook ./apps/web/.storybook
COPY apps/web/src ./apps/web/src
COPY apps/web/public ./apps/web/public
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/next.config.ts ./apps/web/
COPY apps/web/postcss.config.mjs ./apps/web/
RUN npm run build-storybook --workspace=apps/web

# Serve stage
FROM node:24-slim

RUN npm install -g http-server

COPY --from=builder /app/apps/web/storybook-static /app/storybook-static

WORKDIR /app

EXPOSE 6006
CMD ["http-server", "storybook-static", "-p", "6006"]

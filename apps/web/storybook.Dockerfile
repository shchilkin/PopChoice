# syntax=docker/dockerfile:1.7
# Build context: repo root
# docker build -f apps/web/storybook.Dockerfile .

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

COPY apps/web/.storybook ./apps/web/.storybook
COPY apps/web/src ./apps/web/src
COPY apps/web/public ./apps/web/public
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/next.config.ts ./apps/web/
COPY apps/web/postcss.config.mjs ./apps/web/
RUN npm run build-storybook --workspace=apps/web

# Serve stage — nginx uses ~5MB RAM vs ~150MB for Node
FROM nginx:1.27-alpine
COPY --from=builder /app/apps/web/storybook-static /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

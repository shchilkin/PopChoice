# syntax=docker/dockerfile:1.7
# Build context: repo root
# docker build -f apps/web/Dockerfile .

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

COPY apps/web/src ./apps/web/src
COPY apps/web/public ./apps/web/public
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/next.config.ts ./apps/web/
COPY apps/web/postcss.config.mjs ./apps/web/
RUN npm run build --workspace=apps/web

FROM node:24-slim

WORKDIR /app

ARG APP_COMMIT_SHA
ARG APP_GIT_BRANCH
ARG SOURCE_COMMIT
ARG SOURCE_BRANCH
ARG COOLIFY_BRANCH
ARG COOLIFY_RESOURCE_UUID
ARG GITHUB_SHA
ARG VERCEL_GIT_COMMIT_SHA
ARG VERCEL_GIT_COMMIT_REF

ENV BUILD_APP_COMMIT_SHA=$APP_COMMIT_SHA
ENV BUILD_APP_GIT_BRANCH=$APP_GIT_BRANCH
ENV BUILD_SOURCE_COMMIT=$SOURCE_COMMIT
ENV BUILD_SOURCE_BRANCH=$SOURCE_BRANCH
ENV BUILD_COOLIFY_BRANCH=$COOLIFY_BRANCH
ENV BUILD_COOLIFY_RESOURCE_UUID=$COOLIFY_RESOURCE_UUID
ENV BUILD_GITHUB_SHA=$GITHUB_SHA
ENV BUILD_VERCEL_GIT_COMMIT_SHA=$VERCEL_GIT_COMMIT_SHA
ENV BUILD_VERCEL_GIT_COMMIT_REF=$VERCEL_GIT_COMMIT_REF

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY services/movie-backfill/package.json ./services/movie-backfill/
COPY services/movie-discovery/package.json ./services/movie-discovery/
COPY services/movie-seed/package.json ./services/movie-seed/
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --omit=dev --no-audit --fund=false

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY apps/web/public ./apps/web/public
COPY apps/web/next.config.ts ./apps/web/
COPY apps/web/scripts ./apps/web/scripts
COPY db/init ./db/init

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=apps/web"]

# syntax=docker/dockerfile:1.7
# Build context: repo root
# docker build -f apps/docs/Dockerfile .

FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/docs/package.json ./apps/docs/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY services/db-migrate/package.json ./services/db-migrate/
COPY services/movie-backfill/package.json ./services/movie-backfill/
COPY services/movie-discovery/package.json ./services/movie-discovery/
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --no-audit --fund=false

COPY apps/docs/next.config.mjs ./apps/docs/
COPY apps/docs/postcss.config.mjs ./apps/docs/
COPY apps/docs/source.config.ts ./apps/docs/
COPY apps/docs/tsconfig.json ./apps/docs/
COPY apps/docs/src ./apps/docs/src
COPY docs ./docs
RUN NEXT_TELEMETRY_DISABLED=1 npm run build --workspace=apps/docs

FROM node:24-slim

WORKDIR /app

ARG APP_COMMIT_SHA
ARG APP_GIT_BRANCH
ARG APP_PR_NUMBER
ARG APP_IMAGE_REPOSITORY
ARG APP_IMAGE_TAG
ARG APP_IMAGE_DIGEST
ARG SOURCE_COMMIT
ARG SOURCE_BRANCH
ARG COOLIFY_BRANCH
ARG COOLIFY_RESOURCE_UUID
ARG GITHUB_SHA
ARG VERCEL_GIT_COMMIT_SHA
ARG VERCEL_GIT_COMMIT_REF

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_APP_COMMIT_SHA=$APP_COMMIT_SHA
ENV BUILD_APP_GIT_BRANCH=$APP_GIT_BRANCH
ENV BUILD_APP_PR_NUMBER=$APP_PR_NUMBER
ENV BUILD_APP_IMAGE_REPOSITORY=$APP_IMAGE_REPOSITORY
ENV BUILD_APP_IMAGE_TAG=$APP_IMAGE_TAG
ENV BUILD_APP_IMAGE_DIGEST=$APP_IMAGE_DIGEST
ENV BUILD_SOURCE_COMMIT=$SOURCE_COMMIT
ENV BUILD_SOURCE_BRANCH=$SOURCE_BRANCH
ENV BUILD_COOLIFY_BRANCH=$COOLIFY_BRANCH
ENV BUILD_COOLIFY_RESOURCE_UUID=$COOLIFY_RESOURCE_UUID
ENV BUILD_GITHUB_SHA=$GITHUB_SHA
ENV BUILD_VERCEL_GIT_COMMIT_SHA=$VERCEL_GIT_COMMIT_SHA
ENV BUILD_VERCEL_GIT_COMMIT_REF=$VERCEL_GIT_COMMIT_REF

COPY package.json package-lock.json ./
COPY apps/docs/package.json ./apps/docs/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY services/db-migrate/package.json ./services/db-migrate/
COPY services/movie-backfill/package.json ./services/movie-backfill/
COPY services/movie-discovery/package.json ./services/movie-discovery/
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --omit=dev --no-audit --fund=false

COPY --from=builder /app/apps/docs/.next ./apps/docs/.next
COPY --from=builder /app/apps/docs/.source ./apps/docs/.source
COPY apps/docs/next.config.mjs ./apps/docs/
COPY apps/docs/source.config.ts ./apps/docs/
COPY docs ./docs

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=apps/docs", "--", "--hostname", "0.0.0.0", "--port", "3000"]

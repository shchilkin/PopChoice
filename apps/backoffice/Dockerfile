# syntax=docker/dockerfile:1.7
# Build context: repo root
# docker build -f apps/backoffice/Dockerfile .

FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backoffice/package.json ./apps/backoffice/
COPY apps/docs/package.json ./apps/docs/
COPY apps/web/package.json ./apps/web/
COPY apps/web/public/popcorn.svg ./apps/web/public/popcorn.svg
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY services/db-migrate/package.json ./services/db-migrate/
COPY services/movie-backfill/package.json ./services/movie-backfill/
COPY services/movie-discovery/package.json ./services/movie-discovery/
COPY services/movie-seed/package.json ./services/movie-seed/
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --no-audit --fund=false

COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/ui/src ./packages/ui/src
COPY packages/ui/tsconfig.json ./packages/ui/
COPY apps/backoffice/src ./apps/backoffice/src
COPY apps/backoffice/public ./apps/backoffice/public
COPY apps/backoffice/next.config.mjs ./apps/backoffice/
COPY apps/backoffice/postcss.config.mjs ./apps/backoffice/
COPY apps/backoffice/tsconfig.json ./apps/backoffice/
RUN npm run build --workspace=packages/shared && npm run build --workspace=packages/ui && npm run build --workspace=apps/backoffice

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
COPY apps/backoffice/package.json ./apps/backoffice/
COPY apps/docs/package.json ./apps/docs/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY services/db-migrate/package.json ./services/db-migrate/
COPY services/movie-backfill/package.json ./services/movie-backfill/
COPY services/movie-discovery/package.json ./services/movie-discovery/
COPY services/movie-seed/package.json ./services/movie-seed/
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --omit=dev --no-audit --fund=false

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/ui/src ./packages/ui/src
COPY --from=builder /app/apps/backoffice/.next ./apps/backoffice/.next
COPY --from=builder /app/apps/backoffice/next.config.mjs ./apps/backoffice/next.config.mjs
COPY --from=builder /app/apps/backoffice/public ./apps/backoffice/public
RUN chown -R node:node /app

EXPOSE 3000
USER node
CMD ["npm", "run", "start", "--workspace=apps/backoffice", "--", "--hostname", "0.0.0.0", "--port", "3000"]

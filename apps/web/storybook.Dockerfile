# Build context: repo root
# docker build -f apps/web/storybook.Dockerfile .

FROM node:24.11-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci

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

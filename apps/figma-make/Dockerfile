# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/figma-make/package.json ./apps/figma-make/package.json

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=apps/figma-make --include-workspace-root=false

COPY apps/figma-make ./apps/figma-make

RUN npm run build --workspace=apps/figma-make

FROM nginx:1.27-alpine AS runtime

COPY apps/figma-make/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/figma-make/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

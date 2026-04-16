# Build stage
FROM node:24.11-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY .storybook ./.storybook
COPY src ./src
COPY public ./public
COPY tsconfig.json ./
COPY next.config.ts ./
COPY postcss.config.mjs ./
RUN npm run build-storybook

# Serve stage — nginx uses ~5MB RAM vs ~150MB for Node
FROM nginx:1.27-alpine
COPY --from=builder /app/storybook-static /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

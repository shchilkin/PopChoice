# Build context: repo root
# docker build -f apps/web/bull-board.Dockerfile .

FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --omit=dev

COPY packages/shared/src/ ./packages/shared/src/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY apps/web/scripts/bull-board.ts ./apps/web/scripts/
COPY apps/web/tsconfig.json ./apps/web/

EXPOSE 3000
CMD ["node_modules/.bin/tsx", "apps/web/scripts/bull-board.ts"]

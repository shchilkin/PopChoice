# Build context: repo root
# docker build -f apps/web/bull-board.Dockerfile .

FROM node:24-slim

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY services/movie-backfill/package.json ./services/movie-backfill/
COPY services/movie-discovery/package.json ./services/movie-discovery/
COPY services/movie-seed/package.json ./services/movie-seed/
RUN npm ci --omit=dev

COPY packages/shared/src/ ./packages/shared/src/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY apps/web/scripts/bull-board.ts ./apps/web/scripts/
COPY apps/web/scripts/coolify-runtime-env.cjs ./apps/web/scripts/
COPY apps/web/tsconfig.json ./apps/web/

EXPOSE 3000
CMD ["npm", "run", "bull-board", "--workspace=apps/web"]

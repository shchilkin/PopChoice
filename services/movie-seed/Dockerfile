# Build context: repo root
# docker build -f services/movie-seed/Dockerfile .

FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/movie-seed/package.json ./services/movie-seed/package.json

RUN npm ci

COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src/ ./packages/shared/src/
RUN npm run build --workspace=packages/shared

COPY services/movie-seed/tsconfig.json ./services/movie-seed/
COPY services/movie-seed/src/ ./services/movie-seed/src/
RUN npm run build --workspace=services/movie-seed

FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/movie-seed/package.json ./services/movie-seed/package.json
RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/movie-seed/dist ./services/movie-seed/dist

WORKDIR /app/services/movie-seed
COPY services/movie-seed/movies.txt ./movies.txt

CMD ["node", "dist/index.js"]

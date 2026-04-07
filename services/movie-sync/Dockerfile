FROM node:20-slim AS builder

WORKDIR /app

COPY services/movie-sync/package.json services/movie-sync/package-lock.json* ./
RUN npm ci

COPY services/movie-sync/tsconfig.json ./
COPY services/movie-sync/src/ ./src/

RUN npm run build

FROM node:20-slim

WORKDIR /app

COPY services/movie-sync/package.json services/movie-sync/package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY movies.txt ./

CMD ["node", "dist/index.js"]

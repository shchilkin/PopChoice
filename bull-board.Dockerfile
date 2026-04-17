FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY scripts/bull-board.ts ./scripts/bull-board.ts

CMD ["npm", "run", "bull-board"]

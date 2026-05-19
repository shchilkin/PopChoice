import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import express from 'express';
import IORedis from 'ioredis';

import type { RedisOptions } from 'ioredis';

const PORT = Number(process.env.PORT ?? process.env.BULL_BOARD_PORT ?? 3001);
const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error('Error: REDIS_URL is not set. Add it to your .env file.');
  process.exit(1);
}

function redisOptionsFromUrl(redisUrl: string, overrides: RedisOptions = {}): RedisOptions {
  const url = new URL(redisUrl);

  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error('REDIS_URL must use redis:// or rediss://');
  }

  const dbPath = url.pathname.replace(/^\/+/, '');
  const db = dbPath ? Number.parseInt(dbPath, 10) : undefined;

  if (dbPath && Number.isNaN(db)) {
    throw new Error('REDIS_URL database index must be a number');
  }

  const family = url.searchParams.get('family');
  const parsedFamily = family ? Number.parseInt(family, 10) : undefined;

  return {
    host: url.hostname,
    port: url.port ? Number.parseInt(url.port, 10) : 6379,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(db !== undefined ? { db } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    ...(parsedFamily !== undefined && !Number.isNaN(parsedFamily) ? { family: parsedFamily } : {}),
    ...overrides,
  };
}

const connection = new IORedis(redisOptionsFromUrl(REDIS_URL, { maxRetriesPerRequest: null }));

const seedQueue = new Queue('movie-seed', { connection });
const recommendationQueue = new Queue('recommendation', { connection });
const morePicksQueue = new Queue('more-picks', { connection });

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');

createBullBoard({
  queues: [
    new BullMQAdapter(seedQueue),
    new BullMQAdapter(recommendationQueue),
    new BullMQAdapter(morePicksQueue),
  ],
  serverAdapter,
});

const app = express();
app.use('/', serverAdapter.getRouter());

app.listen(PORT, () => {
  console.log(`Bull Board running at http://localhost:${PORT}`);
});

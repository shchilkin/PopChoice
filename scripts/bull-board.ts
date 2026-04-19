import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import express from 'express';
import IORedis from 'ioredis';

import logger from '@/lib/logger';

const PORT = Number(process.env.PORT ?? process.env.BULL_BOARD_PORT ?? 3001);
const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  logger.error('Error: REDIS_URL is not set. Add it to your .env file.');
  process.exit(1);
}

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const seedQueue = new Queue('movie-seed', { connection });

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');

createBullBoard({
  queues: [new BullMQAdapter(seedQueue)],
  serverAdapter,
});

const app = express();
app.use('/', serverAdapter.getRouter());

app.listen(PORT, () => {
  logger.info(`Bull Board running at http://localhost:${PORT}`);
});

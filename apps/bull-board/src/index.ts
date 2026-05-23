import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import express from 'express';
import { Redis } from 'ioredis';

const PORT = Number(process.env.PORT ?? process.env.BULL_BOARD_PORT ?? 4000);
const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error('Error: REDIS_URL is not set. Add it to your .env file.');
  process.exit(1);
}

const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

const seedQueue = new Queue('movie-seed', { connection });
const catalogMaintenanceQueue = new Queue('catalog-maintenance', { connection });
const recommendationQueue = new Queue('recommendation', { connection });
const morePicksQueue = new Queue('more-picks', { connection });

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');

createBullBoard({
  queues: [
    new BullMQAdapter(seedQueue),
    new BullMQAdapter(catalogMaintenanceQueue),
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

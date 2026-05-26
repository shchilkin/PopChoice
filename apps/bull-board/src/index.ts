import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import {
  operatorAuthChallenge,
  readOperatorAuthConfig,
  verifyOperatorBasicAuthHeader,
} from '@pop-choice/shared';
import { Queue } from 'bullmq';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { Redis } from 'ioredis';

import type { RequestHandler } from 'express';

const PORT = Number(process.env.PORT ?? process.env.BULL_BOARD_PORT ?? 4000);
const REDIS_URL = process.env.REDIS_URL;
const OPERATOR_AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const OPERATOR_AUTH_RATE_LIMIT_MAX = 30;

if (!REDIS_URL) {
  console.error('Error: REDIS_URL is not set. Add it to your .env file.');
  process.exit(1);
}

function createOperatorAuthMiddleware(): RequestHandler {
  const authConfig = readOperatorAuthConfig();

  if (!authConfig) {
    console.warn(
      'Warning: operator auth is disabled. Set OPERATOR_AUTH_USERNAME and OPERATOR_AUTH_PASSWORD before exposing Bull Board.',
    );

    return (_request, _response, next) => next();
  }

  return (request, response, next) => {
    if (verifyOperatorBasicAuthHeader(request.headers.authorization, authConfig)) {
      next();
      return;
    }

    response.setHeader('WWW-Authenticate', operatorAuthChallenge(authConfig.realm));
    response.status(401).send('Authentication required');
  };
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
app.get('/healthz', (_request, response) => response.status(200).send('ok'));
app.use(
  rateLimit({
    windowMs: OPERATOR_AUTH_RATE_LIMIT_WINDOW_MS,
    limit: OPERATOR_AUTH_RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: 'Too many operator requests, please try again later.',
  }),
);
app.use(createOperatorAuthMiddleware());
app.use('/', serverAdapter.getRouter());

app.listen(PORT, () => {
  console.log(`Bull Board running at http://localhost:${PORT}`);
});

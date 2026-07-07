import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import {
  operatorAuthChallenge,
  readBullBoardRuntimeConfig,
  verifyOperatorBasicAuthHeader,
} from '@pop-choice/shared';
import { Queue } from 'bullmq';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { Redis } from 'ioredis';

import type { OperatorAuthConfig } from '@pop-choice/shared';
import type { RequestHandler } from 'express';

const config = readBullBoardRuntimeConfig();

function createOperatorAuthMiddleware(authConfig: OperatorAuthConfig | null): RequestHandler {
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

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

const seedQueue = new Queue('movie-seed', { connection });
const catalogMaintenanceQueue = new Queue('catalog-maintenance', { connection });
const recommendationQueue = new Queue('recommendation', { connection });
const morePicksQueue = new Queue('more-picks', { connection });
const recommendationEvalQueue = new Queue('recommendation-evals', { connection });

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');

createBullBoard({
  queues: [
    new BullMQAdapter(seedQueue),
    new BullMQAdapter(catalogMaintenanceQueue),
    new BullMQAdapter(recommendationQueue),
    new BullMQAdapter(morePicksQueue),
    new BullMQAdapter(recommendationEvalQueue),
  ],
  serverAdapter,
});

const app = express();
app.set('trust proxy', 1);
app.get('/healthz', (_request, response) => response.status(200).send('ok'));
app.use(
  rateLimit({
    windowMs: config.operatorAuthRateLimitWindowSeconds * 1000,
    limit: config.operatorAuthRateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: 'Too many operator requests, please try again later.',
  }),
);
app.use(createOperatorAuthMiddleware(config.operatorAuth));
app.use('/', serverAdapter.getRouter());

app.listen(config.port, () => {
  console.log(`Bull Board running at http://localhost:${config.port}`);
});

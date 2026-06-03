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
import type { RedisOptions } from 'ioredis';

const PORT = Number(process.env.PORT ?? process.env.BULL_BOARD_PORT ?? 3001);
const REDIS_URL = process.env.REDIS_URL;
const DEFAULT_OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const DEFAULT_OPERATOR_AUTH_RATE_LIMIT_MAX = 30;

if (!REDIS_URL) {
  console.error('Error: REDIS_URL is not set. Add it to your .env file.');
  process.exit(1);
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === '') return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received "${value}".`);
  }

  return parsed;
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

const connection = new Redis(redisOptionsFromUrl(REDIS_URL, { maxRetriesPerRequest: null }));

const seedQueue = new Queue('movie-seed', { connection });
const catalogMaintenanceQueue = new Queue('catalog-maintenance', { connection });
const recommendationQueue = new Queue('recommendation', { connection });
const morePicksQueue = new Queue('more-picks', { connection });
const recommendationEvalQueue = new Queue('recommendation-evals', { connection });

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');

const operatorAuthRateLimitWindowSeconds = parsePositiveInteger(
  process.env.OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS,
  DEFAULT_OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS,
);
const operatorAuthRateLimitMax = parsePositiveInteger(
  process.env.OPERATOR_AUTH_RATE_LIMIT_MAX,
  DEFAULT_OPERATOR_AUTH_RATE_LIMIT_MAX,
);

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
    windowMs: operatorAuthRateLimitWindowSeconds * 1000,
    limit: operatorAuthRateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: 'Too many operator requests, please try again later.',
  }),
);
app.use(createOperatorAuthMiddleware());
app.use('/', serverAdapter.getRouter());

app.listen(PORT, () => {
  console.log(`Bull Board running at http://localhost:${PORT}`);
});

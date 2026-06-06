import { createServer } from 'node:http';

import {
  CATALOG_MAINTENANCE_QUEUE_NAME,
  MORE_PICKS_QUEUE_NAME,
  MOVIE_SEED_QUEUE_NAME,
  RECOMMENDATION_QUEUE_NAME,
  catalogMaintenanceQueue,
  morePicksQueue,
  recommendationQueue,
  seedQueue,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';
import {
  areMetricsEnabled,
  collectMetrics,
  isMetricsRequestAuthorized,
  metricsContentType,
} from '@/lib/metrics';

import type { IncomingMessage, Server, ServerResponse } from 'node:http';

const DEFAULT_WORKER_METRICS_PORT = 9464;

function parsePort(value: string | undefined): number {
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  return isValidPort(parsed) ? parsed : DEFAULT_WORKER_METRICS_PORT;
}

// Imported dynamically by startWorkers.ts.
// fallow-ignore-next-line unused-export
export function startWorkerMetricsServer(): Server | null {
  if (!areMetricsEnabled()) return null;

  const port = parsePort(process.env.WORKER_METRICS_PORT);
  const server = createServer((req, res) => {
    void handleMetricsRequest(req, res).catch((err) => {
      logger.error({ err }, 'Worker metrics scrape failed');
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Metrics scrape failed.\n');
    });
  });

  server.listen(port, '0.0.0.0', () => {
    logger.info({ port }, 'Worker metrics server listening');
  });

  server.on('error', (err) => {
    logger.error({ err, port }, 'Worker metrics server failed');
  });

  return server;
}

function isValidPort(port: number) {
  return Number.isFinite(port) && port > 0 && port < 65536;
}

async function handleMetricsRequest(req: IncomingMessage, res: ServerResponse) {
  const earlyResponse = writeEarlyMetricsResponse(req, res);
  if (earlyResponse) return;

  const body = await collectMetrics([
    { name: MOVIE_SEED_QUEUE_NAME, queue: seedQueue },
    { name: RECOMMENDATION_QUEUE_NAME, queue: recommendationQueue },
    { name: MORE_PICKS_QUEUE_NAME, queue: morePicksQueue },
    { name: CATALOG_MAINTENANCE_QUEUE_NAME, queue: catalogMaintenanceQueue },
  ]);

  res.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': metricsContentType(),
  });
  res.end(body);
}

function writeEarlyMetricsResponse(req: IncomingMessage, res: ServerResponse) {
  if (req.url !== '/metrics') {
    writeTextResponse(res, 404, 'Not found.\n');
    return true;
  }

  if (!isMetricsRequestAuthorized(getAuthorizationHeader(req))) {
    writeTextResponse(res, 401, 'Unauthorized.\n');
    return true;
  }

  return false;
}

function getAuthorizationHeader(req: IncomingMessage) {
  return Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : (req.headers.authorization ?? null);
}

function writeTextResponse(res: ServerResponse, status: number, body: string) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

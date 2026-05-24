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

import type { Server } from 'node:http';

const DEFAULT_WORKER_METRICS_PORT = 9464;

function parsePort(value: string | undefined): number {
  if (!value) return DEFAULT_WORKER_METRICS_PORT;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 && parsed < 65536
    ? parsed
    : DEFAULT_WORKER_METRICS_PORT;
}

export function startWorkerMetricsServer(): Server | null {
  if (!areMetricsEnabled()) return null;

  const port = parsePort(process.env.WORKER_METRICS_PORT);
  const server = createServer((req, res) => {
    void (async () => {
      if (req.url !== '/metrics') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found.\n');
        return;
      }

      const authorization = Array.isArray(req.headers.authorization)
        ? req.headers.authorization[0]
        : req.headers.authorization;

      if (!isMetricsRequestAuthorized(authorization ?? null)) {
        res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Unauthorized.\n');
        return;
      }

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
    })().catch((err) => {
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

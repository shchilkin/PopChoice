import { connection, NextRequest } from 'next/server';

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
import {
  areMetricsEnabled,
  collectMetrics,
  isMetricsRequestAuthorized,
  metricsContentType,
} from '@/lib/metrics';

export async function GET(req: NextRequest): Promise<Response> {
  await connection();

  if (!areMetricsEnabled()) {
    return new Response('Metrics are disabled.\n', { status: 404 });
  }

  if (!isMetricsRequestAuthorized(req.headers.get('authorization'))) {
    return new Response('Unauthorized.\n', { status: 401 });
  }

  const body = await collectMetrics([
    { name: MOVIE_SEED_QUEUE_NAME, queue: seedQueue },
    { name: RECOMMENDATION_QUEUE_NAME, queue: recommendationQueue },
    { name: MORE_PICKS_QUEUE_NAME, queue: morePicksQueue },
    { name: CATALOG_MAINTENANCE_QUEUE_NAME, queue: catalogMaintenanceQueue },
  ]);

  return new Response(body, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': metricsContentType(),
    },
  });
}

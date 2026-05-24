import { closeBullMQQueues } from '@/lib/jobQueue';
import logger from '@/lib/logger';

import { createCatalogMaintenanceWorker } from './catalogMaintenanceWorker';
import { startWorkerMetricsServer } from './metricsServer';
import { createMorePicksWorker } from './morePicksWorker';
import { createMovieSeedWorker } from './movieSeedWorker';
import { createRecommendationWorker } from './recommendationWorker';

const catalogMaintenanceWorker = createCatalogMaintenanceWorker();
const movieSeedWorker = createMovieSeedWorker();
const recommendationWorker = createRecommendationWorker();
const morePicksWorker = createMorePicksWorker();
const metricsServer = startWorkerMetricsServer();

if (!catalogMaintenanceWorker && !movieSeedWorker && !recommendationWorker) {
  // Both core workers failed — REDIS_URL is likely unset or Redis is unreachable.
  // Exiting is intentional: running with zero workers provides no value.
  logger.error('No core workers could be started. Exiting.');
  process.exit(1);
}

if (!catalogMaintenanceWorker) {
  logger.warn('Catalog maintenance worker could not be created — continuing without it.');
}

if (!movieSeedWorker) {
  logger.warn('Movie seeding worker could not be created — continuing without it.');
}

if (!recommendationWorker) {
  logger.warn('Recommendation worker could not be created — continuing without it.');
}

if (!morePicksWorker) {
  logger.warn('More-picks worker could not be created — continuing without it.');
}

const shutdown = async (signal: NodeJS.Signals) => {
  logger.info({ signal }, 'Shutting down workers');
  try {
    await Promise.all([
      catalogMaintenanceWorker?.close(),
      movieSeedWorker?.close(),
      recommendationWorker?.close(),
      morePicksWorker?.close(),
      new Promise<void>((resolve, reject) => {
        if (!metricsServer) {
          resolve();
          return;
        }
        metricsServer.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
    ]);
    await closeBullMQQueues();
    logger.info('Workers closed gracefully');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error while shutting down workers');
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

import logger from '@/lib/logger';
import { initTracing, shutdownTracing } from '@/lib/tracingSetup';

initTracing('workers');

async function main() {
  const [
    { closeBullMQQueues },
    { createCatalogMaintenanceWorker },
    { startWorkerMetricsServer },
    { createMorePicksWorker },
    { createMovieSeedWorker },
    { createRecommendationWorker },
    { createRecommendationEvalWorker },
  ] = await Promise.all([
    import('@/lib/jobQueue'),
    import('./catalogMaintenanceWorker'),
    import('./metricsServer'),
    import('./morePicksWorker'),
    import('./movieSeedWorker'),
    import('./recommendationWorker'),
    import('./recommendationEvalWorker'),
  ]);

  const catalogMaintenanceWorker = createCatalogMaintenanceWorker();
  const movieSeedWorker = createMovieSeedWorker();
  const recommendationWorker = createRecommendationWorker();
  const morePicksWorker = createMorePicksWorker();
  const recommendationEvalWorker = createRecommendationEvalWorker();
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

  if (!recommendationEvalWorker) {
    logger.warn('Recommendation eval worker could not be created — continuing without it.');
  }

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, 'Shutting down workers');
    try {
      await Promise.all([
        catalogMaintenanceWorker?.close(),
        movieSeedWorker?.close(),
        recommendationWorker?.close(),
        morePicksWorker?.close(),
        recommendationEvalWorker?.close(),
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
      await shutdownTracing();
      logger.info('Workers closed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error while shutting down workers');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main().catch((error) => {
  logger.error({ err: error }, 'Worker bootstrap failed');
  process.exit(1);
});

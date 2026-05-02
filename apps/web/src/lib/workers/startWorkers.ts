import logger from '@/lib/logger';

import { createMorePicksWorker } from './morePicksWorker';
import { createMovieSeedWorker } from './movieSeedWorker';
import { createRecommendationWorker } from './recommendationWorker';

const movieSeedWorker = createMovieSeedWorker();
const recommendationWorker = createRecommendationWorker();
const morePicksWorker = createMorePicksWorker();

if (!movieSeedWorker && !recommendationWorker) {
  // Both core workers failed — REDIS_URL is likely unset or Redis is unreachable.
  // Exiting is intentional: running with zero workers provides no value.
  logger.error('No workers could be started (both movie-seed and recommendation). Exiting.');
  process.exit(1);
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
      movieSeedWorker?.close(),
      recommendationWorker?.close(),
      morePicksWorker?.close(),
    ]);
    logger.info('Workers closed gracefully');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error while shutting down workers');
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

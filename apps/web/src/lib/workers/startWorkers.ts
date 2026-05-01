import logger from '@/lib/logger';

import { createMovieSeedWorker } from './movieSeedWorker';
import { createRecommendationWorker } from './recommendationWorker';

const movieSeedWorker = createMovieSeedWorker();
const recommendationWorker = createRecommendationWorker();

if (!movieSeedWorker && !recommendationWorker) {
  logger.error('No workers started. Exiting because no workers could be created.');
  process.exit(1);
}

if (!movieSeedWorker) {
  logger.warn('Movie seeding worker could not be created — continuing without it.');
}

if (!recommendationWorker) {
  logger.warn('Recommendation worker could not be created — continuing without it.');
}

const shutdown = async (signal: NodeJS.Signals) => {
  logger.info({ signal }, 'Shutting down workers');
  try {
    await Promise.all([movieSeedWorker?.close(), recommendationWorker?.close()]);
    logger.info('Workers closed gracefully');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error while shutting down workers');
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

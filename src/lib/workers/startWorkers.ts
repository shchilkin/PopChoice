import logger from '@/lib/logger';

import { createMovieSeedWorker } from './movieSeedWorker';

const movieSeedWorker = createMovieSeedWorker();

if (!movieSeedWorker) {
  logger.warn('No workers started.');
}

const shutdown = async (signal: NodeJS.Signals) => {
  logger.info({ signal }, 'Shutting down workers');
  if (!movieSeedWorker) {
    process.exit(0);
  }

  try {
    await movieSeedWorker.close();
    logger.info('Movie seeding worker closed gracefully');
  } catch (error) {
    logger.error({ err: error }, 'Error while shutting down movie seeding worker');
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

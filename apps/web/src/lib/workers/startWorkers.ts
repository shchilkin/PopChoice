import logger from '@/lib/logger';

import { createMovieSeedWorker } from './movieSeedWorker';

const movieSeedWorker = createMovieSeedWorker();

if (!movieSeedWorker) {
  logger.error('No workers started. Exiting because movie seeding worker could not be created.');
  process.exit(1);
}

const shutdown = async (signal: NodeJS.Signals) => {
  logger.info({ signal }, 'Shutting down workers');
  try {
    await movieSeedWorker.close();
    logger.info('Movie seeding worker closed gracefully');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error while shutting down movie seeding worker');
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

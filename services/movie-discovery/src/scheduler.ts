import cron from 'node-cron';

import type { Config } from './config.js';
import { logger } from './logger.js';
import { runSync } from './sync.js';

let isSyncing = false;

export async function guardedSync(config: Config, label: string): Promise<void> {
  if (isSyncing) {
    logger.info('Sync already in progress, skipping', { trigger: label });
    return;
  }
  isSyncing = true;
  try {
    await runSync(config);
  } finally {
    isSyncing = false;
  }
}

export function startScheduler(config: Config): void {
  if (!cron.validate(config.schedule)) {
    logger.error('Invalid SYNC_SCHEDULE', { schedule: config.schedule });
    process.exit(1);
  }

  logger.info('Scheduling discovery sync', {
    schedule: config.schedule,
    timezone: 'UTC',
  });

  cron.schedule(
    config.schedule,
    async () => {
      try {
        await guardedSync(config, 'cron');
      } catch (err) {
        logger.error('Scheduled sync failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    { timezone: 'UTC' },
  );
}

/**
 * Movie Sync Service — Entry Point
 *
 * Supports two modes:
 *   - One-shot: runs a single sync immediately, then exits.
 *     Triggered when CRON_SCHEDULE is empty or the --once flag is passed.
 *   - Scheduled: runs on a cron schedule (default: 3 AM daily).
 *
 * Environment variables:
 *   TMDB_API_KEY      — TMDB API bearer token (required)
 *   OPENAI_API_KEY    — OpenAI API key (required)
 *   SUPABASE_URL      — Supabase project URL (required)
 *   SUPABASE_API_KEY  — Supabase anon/service key (required)
 *   CRON_SCHEDULE     — Cron expression (default: "0 3 * * *")
 *   DRY_RUN           — Set to "true" to skip embeddings/inserts
 */

import cron from 'node-cron';

import { loadConfig } from './config.js';
import { logger } from './logger.js';
import { runSync } from './sync.js';

async function main(): Promise<void> {
  const config = loadConfig();

  logger.info('Movie sync service starting', {
    cronSchedule: config.cronSchedule,
    dryRun: config.dryRun,
  });

  const oneShot =
    process.argv.includes('--once') || process.env.CRON_SCHEDULE === '';

  if (oneShot) {
    logger.info('Running in one-shot mode');
    try {
      await runSync(config);
    } catch (err) {
      logger.error('Sync failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
    return;
  }

  // Validate cron expression
  if (!cron.validate(config.cronSchedule)) {
    logger.error('Invalid CRON_SCHEDULE', { cronSchedule: config.cronSchedule });
    process.exit(1);
  }

  logger.info('Scheduling sync', { cronSchedule: config.cronSchedule });

  cron.schedule(config.cronSchedule, async () => {
    try {
      await runSync(config);
    } catch (err) {
      logger.error('Scheduled sync failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Run once immediately on startup as well
  logger.info('Running initial sync on startup');
  try {
    await runSync(config);
  } catch (err) {
    logger.error('Initial sync failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

main().catch((err) => {
  logger.error('Fatal error', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

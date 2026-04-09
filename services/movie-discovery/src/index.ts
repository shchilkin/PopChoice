/**
 * Movie Discovery Service — Entry Point
 *
 * Supports two modes:
 *   - One-shot: runs a single sync immediately, then exits.
 *     Triggered when SYNC_SCHEDULE is empty or the --once flag is passed.
 *   - Scheduled: runs on a cron schedule (default: weekly Sunday midnight UTC).
 *
 * Environment variables:
 *   TMDB_API_KEY          — TMDB API key (required)
 *   OPENAI_API_KEY        — OpenAI API key (required)
 *   DATABASE_URL          — PostgreSQL connection string (required)
 *   TMDB_SOURCES          — Comma-separated sources (default: all four)
 *   MAX_PAGES_PER_SOURCE  — Pages to fetch per source (default: 3)
 *   MIN_VOTE_COUNT        — Minimum vote count threshold (default: 500)
 *   MIN_VOTE_AVERAGE      — Minimum vote average threshold (default: 6.5)
 *   MAX_MOVIES_PER_RUN    — Max movies to embed per run (default: 50)
 *   TMDB_LANGUAGE         — TMDB API language/locale tag (default: "en-US")
 *   SYNC_SCHEDULE         — Cron expression (default: "0 0 * * 0")
 *   DRY_RUN               — Set to "true" to skip embeddings/inserts
 */

import { loadConfig } from './config.js';
import { closeDatabase, ensureSchema, initDatabase } from './database.js';
import { logger } from './logger.js';
import { guardedSync, startScheduler } from './scheduler.js';

async function main(): Promise<void> {
  const config = loadConfig();

  initDatabase(config.databaseUrl);
  await ensureSchema();

  logger.info('Movie discovery service starting', {
    schedule: config.schedule,
    sources: config.sources,
    dryRun: config.dryRun,
    maxPagesPerSource: config.maxPagesPerSource,
    maxMoviesPerRun: config.maxMoviesPerRun,
  });

  const oneShot = process.argv.includes('--once') || config.schedule === '';

  if (oneShot) {
    logger.info('Running in one-shot mode');
    try {
      await guardedSync(config, 'one-shot');
    } catch (err) {
      logger.error('Sync failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exitCode = 1;
    } finally {
      await closeDatabase();
    }
    return;
  }

  // Start scheduler (non-blocking)
  startScheduler(config);

  // Run once immediately on startup as well
  logger.info('Running initial sync on startup');
  try {
    await guardedSync(config, 'startup');
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

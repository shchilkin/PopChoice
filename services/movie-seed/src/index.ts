/**
 * Movie Seed Service — Entry Point
 *
 * One-shot service that reads movies from movies.txt and seeds the database.
 *
 * Environment variables:
 *   OPENAI_API_KEY    — OpenAI API key (required)
 *   DATABASE_URL      — PostgreSQL connection string (required)
 *   MOVIES_FILE_PATH  — Path to movies.txt (default: <cwd>/movies.txt)
 *   DRY_RUN           — Set to "true" to skip embeddings/inserts
 */

import { loadConfig } from './config.js';
import { closeDatabase, ensureSchema, initDatabase } from './database.js';
import { logger } from './logger.js';
import { runSync } from './sync.js';

async function main(): Promise<void> {
  const config = loadConfig();

  initDatabase(config.databaseUrl);
  await ensureSchema();

  logger.info('Movie seed service starting', {
    moviesFilePath: config.moviesFilePath,
    dryRun: config.dryRun,
  });

  try {
    await runSync(config);
  } catch (err) {
    logger.error('Seed failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

main().catch((err) => {
  logger.error('Fatal error', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

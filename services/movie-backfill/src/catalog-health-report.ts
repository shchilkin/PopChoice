/**
 * Read-only catalog health report.
 *
 * Environment variables:
 *   DATABASE_URL                 - PostgreSQL connection string (required)
 *   CATALOG_HEALTH_FORMAT        - "text" or "json" (default: "text")
 *   CATALOG_HEALTH_SAMPLE_LIMIT  - Number of samples/groups per issue (default: 5)
 *   CATALOG_HEALTH_STALE_DAYS    - TMDB metadata age threshold (default: 180)
 */

import { parsePositiveInt, requireEnvVars } from '@pop-choice/shared';

import { formatCatalogHealthReport, getCatalogHealthReport } from './catalog-health.js';
import { checkTableExists, closeDatabase, initDatabase } from './database.js';
import { logger } from './logger.js';

type OutputFormat = 'json' | 'text';

function loadOutputFormat(): OutputFormat {
  const raw = process.env.CATALOG_HEALTH_FORMAT ?? 'text';
  if (raw === 'json' || raw === 'text') return raw;
  throw new Error(`CATALOG_HEALTH_FORMAT must be "text" or "json", got: ${JSON.stringify(raw)}`);
}

async function main(): Promise<void> {
  const env = requireEnvVars(['DATABASE_URL']);
  const outputFormat = loadOutputFormat();
  const sampleLimit = parsePositiveInt(
    process.env.CATALOG_HEALTH_SAMPLE_LIMIT,
    5,
    'CATALOG_HEALTH_SAMPLE_LIMIT',
  );
  const staleAfterDays = parsePositiveInt(
    process.env.CATALOG_HEALTH_STALE_DAYS,
    180,
    'CATALOG_HEALTH_STALE_DAYS',
  );

  initDatabase(env.DATABASE_URL);

  try {
    const tableExists = await checkTableExists('movies');
    if (!tableExists) {
      throw new Error(
        "Cannot generate catalog health report because table 'movies' does not exist",
      );
    }

    const report = await getCatalogHealthReport({ sampleLimit, staleAfterDays });
    if (outputFormat === 'json') {
      console.log(JSON.stringify(report, null, 2));
    } else {
      process.stdout.write(formatCatalogHealthReport(report));
    }
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  logger.error('Catalog health report failed', {
    err: error instanceof Error ? error : new Error(String(error)),
  });
  process.exitCode = 1;
});

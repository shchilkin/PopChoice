import { logger } from '../logger.js';
import { RECOMMENDATION_EVAL_RUN_SCHEMA_SQL } from '../recommendationEvalSchema.js';

import { getPool } from './pool.js';
import { CATALOG_METADATA_SCHEMA_SQL } from './schema/catalogMetadataSql.js';
import { MATCH_MOVIES_FUNCTION_SQL } from './schema/matchMoviesSql.js';
import { MOVIE_METADATA_SCHEMA_SQL } from './schema/movieMetadataSql.js';
import { MOVIES_TABLE_SCHEMA_SQL } from './schema/moviesSql.js';
import { REVIEW_AND_REPAIR_SCHEMA_SQL } from './schema/reviewRepairSql.js';

async function runSchemaSql(sql: string): Promise<void> {
  await getPool().query(sql);
}

export async function ensureSchema(): Promise<void> {
  await runSchemaSql('CREATE EXTENSION IF NOT EXISTS vector;');
  await runSchemaSql(MOVIES_TABLE_SCHEMA_SQL);
  await runSchemaSql(MOVIE_METADATA_SCHEMA_SQL);
  await ensureCatalogMetadataSchema();
  await runSchemaSql(REVIEW_AND_REPAIR_SCHEMA_SQL);
  await runSchemaSql(RECOMMENDATION_EVAL_RUN_SCHEMA_SQL);
  await runSchemaSql(MATCH_MOVIES_FUNCTION_SQL);
  logger.info('Schema ensured');
}

export async function ensureCatalogMetadataSchema(): Promise<void> {
  await runSchemaSql(CATALOG_METADATA_SCHEMA_SQL);
}

export async function getMovieCount(): Promise<number> {
  const result = await getPool().query<{ count: string }>('SELECT COUNT(*) AS count FROM movies');
  return parseInt(result.rows[0].count, 10);
}

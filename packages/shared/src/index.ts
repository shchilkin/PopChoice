export { logger } from './logger.js';
export {
  initDatabase,
  closeDatabase,
  getPool,
  checkTableExists,
  filterNewMovies,
  ensureCatalogMetadataSchema,
  ensureSchema,
  getMovieCount,
  insertMovies,
} from './db.js';
export type {
  CatalogGenreRecord,
  CatalogKeywordRecord,
  CatalogMetadataSource,
  CatalogPersonRecord,
  MoviePersonCreditRecord,
  MoviePersonRole,
  MovieRecord,
} from './db.js';
export { createEmbeddings } from './embeddings.js';
export {
  parsePositiveInt,
  parseNonNegativeInt,
  parsePositiveFloat,
  requireEnvVars,
} from './config.js';

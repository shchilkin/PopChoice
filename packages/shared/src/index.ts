export { logger } from './logger.js';
export {
  initDatabase,
  closeDatabase,
  getPool,
  checkTableExists,
  filterNewMovies,
  ensureSchema,
  getMovieCount,
  insertMovies,
} from './db.js';
export type { MovieRecord } from './db.js';
export { createEmbeddings } from './embeddings.js';
export {
  parsePositiveInt,
  parseNonNegativeInt,
  parsePositiveFloat,
  requireEnvVars,
} from './config.js';

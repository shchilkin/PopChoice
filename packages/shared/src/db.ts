export { closeDatabase, getPool, initDatabase } from './db/pool.js';
export { checkTableExists, filterNewMovies } from './db/duplicates.js';
export { ensureCatalogMetadataSchema, ensureSchema, getMovieCount } from './db/schema.js';
export { upsertMovieCatalogMetadata } from './db/catalogMetadata.js';
export { insertMovies } from './db/insertMovies.js';

export type {
  CatalogGenreInput,
  CatalogGenreRecord,
  CatalogKeywordInput,
  CatalogKeywordRecord,
  CatalogMetadataSource,
  CatalogPersonInput,
  CatalogPersonRecord,
  InsertedMovieRecord,
  MovieCatalogMetadataInput,
  MoviePersonCreditInput,
  MoviePersonCreditRecord,
  MoviePersonRole,
  MovieRecord,
  MovieWatchProviderInput,
  WatchProviderAvailabilityType,
} from './db/types.js';

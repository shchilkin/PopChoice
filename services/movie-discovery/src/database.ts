export {
  initDatabase,
  closeDatabase,
  filterNewMovies,
  ensureSchema,
  getMovieCount,
  insertMovies,
  upsertMovieCatalogMetadata,
} from '@pop-choice/shared';
export type { MovieCatalogMetadataInput, MovieRecord } from '@pop-choice/shared';

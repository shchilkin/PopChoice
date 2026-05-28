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
  upsertMovieCatalogMetadata,
} from './db.js';
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
} from './db.js';
export { createEmbeddings } from './embeddings.js';
export {
  parsePositiveInt,
  parseNonNegativeInt,
  parsePositiveFloat,
  requireEnvVars,
} from './config.js';
export {
  operatorAuthChallenge,
  readOperatorAuthConfig,
  verifyOperatorBasicAuthHeader,
} from './operatorAuth.js';
export type { OperatorAuthConfig } from './operatorAuth.js';
export { readBackofficeRuntimeConfig, readBullBoardRuntimeConfig } from './runtimeConfig.js';
export type { BackofficeRuntimeConfig, BullBoardRuntimeConfig } from './runtimeConfig.js';
export { formatCatalogHealthReport, getCatalogHealthReport } from './catalogHealth.js';
export type {
  CatalogHealthIssue,
  CatalogHealthOptions,
  CatalogHealthReport,
  CatalogMovieSample,
  DuplicateIdentityGroup,
  DuplicateIdentityReport,
} from './catalogHealth.js';
export {
  ensureCatalogRepairActionSchema,
  getCatalogRepairMovieSnapshot,
  listCatalogRepairAudit,
  recordCatalogRepairAction,
} from './catalogRepairActions.js';
export type {
  CatalogRepairAction,
  CatalogRepairActionAudit,
  CatalogRepairMovieSnapshot,
  RecordCatalogRepairActionInput,
} from './catalogRepairActions.js';
export {
  applyTMDBMatchReviewAction,
  ensureTMDBMatchReviewActionSchema,
  getTMDBMatchReview,
  isTMDBMatchReviewReason,
  isTMDBMatchReviewSort,
  isTMDBMatchReviewStatus,
  listTMDBMatchReviewAudit,
  listTMDBMatchReviewPage,
  listTMDBMatchReviews,
} from './tmdbMatchReviews.js';
export type {
  ApplyTMDBMatchReviewActionInput,
  ListTMDBMatchReviewsOptions,
  TMDBMatchReview,
  TMDBMatchReviewAction,
  TMDBMatchReviewActionAudit,
  TMDBMatchReviewReason,
  TMDBMatchReviewSort,
  TMDBMatchReviewStatus,
  TMDBMatchReviewPage,
  TMDBReviewCandidate,
  TMDBReviewMovieSnapshot,
} from './tmdbMatchReviews.js';

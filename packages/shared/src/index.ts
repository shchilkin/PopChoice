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
export {
  formatCatalogHealthReport,
  getCatalogHealthReport,
  isCatalogHealthIssueResolvedForMovie,
  isCatalogHealthIssueKey,
  listCatalogHealthIssueMoviePage,
  MAX_CATALOG_HEALTH_ISSUE_OFFSET,
  MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE,
} from './catalogHealth.js';
export type {
  CatalogHealthIssueMoviePage,
  CatalogHealthIssue,
  CatalogHealthOptions,
  CatalogHealthReport,
  CatalogMovieSample,
  DuplicateIdentityGroup,
  DuplicateIdentityReport,
} from './catalogHealth.js';
export {
  CATALOG_REPAIR_BATCH_SCHEMA_SQL,
  catalogRepairCompletionStatusForResolution,
  createCatalogRepairBatch,
  createCatalogRepairBatchItem,
  ensureCatalogRepairActionSchema,
  getCatalogRepairBatchDetail,
  getCatalogRepairMovieSnapshot,
  listCatalogRepairBatchPage,
  listCatalogRepairAudit,
  listCatalogRepairAuditPage,
  recordCatalogRepairAction,
  refreshCatalogRepairBatchCounts,
  updateCatalogRepairBatchItemEnqueueResult,
  updateCatalogRepairBatchItemStatus,
} from './catalogRepairActions.js';
export type {
  CatalogRepairAction,
  CatalogRepairActionAudit,
  CatalogRepairActionAuditPage,
  CatalogRepairBatch,
  CatalogRepairBatchDetail,
  CatalogRepairBatchItem,
  CatalogRepairBatchItemPage,
  CatalogRepairBatchPage,
  CatalogRepairBatchStatus,
  CatalogRepairItemStatus,
  CatalogRepairMovieSnapshot,
  CreateCatalogRepairBatchInput,
  CreateCatalogRepairBatchItemInput,
  RecordCatalogRepairActionInput,
  UpdateCatalogRepairBatchItemEnqueueInput,
  UpdateCatalogRepairBatchItemStatusInput,
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
  MAX_TMDB_MATCH_REVIEW_OFFSET,
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

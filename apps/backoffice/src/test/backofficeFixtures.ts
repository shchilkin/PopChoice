import type {
  CatalogHealthIssue,
  CatalogMovieDetail,
  CatalogMovieDetailHealthFlag,
  CatalogMovieDetailPersonCredit,
  CatalogMovieDetailTaxonomyItem,
  CatalogMovieSample,
  CatalogRepairBatch,
  CatalogRepairBatchItem,
  TMDBMatchReview,
} from '@pop-choice/shared';

import type {
  CatalogMaintenanceQueueJobPage,
  CatalogMaintenanceQueueJobSummary,
  EnqueueCatalogBackfillMovieResult,
} from '../catalogMaintenanceQueue';

export function catalogMovieSample(
  overrides: Partial<CatalogMovieSample> = {},
): CatalogMovieSample {
  return {
    age_rating: 'PG',
    duration: 100,
    id: '42',
    localized_name: null,
    name: 'Heat',
    poster_url: null,
    tmdb_id: null,
    tmdb_matched_at: null,
    year: 1995,
    ...overrides,
  };
}

export function catalogMovieDetailHealthFlag(
  overrides: Partial<CatalogMovieDetailHealthFlag> = {},
): CatalogMovieDetailHealthFlag {
  return {
    isActive: true,
    key: 'missing_poster_url',
    label: 'Missing poster',
    ...overrides,
  };
}

export function catalogMovieDetailPersonCredit(
  overrides: Partial<CatalogMovieDetailPersonCredit> = {},
): CatalogMovieDetailPersonCredit {
  return {
    billingOrder: 1,
    characterName: 'Neil McCauley',
    department: null,
    id: 'credit-1',
    job: null,
    name: 'Robert De Niro',
    personId: 'person-1',
    popularity: 12,
    profilePath: null,
    rawMetadata: {},
    role: 'cast',
    tmdbCreditId: 'credit-tmdb-1',
    tmdbId: 380,
    ...overrides,
  };
}

export function catalogMovieDetailTaxonomyItem(
  overrides: Partial<CatalogMovieDetailTaxonomyItem> = {},
): CatalogMovieDetailTaxonomyItem {
  return {
    id: 'genre-1',
    name: 'Crime',
    rawMetadata: {},
    source: 'tmdb',
    tmdbId: 80,
    ...overrides,
  };
}

export function catalogMovieDetail(
  overrides: Partial<CatalogMovieDetail> = {},
): CatalogMovieDetail {
  return {
    cast: [catalogMovieDetailPersonCredit()],
    directors: [
      catalogMovieDetailPersonCredit({
        billingOrder: null,
        characterName: null,
        id: 'credit-director-1',
        job: 'Director',
        name: 'Michael Mann',
        personId: 'person-director-1',
        role: 'director',
        tmdbId: 638,
      }),
    ],
    duplicateContext: {
      normalizedTitleYearPeers: [],
      tmdbIdPeers: [],
    },
    genres: [catalogMovieDetailTaxonomyItem()],
    healthFlags: [catalogMovieDetailHealthFlag()],
    keywords: [catalogMovieDetailTaxonomyItem({ id: 'keyword-1', name: 'heist', tmdbId: 100 })],
    movie: {
      ageRating: 'R',
      description: 'A crew and a detective move through Los Angeles.',
      duration: 170,
      id: '42',
      localizedName: 'Fuego contra fuego',
      name: 'Heat',
      posterUrl: null,
      scoreRating: 8.3,
      tmdbId: 949,
      tmdbMatchConfidence: 0.92,
      tmdbMatchSource: 'manual_review',
      tmdbMatchedAt: '2026-06-02T12:00:00.000Z',
      tmdbMetadata: {},
      tmdbMetadataRefreshedAt: '2026-06-03T12:00:00.000Z',
      year: 1995,
    },
    relatedReviews: [],
    repairAudit: [],
    ...overrides,
  };
}

export function catalogHealthIssue(
  overrides: Partial<CatalogHealthIssue> = {},
): CatalogHealthIssue {
  return {
    count: 42,
    key: 'missing_poster_url',
    label: 'Missing poster_url',
    samples: [catalogMovieSample()],
    ...overrides,
  };
}

export function catalogRepairBatchItem(
  overrides: Partial<CatalogRepairBatchItem> = {},
): CatalogRepairBatchItem {
  return {
    batchId: 'batch-1',
    completedAt: null,
    createdAt: '2026-06-02T12:00:00.000Z',
    errorMessage: 'worker failed',
    id: 'item-1',
    issueKey: 'missing_poster_url',
    jobId: 'old-job',
    jobName: 'backfill-movie',
    language: 'en',
    movieId: '42',
    movieSnapshot: { ...catalogMovieSample({ id: '42', name: 'Heat' }) },
    queueName: 'catalog-maintenance',
    reason: 'missing_metadata',
    result: { status: 'failed' },
    status: 'failed',
    updatedAt: '2026-06-02T12:05:00.000Z',
    ...overrides,
  };
}

export function catalogRepairBatch(
  overrides: Partial<CatalogRepairBatch> = {},
): CatalogRepairBatch {
  return {
    action: 'bulk_enqueue_backfill',
    actor: 'operator@example.test',
    attemptedCount: 10,
    completedAt: null,
    completedCount: 3,
    createdAt: '2026-06-02T10:00:00.000Z',
    dedupedCount: 2,
    failedCount: 0,
    id: 'batch-1',
    issueKey: 'missing_poster_url',
    note: null,
    previousState: {},
    queuedCount: 4,
    requestedLimit: 10,
    result: {},
    skippedCount: 1,
    status: 'completed',
    targetId: 'missing_poster_url',
    targetType: 'catalog_issue',
    totalCandidates: 100,
    unavailableCount: 0,
    updatedAt: '2026-06-02T10:10:00.000Z',
    ...overrides,
  };
}

export function catalogBackfillQueueJob(
  overrides: Partial<EnqueueCatalogBackfillMovieResult> = {},
): EnqueueCatalogBackfillMovieResult {
  return {
    jobId: 'job-42',
    jobName: 'backfill-movie',
    language: 'en-US',
    queueName: 'catalog-maintenance',
    status: 'queued',
    ...overrides,
  };
}

export function catalogMaintenanceQueueJobSummary(
  overrides: Partial<CatalogMaintenanceQueueJobSummary> = {},
): CatalogMaintenanceQueueJobSummary {
  return {
    attemptsConfigured: 4,
    attemptsMade: 1,
    createdAt: '2026-06-02T12:00:00.000Z',
    failedReason: null,
    finishedAt: null,
    id: 'backfill-42',
    movieId: '42',
    name: 'backfill-movie',
    payload: [{ label: 'Movie', value: '42' }],
    processedAt: '2026-06-02T12:01:00.000Z',
    repairBatchId: null,
    repairBatchItemId: null,
    state: 'active',
    ...overrides,
  };
}

export function catalogMaintenanceQueueJobPage(
  overrides: Partial<CatalogMaintenanceQueueJobPage> = {},
): CatalogMaintenanceQueueJobPage {
  return {
    available: true,
    counts: {
      active: 0,
      completed: 10,
      delayed: 0,
      failed: 0,
      prioritized: 0,
      waiting: 0,
      waitingChildren: 0,
    },
    jobs: [],
    limit: 25,
    offset: 0,
    openJobs: 0,
    queueName: 'catalog-maintenance',
    state: 'waiting',
    totalCount: 0,
    updatedAt: '2026-06-02T12:00:00.000Z',
    ...overrides,
  };
}

export function tmdbMatchReview(overrides: Partial<TMDBMatchReview> = {}): TMDBMatchReview {
  return {
    candidates: [
      {
        confidence: 0.62,
        id: 42,
        originalTitle: 'Heat',
        raw: { id: 42, title: 'Heat' },
        releaseYear: 1994,
        title: 'Heat',
      },
      {
        confidence: 0.59,
        id: 43,
        originalTitle: 'Heat',
        raw: { id: 43, title: 'Heat' },
        releaseYear: 1995,
        title: 'Heat',
      },
    ],
    createdAt: '2026-06-02T12:00:00.000Z',
    currentMovie: {
      age_rating: 'R',
      duration: 170,
      id: '7',
      localized_name: null,
      name: 'Heat',
      poster_url: null,
      tmdb_id: 41,
      tmdb_match_confidence: 0.51,
      tmdb_match_source: 'candidate',
      tmdb_matched_at: '2026-06-01T12:00:00.000Z',
      year: 1995,
    },
    id: 'review-1',
    movieId: '7',
    movieName: 'Heat',
    movieYear: 1995,
    notes: 'Runtime differs from current TMDB match.',
    reason: 'runtime_mismatch',
    status: 'open',
    updatedAt: '2026-06-02T12:00:00.000Z',
    ...overrides,
  };
}

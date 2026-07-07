import { CATALOG_HEALTH_ISSUE_DEFINITIONS } from './catalogHealth.js';
import { getPool } from './db.js';
import {
  normalizeTMDBMatchReviewAudit,
  normalizeTMDBReviewCandidates,
} from './tmdbMatchReviews.js';
import type {
  CatalogRepairAction,
  CatalogRepairActionAudit,
  TMDBMatchReviewAction,
  TMDBMatchReviewActionAudit,
  TMDBMatchReviewReason,
  TMDBMatchReviewStatus,
  TMDBReviewCandidate,
} from './index.js';

export interface CatalogMovieDetailOptions {
  movieId: string | number;
  staleAfterDays?: number;
  duplicateLimit?: number;
  relatedReviewLimit?: number;
  repairAuditLimit?: number;
}

export interface CatalogMovieDetailMovie {
  id: string;
  name: string;
  year: number;
  ageRating: string;
  description: string;
  duration: number;
  scoreRating: number;
  tmdbId: number | null;
  posterUrl: string | null;
  localizedName: string | null;
  tmdbMatchConfidence: number | null;
  tmdbMatchSource: string | null;
  tmdbMatchedAt: string | null;
  tmdbMetadata: Record<string, unknown>;
  tmdbMetadataRefreshedAt: string | null;
}

export interface CatalogMovieDetailPersonCredit {
  id: string;
  personId: string;
  tmdbId: number | null;
  name: string;
  profilePath: string | null;
  popularity: number | null;
  rawMetadata: Record<string, unknown>;
  tmdbCreditId: string | null;
  role: 'cast' | 'director';
  characterName: string | null;
  job: string | null;
  department: string | null;
  billingOrder: number | null;
}

export interface CatalogMovieDetailTaxonomyItem {
  id: string;
  tmdbId: number | null;
  name: string;
  source: string;
  rawMetadata: Record<string, unknown>;
}

export interface CatalogMovieDetailHealthFlag {
  key: string;
  label: string;
  isActive: boolean;
}

export interface CatalogMovieDetailPeer {
  id: string;
  name: string;
  year: number;
  tmdbId: number | null;
}

export interface CatalogMovieDetailDuplicateContext {
  tmdbIdPeers: CatalogMovieDetailPeer[];
  normalizedTitleYearPeers: CatalogMovieDetailPeer[];
}

export interface CatalogMovieDetailTMDBReview {
  id: string;
  movieId: string;
  movieName: string;
  movieYear: number;
  reason: TMDBMatchReviewReason;
  status: TMDBMatchReviewStatus;
  candidates: TMDBReviewCandidate[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  audit: TMDBMatchReviewActionAudit[];
}

export interface CatalogMovieDetail {
  movie: CatalogMovieDetailMovie;
  healthFlags: CatalogMovieDetailHealthFlag[];
  cast: CatalogMovieDetailPersonCredit[];
  directors: CatalogMovieDetailPersonCredit[];
  genres: CatalogMovieDetailTaxonomyItem[];
  keywords: CatalogMovieDetailTaxonomyItem[];
  duplicateContext: CatalogMovieDetailDuplicateContext;
  relatedReviews: CatalogMovieDetailTMDBReview[];
  repairAudit: CatalogRepairActionAudit[];
}

export type CatalogMovieDetailResult =
  | { status: 'found'; detail: CatalogMovieDetail }
  | { status: 'not_found'; movieId: string };

type MovieRow = {
  id: string | number;
  name: string;
  year: string | number;
  age_rating: string;
  description: string;
  duration: string | number;
  score_rating: string | number;
  tmdb_id: string | number | null;
  poster_url: string | null;
  localized_name: string | null;
  tmdb_match_confidence: string | number | null;
  tmdb_match_source: string | null;
  tmdb_matched_at: string | null;
  tmdb_metadata: unknown;
  tmdb_metadata_refreshed_at: string | null;
};

type PersonCreditRow = {
  id: string | number;
  person_id: string | number;
  tmdb_id: string | number | null;
  name: string;
  profile_path: string | null;
  popularity: string | number | null;
  raw_metadata: unknown;
  tmdb_credit_id: string | null;
  role: 'cast' | 'director';
  character_name: string | null;
  job: string | null;
  department: string | null;
  billing_order: string | number | null;
};

type TaxonomyRow = {
  id: string | number;
  tmdb_id: string | number | null;
  name: string;
  source: string;
  raw_metadata: unknown;
};

type PeerRow = {
  id: string | number;
  name: string;
  year: string | number;
  tmdb_id: string | number | null;
};

type TMDBReviewRow = {
  id: string | number;
  movie_id: string | number;
  movie_name: string;
  movie_year: string | number;
  reason: TMDBMatchReviewReason;
  status: TMDBMatchReviewStatus;
  candidates: unknown;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type TMDBReviewAuditRow = {
  id: string | number;
  review_id: string | number;
  action: TMDBMatchReviewAction;
  actor: string;
  note: string | null;
  previous_status: TMDBMatchReviewStatus | null;
  new_status: TMDBMatchReviewStatus;
  candidate: unknown;
  created_at: string;
};

type RepairAuditRow = {
  id: string | number;
  action: CatalogRepairAction;
  actor: string;
  issue_key: string;
  target_type: string;
  target_id: string;
  note: string | null;
  previous_state: unknown;
  result: unknown;
  repair_batch_id: string | number | null;
  repair_batch_item_id: string | number | null;
  created_at: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function toNullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return toRecord(parsed);
    } catch {
      return {};
    }
  }

  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeMovie(row: MovieRow): CatalogMovieDetailMovie {
  return {
    id: String(row.id),
    name: row.name,
    year: toNumber(row.year),
    ageRating: row.age_rating,
    description: row.description,
    duration: toNumber(row.duration),
    scoreRating: toNumber(row.score_rating),
    tmdbId: toNullableNumber(row.tmdb_id),
    posterUrl: row.poster_url,
    localizedName: row.localized_name,
    tmdbMatchConfidence: toNullableNumber(row.tmdb_match_confidence),
    tmdbMatchSource: row.tmdb_match_source,
    tmdbMatchedAt: row.tmdb_matched_at,
    tmdbMetadata: toRecord(row.tmdb_metadata),
    tmdbMetadataRefreshedAt: row.tmdb_metadata_refreshed_at,
  };
}

function normalizePersonCredit(row: PersonCreditRow): CatalogMovieDetailPersonCredit {
  return {
    id: String(row.id),
    personId: String(row.person_id),
    tmdbId: toNullableNumber(row.tmdb_id),
    name: row.name,
    profilePath: row.profile_path,
    popularity: toNullableNumber(row.popularity),
    rawMetadata: toRecord(row.raw_metadata),
    tmdbCreditId: row.tmdb_credit_id,
    role: row.role,
    characterName: row.character_name,
    job: row.job,
    department: row.department,
    billingOrder: toNullableNumber(row.billing_order),
  };
}

function normalizeTaxonomy(row: TaxonomyRow): CatalogMovieDetailTaxonomyItem {
  return {
    id: String(row.id),
    tmdbId: toNullableNumber(row.tmdb_id),
    name: row.name,
    source: row.source,
    rawMetadata: toRecord(row.raw_metadata),
  };
}

function normalizePeer(row: PeerRow): CatalogMovieDetailPeer {
  return {
    id: String(row.id),
    name: row.name,
    year: toNumber(row.year),
    tmdbId: toNullableNumber(row.tmdb_id),
  };
}

function normalizeTMDBReview(row: TMDBReviewRow): Omit<CatalogMovieDetailTMDBReview, 'audit'> {
  return {
    id: String(row.id),
    movieId: String(row.movie_id),
    movieName: row.movie_name,
    movieYear: toNumber(row.movie_year),
    reason: row.reason,
    status: row.status,
    candidates: normalizeTMDBReviewCandidates(row.candidates),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeRepairAudit(row: RepairAuditRow): CatalogRepairActionAudit {
  return {
    id: String(row.id),
    action: row.action,
    actor: row.actor,
    issueKey: row.issue_key,
    targetType: row.target_type,
    targetId: row.target_id,
    note: row.note,
    previousState: toRecord(row.previous_state),
    result: toRecord(row.result),
    createdAt: row.created_at,
    repairBatchId: row.repair_batch_id === null ? null : String(row.repair_batch_id),
    repairBatchItemId: row.repair_batch_item_id === null ? null : String(row.repair_batch_item_id),
  };
}

function clampLimit(value: number | undefined, defaultValue: number, max: number): number {
  return Number.isSafeInteger(value) && value !== undefined && value > 0
    ? Math.min(value, max)
    : defaultValue;
}

async function getMovie(movieId: string): Promise<CatalogMovieDetailMovie | null> {
  const result = await getPool().query<MovieRow>(
    `SELECT
        id::text,
        name,
        year,
        age_rating,
        description,
        duration,
        score_rating,
        tmdb_id,
        poster_url,
        localized_name,
        tmdb_match_confidence,
        tmdb_match_source,
        tmdb_matched_at::text,
        tmdb_metadata,
        tmdb_metadata_refreshed_at::text
       FROM movies
      WHERE id = $1
      LIMIT 1`,
    [movieId],
  );

  return result.rows[0] ? normalizeMovie(result.rows[0]) : null;
}

async function getPeople(movieId: string): Promise<{
  cast: CatalogMovieDetailPersonCredit[];
  directors: CatalogMovieDetailPersonCredit[];
}> {
  const result = await getPool().query<PersonCreditRow>(
    `SELECT
        movie_people.id::text,
        movie_people.person_id::text,
        catalog_people.tmdb_id,
        catalog_people.name,
        catalog_people.profile_path,
        catalog_people.popularity,
        catalog_people.raw_metadata,
        movie_people.tmdb_credit_id,
        movie_people.role,
        movie_people.character_name,
        movie_people.job,
        movie_people.department,
        movie_people.billing_order
       FROM movie_people
       JOIN catalog_people ON catalog_people.id = movie_people.person_id
      WHERE movie_people.movie_id = $1
      ORDER BY
        CASE movie_people.role WHEN 'director' THEN 0 ELSE 1 END,
        movie_people.billing_order NULLS LAST,
        catalog_people.name`,
    [movieId],
  );
  const credits = result.rows.map(normalizePersonCredit);

  return {
    cast: credits.filter((credit) => credit.role === 'cast'),
    directors: credits.filter((credit) => credit.role === 'director'),
  };
}

async function getGenres(movieId: string): Promise<CatalogMovieDetailTaxonomyItem[]> {
  const result = await getPool().query<TaxonomyRow>(
    `SELECT
        catalog_genres.id::text,
        catalog_genres.tmdb_id,
        catalog_genres.name,
        movie_genres.source,
        catalog_genres.raw_metadata
       FROM movie_genres
       JOIN catalog_genres ON catalog_genres.id = movie_genres.genre_id
      WHERE movie_genres.movie_id = $1
      ORDER BY catalog_genres.name`,
    [movieId],
  );

  return result.rows.map(normalizeTaxonomy);
}

async function getKeywords(movieId: string): Promise<CatalogMovieDetailTaxonomyItem[]> {
  const result = await getPool().query<TaxonomyRow>(
    `SELECT
        catalog_keywords.id::text,
        catalog_keywords.tmdb_id,
        catalog_keywords.name,
        movie_keywords.source,
        catalog_keywords.raw_metadata
       FROM movie_keywords
       JOIN catalog_keywords ON catalog_keywords.id = movie_keywords.keyword_id
      WHERE movie_keywords.movie_id = $1
      ORDER BY catalog_keywords.name`,
    [movieId],
  );

  return result.rows.map(normalizeTaxonomy);
}

async function getHealthFlags(
  movieId: string,
  staleAfterDays: number,
): Promise<CatalogMovieDetailHealthFlag[]> {
  const selectList = CATALOG_HEALTH_ISSUE_DEFINITIONS.map(
    (issue) => `(${issue.where('$2')})::boolean AS ${issue.key}`,
  ).join(',\n        ');
  const result = await getPool().query<Record<string, boolean>>(
    `SELECT
        ${selectList}
       FROM movies
      WHERE id = $1`,
    [movieId, staleAfterDays],
  );
  const row = result.rows[0] ?? {};

  return CATALOG_HEALTH_ISSUE_DEFINITIONS.map((issue) => ({
    key: issue.key,
    label: issue.label,
    isActive: Boolean(row[issue.key]),
  }));
}

async function getDuplicateContext(
  movieId: string,
  limit: number,
): Promise<CatalogMovieDetailDuplicateContext> {
  const [tmdbResult, normalizedResult] = await Promise.all([
    getPool().query<PeerRow>(
      `SELECT id::text, name, year, tmdb_id
         FROM movies
        WHERE tmdb_id = (SELECT tmdb_id FROM movies WHERE id = $1)
          AND tmdb_id IS NOT NULL
          AND id <> $1
        ORDER BY id
        LIMIT $2`,
      [movieId, limit],
    ),
    getPool().query<PeerRow>(
      `WITH current_movie AS (
         SELECT
           id,
           year,
           concat(lower(regexp_replace(btrim(name), '[^[:alnum:]]+', '', 'g')), ':', year) AS identity_key
         FROM movies
         WHERE id = $1
       )
       SELECT movies.id::text, movies.name, movies.year, movies.tmdb_id
         FROM movies
         JOIN current_movie ON true
        WHERE movies.id <> current_movie.id
          AND current_movie.identity_key <> concat(':', current_movie.year)
          AND concat(lower(regexp_replace(btrim(movies.name), '[^[:alnum:]]+', '', 'g')), ':', movies.year) =
              current_movie.identity_key
        ORDER BY movies.id
        LIMIT $2`,
      [movieId, limit],
    ),
  ]);

  return {
    tmdbIdPeers: tmdbResult.rows.map(normalizePeer),
    normalizedTitleYearPeers: normalizedResult.rows.map(normalizePeer),
  };
}

async function getRelatedReviews(
  movieId: string,
  limit: number,
): Promise<CatalogMovieDetailTMDBReview[]> {
  const reviewResult = await getPool().query<TMDBReviewRow>(
    `SELECT
        id::text,
        movie_id::text,
        movie_name,
        movie_year,
        reason,
        status,
        candidates,
        notes,
        created_at::text,
        updated_at::text
       FROM tmdb_match_reviews
      WHERE movie_id = $1
      ORDER BY updated_at DESC, id DESC
      LIMIT $2`,
    [movieId, limit],
  );
  const reviews = reviewResult.rows.map(normalizeTMDBReview);
  if (reviews.length === 0) return [];

  const reviewIds = reviews.map((review) => review.id);
  const auditResult = await getPool().query<TMDBReviewAuditRow>(
    `SELECT
        id::text,
        review_id::text,
        action,
        actor,
        note,
        previous_status,
        new_status,
        candidate,
        created_at::text
       FROM tmdb_match_review_audit
      WHERE review_id = ANY($1::bigint[])
      ORDER BY created_at DESC, id DESC`,
    [reviewIds],
  );
  const auditByReviewId = new Map<string, TMDBMatchReviewActionAudit[]>();
  for (const row of auditResult.rows) {
    const reviewId = String(row.review_id);
    const audit = auditByReviewId.get(reviewId) ?? [];
    audit.push(normalizeTMDBMatchReviewAudit(row));
    auditByReviewId.set(reviewId, audit);
  }

  return reviews.map((review) => ({
    ...review,
    audit: auditByReviewId.get(review.id) ?? [],
  }));
}

async function getRepairAudit(movieId: string, limit: number): Promise<CatalogRepairActionAudit[]> {
  const result = await getPool().query<RepairAuditRow>(
    `SELECT
        id::text,
        action,
        actor,
        issue_key,
        target_type,
        target_id,
        note,
        previous_state,
        result,
        repair_batch_id::text,
        repair_batch_item_id::text,
        created_at::text
       FROM catalog_repair_audit
      WHERE target_type = 'movie'
        AND target_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2`,
    [movieId, limit],
  );

  return result.rows.map(normalizeRepairAudit);
}

export async function getCatalogMovieDetail(
  options: CatalogMovieDetailOptions,
): Promise<CatalogMovieDetailResult> {
  const movieId = String(options.movieId);
  const staleAfterDays = clampLimit(options.staleAfterDays, 180, 3650);
  const duplicateLimit = clampLimit(options.duplicateLimit, 10, 50);
  const relatedReviewLimit = clampLimit(options.relatedReviewLimit, 25, 100);
  const repairAuditLimit = clampLimit(options.repairAuditLimit, 25, 100);
  const movie = await getMovie(movieId);

  if (!movie) {
    return { status: 'not_found', movieId };
  }

  const [people, genres, keywords, healthFlags, duplicateContext, relatedReviews, repairAudit] =
    await Promise.all([
      getPeople(movieId),
      getGenres(movieId),
      getKeywords(movieId),
      getHealthFlags(movieId, staleAfterDays),
      getDuplicateContext(movieId, duplicateLimit),
      getRelatedReviews(movieId, relatedReviewLimit),
      getRepairAudit(movieId, repairAuditLimit),
    ]);

  return {
    status: 'found',
    detail: {
      movie,
      healthFlags,
      cast: people.cast,
      directors: people.directors,
      genres,
      keywords,
      duplicateContext,
      relatedReviews,
      repairAudit,
    },
  };
}

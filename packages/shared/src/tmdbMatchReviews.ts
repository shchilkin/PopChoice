import { getPool } from './db.js';

export type TMDBMatchReviewReason = 'ambiguous_match' | 'runtime_mismatch';
export type TMDBMatchReviewStatus = 'open' | 'resolved' | 'ignored' | 'deferred';
export type TMDBMatchReviewSort = 'newest' | 'oldest' | 'highest_risk';
export type TMDBMatchReviewAction = 'apply_candidate' | 'reject' | 'defer' | 'reopen';

export interface TMDBReviewCandidate {
  id: number | null;
  title: string;
  originalTitle: string | null;
  releaseYear: number | null;
  confidence: number | null;
  raw: Record<string, unknown>;
}

export interface TMDBReviewMovieSnapshot {
  id: string;
  name: string;
  year: number;
  duration: number;
  age_rating: string;
  tmdb_id: number | null;
  poster_url: string | null;
  localized_name: string | null;
  tmdb_match_confidence: number | null;
  tmdb_match_source: string | null;
  tmdb_matched_at: string | null;
}

export interface TMDBMatchReview {
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
  currentMovie: TMDBReviewMovieSnapshot | null;
}

export interface TMDBMatchReviewActionAudit {
  id: string;
  action: TMDBMatchReviewAction;
  actor: string;
  note: string | null;
  previousStatus: TMDBMatchReviewStatus | null;
  newStatus: TMDBMatchReviewStatus;
  candidate: TMDBReviewCandidate | null;
  createdAt: string;
}

export interface ListTMDBMatchReviewsOptions {
  status?: TMDBMatchReviewStatus | 'all';
  reason?: TMDBMatchReviewReason | 'all';
  sort?: TMDBMatchReviewSort;
  limit?: number;
  offset?: number;
}

export interface TMDBMatchReviewPage {
  reviews: TMDBMatchReview[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface ApplyTMDBMatchReviewActionInput {
  reviewId: string;
  action: TMDBMatchReviewAction;
  actor: string;
  candidateId?: number;
  note?: string;
}

type TMDBMatchReviewRow = {
  id: string;
  movie_id: string;
  movie_name: string;
  movie_year: number;
  reason: TMDBMatchReviewReason;
  status: TMDBMatchReviewStatus;
  candidates: unknown;
  notes: string | null;
  created_at: string;
  updated_at: string;
  current_movie: TMDBReviewMovieSnapshot | null;
};

type TMDBMatchReviewAuditRow = {
  id: string;
  action: TMDBMatchReviewAction;
  actor: string;
  note: string | null;
  previous_status: TMDBMatchReviewStatus | null;
  new_status: TMDBMatchReviewStatus;
  candidate: unknown;
  created_at: string;
};

const VALID_STATUSES: readonly TMDBMatchReviewStatus[] = [
  'open',
  'resolved',
  'ignored',
  'deferred',
];
const VALID_REASONS: readonly TMDBMatchReviewReason[] = ['ambiguous_match', 'runtime_mismatch'];
const VALID_SORTS: readonly TMDBMatchReviewSort[] = ['newest', 'oldest', 'highest_risk'];

function reviewActionError(message: string, statusCode = 400): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

export function isTMDBMatchReviewStatus(value: string): value is TMDBMatchReviewStatus {
  return VALID_STATUSES.includes(value as TMDBMatchReviewStatus);
}

export function isTMDBMatchReviewReason(value: string): value is TMDBMatchReviewReason {
  return VALID_REASONS.includes(value as TMDBMatchReviewReason);
}

export function isTMDBMatchReviewSort(value: string): value is TMDBMatchReviewSort {
  return VALID_SORTS.includes(value as TMDBMatchReviewSort);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function parseCandidates(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeCandidate(candidate: unknown): TMDBReviewCandidate {
  const raw =
    typeof candidate === 'object' && candidate !== null
      ? (candidate as Record<string, unknown>)
      : { value: candidate };

  return {
    id: toNumber(raw.id),
    title: toStringOrNull(raw.title) ?? '(untitled candidate)',
    originalTitle: toStringOrNull(raw.originalTitle),
    releaseYear: toNumber(raw.releaseYear),
    confidence: toNumber(raw.confidence),
    raw,
  };
}

function normalizeReview(row: TMDBMatchReviewRow): TMDBMatchReview {
  return {
    id: String(row.id),
    movieId: String(row.movie_id),
    movieName: row.movie_name,
    movieYear: Number(row.movie_year),
    reason: row.reason,
    status: row.status,
    candidates: parseCandidates(row.candidates).map(normalizeCandidate),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentMovie: row.current_movie
      ? {
          ...row.current_movie,
          id: String(row.current_movie.id),
          year: Number(row.current_movie.year),
          duration: Number(row.current_movie.duration),
          tmdb_id: row.current_movie.tmdb_id === null ? null : Number(row.current_movie.tmdb_id),
          tmdb_match_confidence:
            row.current_movie.tmdb_match_confidence === null
              ? null
              : Number(row.current_movie.tmdb_match_confidence),
        }
      : null,
  };
}

function normalizeAudit(row: TMDBMatchReviewAuditRow): TMDBMatchReviewActionAudit {
  return {
    id: String(row.id),
    action: row.action,
    actor: row.actor,
    note: row.note,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    candidate: row.candidate ? normalizeCandidate(row.candidate) : null,
    createdAt: row.created_at,
  };
}

function buildReviewSelectClause(): string {
  return `
    SELECT
      reviews.id::text,
      reviews.movie_id::text,
      reviews.movie_name,
      reviews.movie_year,
      reviews.reason,
      reviews.status,
      reviews.candidates,
      reviews.notes,
      reviews.created_at::text,
      reviews.updated_at::text,
      CASE WHEN movies.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', movies.id::text,
        'name', movies.name,
        'year', movies.year,
        'duration', movies.duration,
        'age_rating', movies.age_rating,
        'tmdb_id', movies.tmdb_id,
        'poster_url', movies.poster_url,
        'localized_name', movies.localized_name,
        'tmdb_match_confidence', movies.tmdb_match_confidence,
        'tmdb_match_source', movies.tmdb_match_source,
        'tmdb_matched_at', movies.tmdb_matched_at::text
      ) END AS current_movie
    FROM tmdb_match_reviews reviews
    LEFT JOIN movies ON movies.id = reviews.movie_id
  `;
}

export async function ensureTMDBMatchReviewActionSchema(): Promise<void> {
  await getPool().query(`
    ALTER TABLE tmdb_match_reviews
      DROP CONSTRAINT IF EXISTS tmdb_match_reviews_status_check;

    ALTER TABLE tmdb_match_reviews
      ADD CONSTRAINT tmdb_match_reviews_status_check CHECK (
        status IN ('open', 'resolved', 'ignored', 'deferred')
      );

    CREATE TABLE IF NOT EXISTS tmdb_match_review_audit (
      id bigserial PRIMARY KEY,
      review_id bigint NOT NULL REFERENCES tmdb_match_reviews(id) ON DELETE CASCADE,
      action text NOT NULL,
      actor text NOT NULL,
      note text,
      previous_status text,
      new_status text NOT NULL,
      candidate jsonb,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tmdb_match_review_audit_action_check CHECK (
        action IN ('apply_candidate', 'reject', 'defer', 'reopen')
      ),
      CONSTRAINT tmdb_match_review_audit_status_check CHECK (
        new_status IN ('open', 'resolved', 'ignored', 'deferred')
        AND (previous_status IS NULL OR previous_status IN ('open', 'resolved', 'ignored', 'deferred'))
      )
    );

    CREATE INDEX IF NOT EXISTS idx_tmdb_match_review_audit_review_created_at
      ON tmdb_match_review_audit (review_id, created_at DESC);
  `);
}

export async function listTMDBMatchReviews(
  options: ListTMDBMatchReviewsOptions = {},
): Promise<TMDBMatchReview[]> {
  const page = await listTMDBMatchReviewPage(options);
  return page.reviews;
}

export async function listTMDBMatchReviewPage(
  options: ListTMDBMatchReviewsOptions = {},
): Promise<TMDBMatchReviewPage> {
  const status = options.status ?? 'open';
  const reason = options.reason ?? 'all';
  const sort = options.sort ?? 'highest_risk';
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const offset = Math.min(Math.max(options.offset ?? 0, 0), 100_000);
  const where: string[] = [];
  const params: unknown[] = [];

  if (status !== 'all') {
    params.push(status);
    where.push(`reviews.status = $${params.length}`);
  }

  if (reason !== 'all') {
    params.push(reason);
    where.push(`reviews.reason = $${params.length}`);
  }

  const orderBy =
    sort === 'oldest'
      ? 'reviews.updated_at ASC, reviews.id ASC'
      : sort === 'newest'
        ? 'reviews.updated_at DESC, reviews.id DESC'
        : `CASE reviews.reason WHEN 'runtime_mismatch' THEN 0 ELSE 1 END,
           jsonb_array_length(COALESCE(reviews.candidates, '[]'::jsonb)) DESC,
           reviews.updated_at ASC,
           reviews.id ASC`;

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const countResult = await getPool().query<{ total_count: number | string }>(
    `SELECT COUNT(*)::int AS total_count
       FROM tmdb_match_reviews reviews
      ${whereClause}`,
    params,
  );

  const pageParams = [...params, limit, offset];
  const result = await getPool().query<TMDBMatchReviewRow>(
    `${buildReviewSelectClause()}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${pageParams.length - 1}
      OFFSET $${pageParams.length}`,
    pageParams,
  );

  return {
    reviews: result.rows.map(normalizeReview),
    totalCount: Number(countResult.rows[0]?.total_count ?? 0),
    limit,
    offset,
  };
}

export async function getTMDBMatchReview(reviewId: string): Promise<TMDBMatchReview | null> {
  const result = await getPool().query<TMDBMatchReviewRow>(
    `${buildReviewSelectClause()}
      WHERE reviews.id = $1
      LIMIT 1`,
    [reviewId],
  );

  return result.rows[0] ? normalizeReview(result.rows[0]) : null;
}

export async function listTMDBMatchReviewAudit(
  reviewId: string,
): Promise<TMDBMatchReviewActionAudit[]> {
  const result = await getPool().query<TMDBMatchReviewAuditRow>(
    `SELECT
       id::text,
       action,
       actor,
       note,
       previous_status,
       new_status,
       candidate,
       created_at::text
     FROM tmdb_match_review_audit
     WHERE review_id = $1
     ORDER BY created_at DESC, id DESC`,
    [reviewId],
  );

  return result.rows.map(normalizeAudit);
}

export async function applyTMDBMatchReviewAction(
  input: ApplyTMDBMatchReviewActionInput,
): Promise<TMDBMatchReview> {
  await ensureTMDBMatchReviewActionSchema();

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const reviewResult = await client.query<TMDBMatchReviewRow>(
      `${buildReviewSelectClause()}
        WHERE reviews.id = $1
        FOR UPDATE OF reviews`,
      [input.reviewId],
    );
    const review = reviewResult.rows[0] ? normalizeReview(reviewResult.rows[0]) : null;
    if (!review) {
      throw reviewActionError(`TMDB match review ${input.reviewId} was not found.`, 404);
    }

    if (review.status === 'resolved') {
      throw reviewActionError(`TMDB match review ${review.id} is already resolved.`, 409);
    }

    let newStatus: TMDBMatchReviewStatus;
    let candidate: TMDBReviewCandidate | null = null;
    const metadata: Record<string, unknown> = {
      movieId: review.movieId,
      movieName: review.movieName,
      movieYear: review.movieYear,
      previousMovie: review.currentMovie,
    };

    if (input.action === 'apply_candidate') {
      if (!input.candidateId) {
        throw reviewActionError('Applying a TMDB review requires a candidate id.');
      }

      candidate = review.candidates.find((item) => item.id === input.candidateId) ?? null;
      if (!candidate || candidate.id === null) {
        throw reviewActionError(
          `Candidate ${input.candidateId} was not found on review ${review.id}.`,
        );
      }

      const duplicateResult = await client.query<{ id: string; name: string; year: number }>(
        `SELECT id::text, name, year
           FROM movies
          WHERE tmdb_id = $1
            AND id <> $2
          LIMIT 1`,
        [candidate.id, review.movieId],
      );
      const duplicate = duplicateResult.rows[0];
      if (duplicate) {
        throw reviewActionError(
          `TMDB id ${candidate.id} is already assigned to ${duplicate.name} (${duplicate.year}) [movie ${duplicate.id}].`,
          409,
        );
      }

      await client.query(
        `UPDATE movies
            SET tmdb_id = $1,
                tmdb_match_confidence = $2,
                tmdb_match_source = 'manual',
                tmdb_matched_at = now(),
                localized_name = COALESCE(NULLIF(localized_name, ''), $3)
          WHERE id = $4`,
        [candidate.id, candidate.confidence, candidate.title, review.movieId],
      );
      metadata.appliedCandidateId = candidate.id;
      newStatus = 'resolved';
    } else if (input.action === 'reject') {
      newStatus = 'ignored';
    } else if (input.action === 'defer') {
      newStatus = 'deferred';
    } else {
      newStatus = 'open';
    }

    await client.query(
      `UPDATE tmdb_match_reviews
          SET status = $1,
              updated_at = now()
        WHERE id = $2`,
      [newStatus, review.id],
    );

    await client.query(
      `INSERT INTO tmdb_match_review_audit (
         review_id,
         action,
         actor,
         note,
         previous_status,
         new_status,
         candidate,
         metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
      [
        review.id,
        input.action,
        input.actor,
        input.note?.trim() || null,
        review.status,
        newStatus,
        candidate ? JSON.stringify(candidate.raw) : null,
        JSON.stringify(metadata),
      ],
    );

    await client.query('COMMIT');
    const updated = await getTMDBMatchReview(review.id);
    if (!updated) throw new Error(`TMDB match review ${review.id} disappeared after update.`);
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

import { getPool } from './db.js';
import { CATALOG_DUPLICATE_MERGE_AUDIT_SCHEMA_SQL } from './catalogDuplicateMergeSchema.js';

export { CATALOG_DUPLICATE_MERGE_AUDIT_SCHEMA_SQL } from './catalogDuplicateMergeSchema.js';

type CatalogDuplicateMergeQueryable = {
  query<T = any>(
    sql: string,
    values?: unknown[],
  ): Promise<{
    rows: T[];
    rowCount?: number | null;
  }>;
};

export type CatalogDuplicateMergeIdentityKind =
  | 'confirmed_tmdb_duplicate'
  | 'candidate_normalized_title_year'
  | 'manual_review_required';

export interface CatalogDuplicateMergeMovieSnapshot {
  id: string;
  name: string;
  year: number;
  tmdb_id: number | null;
  poster_url: string | null;
  localized_name: string | null;
  duration: number;
  age_rating: string;
  tmdb_match_confidence: number | null;
  tmdb_match_source: string | null;
  tmdb_matched_at: string | null;
  tmdb_metadata_refreshed_at: string | null;
  identityKey: string | null;
  normalizedTitleYearKey: string | null;
}

export interface CatalogDuplicateMergeAffectedRows {
  recommendationRows: {
    recommendationMovies: number;
  };
  metadataRows: {
    moviePeople: number;
    movieGenres: number;
    movieKeywords: number;
  };
  reviewRows: {
    tmdbMatchReviews: number;
  };
  userMemoryRows: {
    userMovieInteractions: number;
  };
}

export interface CatalogDuplicateMergeUserMemoryConflict {
  userId: string;
  canonicalInteractionCount: number;
  loserInteractionCount: number;
  interactions: Array<{
    side: 'canonical' | 'loser';
    movieKey: string;
    kind: string;
    tmdbId: number | null;
    movieName: string;
    movieYear: number | null;
    updatedAt: string;
  }>;
}

export interface CatalogDuplicateMergeDryRun {
  generatedAt: string;
  identityKind: CatalogDuplicateMergeIdentityKind;
  canonical: CatalogDuplicateMergeMovieSnapshot;
  losers: CatalogDuplicateMergeMovieSnapshot[];
  affectedRows: CatalogDuplicateMergeAffectedRows;
  userMemoryConflicts: {
    totalCount: number;
    samples: CatalogDuplicateMergeUserMemoryConflict[];
  };
  warnings: string[];
}

export interface ApplyCatalogDuplicateMergeInput {
  canonicalMovieId: string | number;
  loserMovieIds: Array<string | number>;
  actor: string;
  note?: string | null;
  allowManualReviewRequired?: boolean;
  simulateFailureAfterMutation?: boolean;
}

export interface CatalogDuplicateMergeResult {
  auditId: string;
  canonicalMovieId: string;
  loserMovieIds: string[];
  previousState: CatalogDuplicateMergeDryRun;
  rewiredRows: {
    recommendationMovies: number;
    moviePeople: number;
    movieGenres: number;
    movieKeywords: number;
    tmdbMatchReviews: number;
    catalogRepairBatchItems: number;
    userMovieInteractions: number;
  };
  deletedLoserMovieRows: number;
  preservedReviewRows: number;
}

interface CatalogDuplicateMergeMovieRow {
  id: string;
  name: string;
  year: number | string;
  tmdb_id: number | string | null;
  poster_url: string | null;
  localized_name: string | null;
  duration: number | string;
  age_rating: string;
  tmdb_match_confidence: number | string | null;
  tmdb_match_source: string | null;
  tmdb_matched_at: string | null;
  tmdb_metadata_refreshed_at: string | null;
}

interface AffectedRowsRow {
  recommendation_movies: number | string;
  movie_people: number | string;
  movie_genres: number | string;
  movie_keywords: number | string;
  tmdb_match_reviews: number | string;
  user_movie_interactions: number | string;
}

interface UserMemoryConflictRow {
  user_id: string;
  canonical_count: number | string;
  loser_count: number | string;
  interactions: string | CatalogDuplicateMergeUserMemoryConflict['interactions'];
  total_conflicts: number | string;
}

interface DuplicateMergeAuditRow {
  id: string;
}

interface DeletedReviewRow {
  id: string;
  movie_id: string;
  movie_name: string;
  movie_year: number | string;
  reason: string;
  status: string;
  candidates: unknown;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function parsePositiveMovieId(value: string | number, label: string): string {
  const parsed = typeof value === 'string' ? Number(value.trim()) : value;
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer movie id.`);
  }
  return String(parsed);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function buildMovieMemoryKeys(movies: CatalogDuplicateMergeMovieSnapshot[]): string[] {
  return uniqueStrings(
    movies.flatMap((movie) =>
      [movie.identityKey, movie.normalizedTitleYearKey].filter(
        (key): key is string => key !== null,
      ),
    ),
  );
}

function buildMovieMemoryTmdbIds(movies: CatalogDuplicateMergeMovieSnapshot[]): string[] {
  return uniqueStrings(
    movies
      .map((movie) => movie.tmdb_id)
      .filter((tmdbId): tmdbId is number => tmdbId !== null)
      .map(String),
  );
}

function normalizeMovieTitle(title: string): string {
  return title
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/^(the|a|an)\s+/, '')
    .replace(/\s+/g, ' ');
}

function getTitleYearKey(name: string, year: number): string | null {
  const normalized = normalizeMovieTitle(name);
  return normalized.length > 0 ? `title:${normalized}:${year}` : null;
}

function getIdentityKey(row: CatalogDuplicateMergeMovieRow): string | null {
  const tmdbId = row.tmdb_id === null ? null : Number(row.tmdb_id);
  if (tmdbId !== null && Number.isFinite(tmdbId) && tmdbId > 0) {
    return `tmdb:${Math.trunc(tmdbId)}`;
  }

  return getTitleYearKey(row.name, Number(row.year));
}

function normalizeMovie(row: CatalogDuplicateMergeMovieRow): CatalogDuplicateMergeMovieSnapshot {
  const year = Number(row.year);

  return {
    id: String(row.id),
    name: row.name,
    year,
    tmdb_id: row.tmdb_id === null ? null : Number(row.tmdb_id),
    poster_url: row.poster_url,
    localized_name: row.localized_name,
    duration: Number(row.duration),
    age_rating: row.age_rating,
    tmdb_match_confidence:
      row.tmdb_match_confidence === null ? null : Number(row.tmdb_match_confidence),
    tmdb_match_source: row.tmdb_match_source,
    tmdb_matched_at: row.tmdb_matched_at,
    tmdb_metadata_refreshed_at: row.tmdb_metadata_refreshed_at,
    identityKey: getIdentityKey(row),
    normalizedTitleYearKey: getTitleYearKey(row.name, year),
  };
}

function parseJsonArray<T>(value: string | T[] | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function classifyIdentity(
  movies: CatalogDuplicateMergeMovieSnapshot[],
): CatalogDuplicateMergeIdentityKind {
  const tmdbIds = new Set(
    movies
      .map((movie) => movie.tmdb_id)
      .filter((tmdbId): tmdbId is number => tmdbId !== null && Number.isFinite(tmdbId)),
  );
  if (tmdbIds.size === 1 && movies.every((movie) => movie.tmdb_id !== null)) {
    return 'confirmed_tmdb_duplicate';
  }

  const titleYearKeys = movies.map((movie) => movie.normalizedTitleYearKey);
  if (titleYearKeys.every((key) => key !== null) && new Set(titleYearKeys).size === 1) {
    return 'candidate_normalized_title_year';
  }

  return 'manual_review_required';
}

function buildWarnings(
  identityKind: CatalogDuplicateMergeIdentityKind,
  movies: CatalogDuplicateMergeMovieSnapshot[],
  userMemoryConflictCount: number,
): string[] {
  const warnings: string[] = [];
  const tmdbIds = new Set(
    movies
      .map((movie) => movie.tmdb_id)
      .filter((tmdbId): tmdbId is number => tmdbId !== null && Number.isFinite(tmdbId)),
  );

  if (identityKind === 'candidate_normalized_title_year') {
    warnings.push('Normalized title/year groups are candidate duplicates, not proof of identity.');
  }
  if (identityKind === 'manual_review_required') {
    warnings.push('Selected movies do not share one TMDB id or normalized title/year key.');
  }
  if (tmdbIds.size > 1) {
    warnings.push(
      'Selected movies include multiple TMDB ids; merge requires explicit operator review.',
    );
  }
  if (movies[0]?.tmdb_id === null && movies.some((movie) => movie.tmdb_id !== null)) {
    warnings.push('Canonical movie has no TMDB id while at least one loser does.');
  }
  if (userMemoryConflictCount > 0) {
    warnings.push(
      'User movie memory has conflicting rows that a transactional merge must coalesce.',
    );
  }

  return warnings;
}

function normalizeAffectedRows(
  row: AffectedRowsRow | undefined,
): CatalogDuplicateMergeAffectedRows {
  return {
    recommendationRows: {
      recommendationMovies: toNumber(row?.recommendation_movies),
    },
    metadataRows: {
      moviePeople: toNumber(row?.movie_people),
      movieGenres: toNumber(row?.movie_genres),
      movieKeywords: toNumber(row?.movie_keywords),
    },
    reviewRows: {
      tmdbMatchReviews: toNumber(row?.tmdb_match_reviews),
    },
    userMemoryRows: {
      userMovieInteractions: toNumber(row?.user_movie_interactions),
    },
  };
}

function getFinalCanonicalIdentityKey(
  canonical: CatalogDuplicateMergeMovieSnapshot,
  losers: CatalogDuplicateMergeMovieSnapshot[],
): string | null {
  const tmdbIds = buildMovieMemoryTmdbIds([canonical, ...losers]);
  if (canonical.tmdb_id !== null) return `tmdb:${canonical.tmdb_id}`;
  if (tmdbIds.length === 1) {
    return `tmdb:${tmdbIds[0]}`;
  }

  if (canonical.identityKey) return canonical.identityKey;
  return canonical.normalizedTitleYearKey;
}

function pickCanonicalTmdbIdForMerge(
  canonical: CatalogDuplicateMergeMovieSnapshot,
  losers: CatalogDuplicateMergeMovieSnapshot[],
): number | null {
  if (canonical.tmdb_id !== null) return canonical.tmdb_id;

  const tmdbIds = buildMovieMemoryTmdbIds([canonical, ...losers]);
  if (tmdbIds.length !== 1) return null;
  return Number(tmdbIds[0]);
}

function getFirstNonEmptyString(values: Array<string | null>): string | null {
  const value = values.find((item) => typeof item === 'string' && item.trim().length > 0);
  return value ?? null;
}

function getBestNumericValue(values: Array<number | null | undefined>): number | null {
  const value = values.find(
    (item) => typeof item === 'number' && Number.isFinite(item) && item > 0,
  );
  return value ?? null;
}

function getBestAgeRating(values: string[]): string | null {
  const value = values.find((item) => item.trim().length > 0 && item !== 'NR');
  return value ?? null;
}

function getRowCount(result: { rowCount?: number | null }): number {
  return typeof result.rowCount === 'number' ? result.rowCount : 0;
}

function normalizeUserMemoryConflict(
  row: UserMemoryConflictRow,
): CatalogDuplicateMergeUserMemoryConflict {
  return {
    userId: String(row.user_id),
    canonicalInteractionCount: toNumber(row.canonical_count),
    loserInteractionCount: toNumber(row.loser_count),
    interactions: parseJsonArray<CatalogDuplicateMergeUserMemoryConflict['interactions'][number]>(
      row.interactions,
    ),
  };
}

export async function ensureCatalogDuplicateMergeAuditSchema(): Promise<void> {
  await getPool().query(CATALOG_DUPLICATE_MERGE_AUDIT_SCHEMA_SQL);
}

async function buildCatalogDuplicateMergeDryRun(
  queryable: CatalogDuplicateMergeQueryable,
  {
    canonicalMovieId,
    loserMovieIds,
    conflictSampleLimit = 20,
    lockMovieRows = false,
  }: {
    canonicalMovieId: string | number;
    loserMovieIds: Array<string | number>;
    conflictSampleLimit?: number;
    lockMovieRows?: boolean;
  },
): Promise<CatalogDuplicateMergeDryRun> {
  const canonicalId = parsePositiveMovieId(canonicalMovieId, 'canonicalMovieId');
  const losers = uniqueStrings(
    loserMovieIds.map((movieId) => parsePositiveMovieId(movieId, 'loserMovieIds')),
  );

  if (losers.length === 0) {
    throw new Error('At least one loser movie id is required.');
  }
  if (losers.includes(canonicalId)) {
    throw new Error('canonicalMovieId cannot also be a loser movie id.');
  }

  const orderedIds = [canonicalId, ...losers];
  const movieResult = await queryable.query<CatalogDuplicateMergeMovieRow>(
    `SELECT
       id::text,
       name,
       year,
       tmdb_id,
       poster_url,
       localized_name,
       duration,
       age_rating,
       tmdb_match_confidence,
       tmdb_match_source,
       tmdb_matched_at::text,
       tmdb_metadata_refreshed_at::text
     FROM movies
     WHERE id = ANY($1::bigint[])
     ORDER BY array_position($1::bigint[], id)
     ${lockMovieRows ? 'FOR UPDATE' : ''}`,
    [orderedIds],
  );

  const movies = movieResult.rows.map(normalizeMovie);
  const foundIds = new Set(movies.map((movie) => movie.id));
  const missingIds = orderedIds.filter((movieId) => !foundIds.has(movieId));
  if (missingIds.length > 0) {
    throw new Error(`Selected movie ids were not found: ${missingIds.join(', ')}`);
  }

  const canonical = movies[0];
  const loserMovies = movies.slice(1);
  const allIdentityKeys = buildMovieMemoryKeys(movies);
  const canonicalIdentityKeys = buildMovieMemoryKeys([canonical]);
  const loserIdentityKeys = buildMovieMemoryKeys(loserMovies);
  const allTmdbIds = buildMovieMemoryTmdbIds(movies);
  const canonicalTmdbIds = buildMovieMemoryTmdbIds([canonical]);
  const loserTmdbIds = buildMovieMemoryTmdbIds(loserMovies);
  const boundedConflictLimit =
    Number.isSafeInteger(conflictSampleLimit) && conflictSampleLimit > 0
      ? Math.min(conflictSampleLimit, 100)
      : 20;

  const [affectedRowsResult, userMemoryConflictsResult] = await Promise.all([
    queryable.query<AffectedRowsRow>(
      `SELECT
         (SELECT COUNT(*)::int FROM recommendation_movies WHERE movie_id = ANY($1::bigint[])) AS recommendation_movies,
         (SELECT COUNT(*)::int FROM movie_people WHERE movie_id = ANY($1::bigint[])) AS movie_people,
         (SELECT COUNT(*)::int FROM movie_genres WHERE movie_id = ANY($1::bigint[])) AS movie_genres,
         (SELECT COUNT(*)::int FROM movie_keywords WHERE movie_id = ANY($1::bigint[])) AS movie_keywords,
         (SELECT COUNT(*)::int FROM tmdb_match_reviews WHERE movie_id = ANY($1::bigint[])) AS tmdb_match_reviews,
         (SELECT COUNT(*)::int
            FROM user_movie_interactions
           WHERE movie_key = ANY($2::text[])
              OR (tmdb_id IS NOT NULL AND tmdb_id = ANY($3::bigint[]))) AS user_movie_interactions`,
      // User memory is keyed by identity rather than a loser-only FK, so count
      // every canonical and loser row the transactional merge must coalesce.
      [losers, allIdentityKeys, allTmdbIds],
    ),
    queryable.query<UserMemoryConflictRow>(
      `WITH matching_interactions AS (
         SELECT
           user_id::text,
           movie_key,
           kind,
           tmdb_id,
           movie_name,
           movie_year,
           updated_at::text,
           CASE
             WHEN movie_key = ANY($1::text[])
             THEN 'canonical'
             WHEN movie_key = ANY($2::text[])
             THEN 'loser'
             WHEN tmdb_id IS NOT NULL
               AND tmdb_id = ANY($3::bigint[])
               AND NOT (tmdb_id = ANY($4::bigint[]))
             THEN 'canonical'
             WHEN tmdb_id IS NOT NULL
               AND tmdb_id = ANY($4::bigint[])
               AND NOT (tmdb_id = ANY($3::bigint[]))
             THEN 'loser'
             ELSE 'loser'
           END AS side
         FROM user_movie_interactions
         WHERE movie_key = ANY($5::text[])
            OR (tmdb_id IS NOT NULL AND tmdb_id = ANY($6::bigint[]))
       ),
       conflict_users AS (
         SELECT
           user_id,
           COUNT(*) FILTER (WHERE side = 'canonical')::int AS canonical_count,
           COUNT(*) FILTER (WHERE side = 'loser')::int AS loser_count
         FROM matching_interactions
         GROUP BY user_id
         HAVING COUNT(*) FILTER (WHERE side = 'canonical') > 0
            AND COUNT(*) FILTER (WHERE side = 'loser') > 0
       )
       SELECT
         cu.user_id,
         cu.canonical_count,
         cu.loser_count,
         json_agg(
           json_build_object(
             'side', mi.side,
             'movieKey', mi.movie_key,
             'kind', mi.kind,
             'tmdbId', mi.tmdb_id,
             'movieName', mi.movie_name,
             'movieYear', mi.movie_year,
             'updatedAt', mi.updated_at
           )
           ORDER BY mi.updated_at DESC, mi.movie_key
         ) AS interactions,
         COUNT(*) OVER()::int AS total_conflicts
       FROM conflict_users cu
       JOIN matching_interactions mi ON mi.user_id = cu.user_id
       GROUP BY cu.user_id, cu.canonical_count, cu.loser_count
       ORDER BY cu.user_id
       LIMIT $7`,
      [
        canonicalIdentityKeys,
        loserIdentityKeys,
        canonicalTmdbIds,
        loserTmdbIds,
        allIdentityKeys,
        allTmdbIds,
        boundedConflictLimit,
      ],
    ),
  ]);

  const userMemoryConflicts = userMemoryConflictsResult.rows.map(normalizeUserMemoryConflict);
  const totalUserMemoryConflicts = toNumber(userMemoryConflictsResult.rows[0]?.total_conflicts);
  const identityKind = classifyIdentity(movies);

  return {
    generatedAt: new Date().toISOString(),
    identityKind,
    canonical,
    losers: loserMovies,
    affectedRows: normalizeAffectedRows(affectedRowsResult.rows[0]),
    userMemoryConflicts: {
      totalCount: totalUserMemoryConflicts,
      samples: userMemoryConflicts,
    },
    warnings: buildWarnings(identityKind, movies, totalUserMemoryConflicts),
  };
}

export async function getCatalogDuplicateMergeDryRun({
  canonicalMovieId,
  loserMovieIds,
  conflictSampleLimit = 20,
}: {
  canonicalMovieId: string | number;
  loserMovieIds: Array<string | number>;
  conflictSampleLimit?: number;
}): Promise<CatalogDuplicateMergeDryRun> {
  return buildCatalogDuplicateMergeDryRun(getPool(), {
    canonicalMovieId,
    loserMovieIds,
    conflictSampleLimit,
  });
}

export async function applyCatalogDuplicateMovieMerge(
  input: ApplyCatalogDuplicateMergeInput,
): Promise<CatalogDuplicateMergeResult> {
  await ensureCatalogDuplicateMergeAuditSchema();

  const actor = input.actor.trim();
  if (!actor) {
    throw new Error('actor is required for duplicate movie merges.');
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const previousState = await buildCatalogDuplicateMergeDryRun(client, {
      canonicalMovieId: input.canonicalMovieId,
      loserMovieIds: input.loserMovieIds,
      lockMovieRows: true,
    });

    if (
      previousState.identityKind === 'manual_review_required' &&
      !input.allowManualReviewRequired
    ) {
      throw new Error(
        'Selected movies do not share one TMDB id or normalized title/year key. Pass allowManualReviewRequired to merge after explicit operator review.',
      );
    }

    const canonical = previousState.canonical;
    const losers = previousState.losers;
    const loserIds = losers.map((movie) => movie.id);
    const finalMovieKey = getFinalCanonicalIdentityKey(canonical, losers);
    if (!finalMovieKey) {
      throw new Error('Unable to derive a stable movie-memory key for the canonical movie.');
    }

    const finalTmdbId = pickCanonicalTmdbIdForMerge(canonical, losers);
    const finalPosterUrl =
      canonical.poster_url ?? getFirstNonEmptyString(losers.map((movie) => movie.poster_url));
    const finalLocalizedName =
      canonical.localized_name ??
      getFirstNonEmptyString(losers.map((movie) => movie.localized_name));
    const finalDuration =
      canonical.duration > 0
        ? canonical.duration
        : getBestNumericValue(losers.map((movie) => movie.duration));
    const finalAgeRating =
      canonical.age_rating !== 'NR'
        ? canonical.age_rating
        : getBestAgeRating(losers.map((movie) => movie.age_rating));
    const allIdentityKeys = buildMovieMemoryKeys([canonical, ...losers]);
    const allTmdbIds = buildMovieMemoryTmdbIds([canonical, ...losers]);

    const recommendationResult = await client.query(
      `UPDATE recommendation_movies
          SET movie_id = $1
        WHERE movie_id = ANY($2::bigint[])`,
      [canonical.id, loserIds],
    );

    const peopleInsertResult = await client.query(
      `INSERT INTO movie_people (
         movie_id,
         person_id,
         tmdb_credit_id,
         role,
         character_name,
         job,
         department,
         billing_order,
         raw_metadata,
         created_at,
         updated_at
       )
       SELECT
         $1::bigint,
         loser_people.person_id,
         loser_people.tmdb_credit_id,
         loser_people.role,
         loser_people.character_name,
         loser_people.job,
         loser_people.department,
         loser_people.billing_order,
         loser_people.raw_metadata,
         loser_people.created_at,
         now()
       FROM movie_people loser_people
       WHERE loser_people.movie_id = ANY($2::bigint[])
         AND NOT EXISTS (
           SELECT 1
             FROM movie_people canonical_people
            WHERE canonical_people.movie_id = $1::bigint
              AND canonical_people.person_id = loser_people.person_id
              AND canonical_people.role = loser_people.role
              AND COALESCE(canonical_people.tmdb_credit_id, '') = COALESCE(loser_people.tmdb_credit_id, '')
              AND COALESCE(canonical_people.character_name, '') = COALESCE(loser_people.character_name, '')
              AND COALESCE(canonical_people.job, '') = COALESCE(loser_people.job, '')
         )
       ON CONFLICT (movie_id, tmdb_credit_id) WHERE tmdb_credit_id IS NOT NULL DO NOTHING`,
      [canonical.id, loserIds],
    );
    await client.query(`DELETE FROM movie_people WHERE movie_id = ANY($1::bigint[])`, [loserIds]);

    const genreInsertResult = await client.query(
      `INSERT INTO movie_genres (movie_id, genre_id, source, created_at)
       SELECT $1::bigint, genre_id, source, MIN(created_at)
         FROM movie_genres
        WHERE movie_id = ANY($2::bigint[])
        GROUP BY genre_id, source
       ON CONFLICT (movie_id, genre_id) DO NOTHING`,
      [canonical.id, loserIds],
    );
    await client.query(`DELETE FROM movie_genres WHERE movie_id = ANY($1::bigint[])`, [loserIds]);

    const keywordInsertResult = await client.query(
      `INSERT INTO movie_keywords (movie_id, keyword_id, source, created_at)
       SELECT $1::bigint, keyword_id, source, MIN(created_at)
         FROM movie_keywords
        WHERE movie_id = ANY($2::bigint[])
        GROUP BY keyword_id, source
       ON CONFLICT (movie_id, keyword_id) DO NOTHING`,
      [canonical.id, loserIds],
    );
    await client.query(`DELETE FROM movie_keywords WHERE movie_id = ANY($1::bigint[])`, [loserIds]);

    const movedReviewResult = await client.query(
      `UPDATE tmdb_match_reviews loser_reviews
          SET movie_id = $1,
              updated_at = now()
        WHERE loser_reviews.movie_id = ANY($2::bigint[])
          AND NOT EXISTS (
            SELECT 1
              FROM tmdb_match_reviews canonical_reviews
             WHERE canonical_reviews.movie_id = $1
               AND canonical_reviews.reason = loser_reviews.reason
          )`,
      [canonical.id, loserIds],
    );
    const deletedReviewResult = await client.query<DeletedReviewRow>(
      `DELETE FROM tmdb_match_reviews loser_reviews
        WHERE loser_reviews.movie_id = ANY($1::bigint[])
        RETURNING
          id::text,
          movie_id::text,
          movie_name,
          movie_year,
          reason,
          status,
          candidates,
          notes,
          created_at::text,
          updated_at::text`,
      [loserIds],
    );

    const repairItemResult = await client.query(
      `UPDATE catalog_repair_batch_items
          SET movie_id = $1,
              updated_at = now(),
              result = result || jsonb_build_object('duplicateMergeCanonicalMovieId', $1::bigint)
        WHERE movie_id = ANY($2::bigint[])`,
      [canonical.id, loserIds],
    );

    await client.query(
      `UPDATE movies
          SET tmdb_id = NULL
        WHERE id = ANY($1::bigint[])
          AND tmdb_id IS NOT NULL`,
      [loserIds],
    );

    await client.query(
      `UPDATE movies
          SET tmdb_id = COALESCE(tmdb_id, $2::bigint),
              poster_url = COALESCE(NULLIF(poster_url, ''), $3),
              localized_name = COALESCE(NULLIF(localized_name, ''), $4),
              duration = CASE WHEN duration > 0 THEN duration ELSE COALESCE($5::integer, duration) END,
              age_rating = CASE WHEN age_rating <> 'NR' THEN age_rating ELSE COALESCE($6, age_rating) END,
              tmdb_metadata_refreshed_at = (
                SELECT MAX(value)
                  FROM unnest(ARRAY[
                    tmdb_metadata_refreshed_at,
                    ${losers.map((_, index) => `$${index + 7}::timestamptz`).join(', ')}
                  ]) AS value
              )
        WHERE id = $1`,
      [
        canonical.id,
        finalTmdbId,
        finalPosterUrl,
        finalLocalizedName,
        finalDuration,
        finalAgeRating,
        ...losers.map((movie) => movie.tmdb_metadata_refreshed_at),
      ],
    );

    const userMemoryResult = await client.query(
      `WITH candidates AS (
         SELECT
           *,
           ROW_NUMBER() OVER (
             PARTITION BY user_id
             ORDER BY
               CASE kind
                 WHEN 'not_interested' THEN 5
                 WHEN 'wrong_mood' THEN 4
                 WHEN 'liked' THEN 3
                 WHEN 'watched' THEN 2
                 WHEN 'not_seen' THEN 1
                 ELSE 0
               END DESC,
               updated_at DESC,
               created_at DESC,
               id DESC
           ) AS preference_rank
         FROM user_movie_interactions
         WHERE movie_key = ANY($1::text[])
            OR (tmdb_id IS NOT NULL AND tmdb_id = ANY($2::bigint[]))
       ),
       deleted AS (
         DELETE FROM user_movie_interactions existing
         USING candidates
         WHERE existing.id = candidates.id
         RETURNING existing.id
       )
       INSERT INTO user_movie_interactions (
         user_id,
         movie_key,
         tmdb_id,
         movie_name,
         movie_year,
         poster_url,
         localized_name,
         kind,
         source_recommendation_id,
         created_at,
         updated_at
       )
       SELECT
         user_id,
         $3,
         $4::bigint,
         $5,
         $6::integer,
         COALESCE($7, poster_url),
         COALESCE($8, localized_name),
         kind,
         source_recommendation_id,
         created_at,
         now()
       FROM candidates
       WHERE preference_rank = 1
       ON CONFLICT (user_id, movie_key)
       DO UPDATE SET
         tmdb_id = COALESCE(EXCLUDED.tmdb_id, user_movie_interactions.tmdb_id),
         movie_name = EXCLUDED.movie_name,
         movie_year = EXCLUDED.movie_year,
         poster_url = COALESCE(EXCLUDED.poster_url, user_movie_interactions.poster_url),
         localized_name = COALESCE(EXCLUDED.localized_name, user_movie_interactions.localized_name),
         kind = EXCLUDED.kind,
         source_recommendation_id = COALESCE(
           EXCLUDED.source_recommendation_id,
           user_movie_interactions.source_recommendation_id
         ),
         updated_at = now()`,
      [
        allIdentityKeys,
        allTmdbIds,
        finalMovieKey,
        finalTmdbId,
        canonical.name,
        canonical.year,
        finalPosterUrl,
        finalLocalizedName,
      ],
    );

    if (input.simulateFailureAfterMutation) {
      throw new Error('Simulated duplicate movie merge failure.');
    }

    const deleteLoserMovieResult = await client.query(
      `DELETE FROM movies
        WHERE id = ANY($1::bigint[])`,
      [loserIds],
    );

    const rewiredRows = {
      recommendationMovies: getRowCount(recommendationResult),
      moviePeople: getRowCount(peopleInsertResult),
      movieGenres: getRowCount(genreInsertResult),
      movieKeywords: getRowCount(keywordInsertResult),
      tmdbMatchReviews: getRowCount(movedReviewResult),
      catalogRepairBatchItems: getRowCount(repairItemResult),
      userMovieInteractions: getRowCount(userMemoryResult),
    };

    const resultWithoutAuditId = {
      canonicalMovieId: canonical.id,
      loserMovieIds: loserIds,
      rewiredRows,
      deletedLoserMovieRows: getRowCount(deleteLoserMovieResult),
      preservedReviewRows: deletedReviewResult.rows.length,
      finalMovieKey,
      finalTmdbId,
    };
    const auditResult = await client.query<DuplicateMergeAuditRow>(
      `INSERT INTO catalog_duplicate_merge_audit (
         action,
         actor,
         canonical_movie_id,
         loser_movie_ids,
         previous_state,
         result,
         note
       )
       VALUES ('merge_movies', $1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6)
       RETURNING id::text`,
      [
        actor,
        canonical.id,
        JSON.stringify(loserIds),
        JSON.stringify({
          ...previousState,
          preservedTmdbMatchReviews: deletedReviewResult.rows,
        }),
        JSON.stringify(resultWithoutAuditId),
        input.note?.trim() || null,
      ],
    );
    const auditId = auditResult.rows[0]?.id;
    if (!auditId) {
      throw new Error('Failed to write duplicate movie merge audit row.');
    }

    await client.query('COMMIT');

    return {
      auditId,
      previousState,
      ...resultWithoutAuditId,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

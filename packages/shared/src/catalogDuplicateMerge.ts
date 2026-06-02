import { getPool } from './db.js';
import { CATALOG_DUPLICATE_MERGE_AUDIT_SCHEMA_SQL } from './catalogDuplicateMergeSchema.js';

export { CATALOG_DUPLICATE_MERGE_AUDIT_SCHEMA_SQL } from './catalogDuplicateMergeSchema.js';

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

export async function getCatalogDuplicateMergeDryRun({
  canonicalMovieId,
  loserMovieIds,
  conflictSampleLimit = 20,
}: {
  canonicalMovieId: string | number;
  loserMovieIds: Array<string | number>;
  conflictSampleLimit?: number;
}): Promise<CatalogDuplicateMergeDryRun> {
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
  const movieResult = await getPool().query<CatalogDuplicateMergeMovieRow>(
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
     ORDER BY array_position($1::bigint[], id)`,
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
  const allTmdbIds = uniqueStrings(
    movies
      .map((movie) => movie.tmdb_id)
      .filter((tmdbId): tmdbId is number => tmdbId !== null)
      .map(String),
  );
  const canonicalTmdbIds = uniqueStrings(
    [canonical.tmdb_id].filter((tmdbId): tmdbId is number => tmdbId !== null).map(String),
  );
  const loserTmdbIds = uniqueStrings(
    loserMovies
      .map((movie) => movie.tmdb_id)
      .filter((tmdbId): tmdbId is number => tmdbId !== null)
      .map(String),
  );
  const boundedConflictLimit =
    Number.isSafeInteger(conflictSampleLimit) && conflictSampleLimit > 0
      ? Math.min(conflictSampleLimit, 100)
      : 20;

  const [affectedRowsResult, userMemoryConflictsResult] = await Promise.all([
    getPool().query<AffectedRowsRow>(
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
    getPool().query<UserMemoryConflictRow>(
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

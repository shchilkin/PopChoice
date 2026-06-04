import { getPool } from './db.js';

export interface CatalogHealthOptions {
  sampleLimit: number;
  staleAfterDays: number;
}

export interface CatalogMovieSample {
  id: string;
  name: string;
  year: number;
  tmdb_id: number | null;
  poster_url: string | null;
  localized_name: string | null;
  duration: number;
  age_rating: string;
  tmdb_matched_at: string | null;
}

export interface CatalogHealthIssue {
  key: string;
  label: string;
  count: number;
  samples: CatalogMovieSample[];
}

export interface DuplicateIdentityGroup {
  identityKey: string;
  count: number;
  movies: Pick<CatalogMovieSample, 'id' | 'name' | 'year' | 'tmdb_id'>[];
}

export interface DuplicateIdentityReport {
  totalGroups: number;
  groups: DuplicateIdentityGroup[];
}

export interface CatalogHealthReport {
  generatedAt: string;
  staleAfterDays: number;
  totalMovies: number;
  issues: CatalogHealthIssue[];
  duplicateTmdbIds: DuplicateIdentityReport;
  duplicateNormalizedTitleYears: DuplicateIdentityReport;
}

export interface CatalogHealthIssueMoviePage {
  issueKey: string;
  label: string;
  totalCount: number;
  limit: number;
  offset: number;
  movies: CatalogMovieSample[];
}

interface SummaryRow {
  total_movies: number;
  missing_poster_url: number;
  missing_localized_name: number;
  missing_tmdb_id: number;
  missing_runtime: number;
  missing_age_rating: number;
  missing_tmdb_matched_at: number;
  stale_tmdb_metadata: number;
  missing_original_language: number;
  missing_vote_count: number;
  missing_popularity: number;
  low_metadata_quality: number;
  missing_watch_provider_us: number;
  missing_watch_provider_fi: number;
  missing_watch_provider_ru: number;
  missing_cast_metadata: number;
  missing_director_metadata: number;
  missing_genre_metadata: number;
  missing_keyword_metadata: number;
}

type SummaryMetricKey = keyof SummaryRow;

const SUMMARY_METRIC_KEYS: SummaryMetricKey[] = [
  'total_movies',
  'missing_poster_url',
  'missing_localized_name',
  'missing_tmdb_id',
  'missing_runtime',
  'missing_age_rating',
  'missing_tmdb_matched_at',
  'stale_tmdb_metadata',
  'missing_original_language',
  'missing_vote_count',
  'missing_popularity',
  'low_metadata_quality',
  'missing_watch_provider_us',
  'missing_watch_provider_fi',
  'missing_watch_provider_ru',
  'missing_cast_metadata',
  'missing_director_metadata',
  'missing_genre_metadata',
  'missing_keyword_metadata',
];

const SUMMARY_SQL = `SELECT
    COUNT(*)::int AS total_movies,
    COUNT(*) FILTER (WHERE poster_url IS NULL OR btrim(poster_url) = '')::int AS missing_poster_url,
    COUNT(*) FILTER (WHERE localized_name IS NULL OR btrim(localized_name) = '')::int AS missing_localized_name,
    COUNT(*) FILTER (WHERE tmdb_id IS NULL)::int AS missing_tmdb_id,
    COUNT(*) FILTER (WHERE duration <= 0)::int AS missing_runtime,
    COUNT(*) FILTER (WHERE age_rating IS NULL OR btrim(age_rating) = '')::int AS missing_age_rating,
    COUNT(*) FILTER (WHERE tmdb_id IS NOT NULL AND tmdb_matched_at IS NULL)::int AS missing_tmdb_matched_at,
    COUNT(*) FILTER (
      WHERE tmdb_id IS NOT NULL
        AND (
          tmdb_metadata_refreshed_at IS NULL
          OR tmdb_metadata_refreshed_at < now() - ($1::int * interval '1 day')
        )
    )::int AS stale_tmdb_metadata,
    COUNT(*) FILTER (WHERE tmdb_id IS NOT NULL AND (original_language IS NULL OR btrim(original_language) = ''))::int AS missing_original_language,
    COUNT(*) FILTER (WHERE tmdb_id IS NOT NULL AND (vote_count IS NULL OR vote_count <= 0))::int AS missing_vote_count,
    COUNT(*) FILTER (WHERE tmdb_id IS NOT NULL AND (popularity IS NULL OR popularity <= 0))::int AS missing_popularity,
    COUNT(*) FILTER (WHERE tmdb_id IS NOT NULL AND metadata_quality_score < 70)::int AS low_metadata_quality,
    COUNT(*) FILTER (
      WHERE tmdb_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM movie_watch_providers WHERE movie_watch_providers.movie_id = movies.id AND region = 'US'
        )
    )::int AS missing_watch_provider_us,
    COUNT(*) FILTER (
      WHERE tmdb_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM movie_watch_providers WHERE movie_watch_providers.movie_id = movies.id AND region = 'FI'
        )
    )::int AS missing_watch_provider_fi,
    COUNT(*) FILTER (
      WHERE tmdb_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM movie_watch_providers WHERE movie_watch_providers.movie_id = movies.id AND region = 'RU'
        )
    )::int AS missing_watch_provider_ru,
    COUNT(*) FILTER (
      WHERE tmdb_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM movie_people WHERE movie_people.movie_id = movies.id AND role = 'cast'
        )
    )::int AS missing_cast_metadata,
    COUNT(*) FILTER (
      WHERE tmdb_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM movie_people WHERE movie_people.movie_id = movies.id AND role = 'director'
        )
    )::int AS missing_director_metadata,
    COUNT(*) FILTER (
      WHERE tmdb_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM movie_genres WHERE movie_genres.movie_id = movies.id
        )
    )::int AS missing_genre_metadata,
    COUNT(*) FILTER (
      WHERE tmdb_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM movie_keywords WHERE movie_keywords.movie_id = movies.id
        )
    )::int AS missing_keyword_metadata
   FROM movies`;

export interface CatalogHealthIssueDefinition {
  key: keyof Omit<SummaryRow, 'total_movies'>;
  label: string;
  where: (staleAfterDaysParam: string) => string;
}

export const CATALOG_HEALTH_ISSUE_DEFINITIONS: CatalogHealthIssueDefinition[] = [
  {
    key: 'missing_poster_url',
    label: 'Missing poster_url',
    where: () => "poster_url IS NULL OR btrim(poster_url) = ''",
  },
  {
    key: 'missing_localized_name',
    label: 'Missing localized_name',
    where: () => "localized_name IS NULL OR btrim(localized_name) = ''",
  },
  {
    key: 'missing_tmdb_id',
    label: 'Missing tmdb_id',
    where: () => 'tmdb_id IS NULL',
  },
  {
    key: 'missing_runtime',
    label: 'Missing runtime',
    where: () => 'duration <= 0',
  },
  {
    key: 'missing_age_rating',
    label: 'Missing age_rating',
    where: () => "age_rating IS NULL OR btrim(age_rating) = ''",
  },
  {
    key: 'missing_tmdb_matched_at',
    label: 'TMDB-backed rows missing tmdb_matched_at',
    where: () => 'tmdb_id IS NOT NULL AND tmdb_matched_at IS NULL',
  },
  {
    key: 'stale_tmdb_metadata',
    label: 'Stale TMDB metadata',
    where: (staleAfterDaysParam) =>
      `tmdb_id IS NOT NULL AND (
      tmdb_metadata_refreshed_at IS NULL
      OR tmdb_metadata_refreshed_at < now() - (${staleAfterDaysParam}::int * interval '1 day')
    )`,
  },
  {
    key: 'missing_original_language',
    label: 'Missing original_language',
    where: () =>
      "tmdb_id IS NOT NULL AND (original_language IS NULL OR btrim(original_language) = '')",
  },
  {
    key: 'missing_vote_count',
    label: 'Missing vote_count',
    where: () => 'tmdb_id IS NOT NULL AND (vote_count IS NULL OR vote_count <= 0)',
  },
  {
    key: 'missing_popularity',
    label: 'Missing popularity',
    where: () => 'tmdb_id IS NOT NULL AND (popularity IS NULL OR popularity <= 0)',
  },
  {
    key: 'low_metadata_quality',
    label: 'Low metadata quality',
    where: () => 'tmdb_id IS NOT NULL AND metadata_quality_score < 70',
  },
  {
    key: 'missing_watch_provider_us',
    label: 'Missing US watch providers',
    where: () => `tmdb_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM movie_watch_providers WHERE movie_watch_providers.movie_id = movies.id AND region = 'US'
    )`,
  },
  {
    key: 'missing_watch_provider_fi',
    label: 'Missing FI watch providers',
    where: () => `tmdb_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM movie_watch_providers WHERE movie_watch_providers.movie_id = movies.id AND region = 'FI'
    )`,
  },
  {
    key: 'missing_watch_provider_ru',
    label: 'Missing RU watch providers',
    where: () => `tmdb_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM movie_watch_providers WHERE movie_watch_providers.movie_id = movies.id AND region = 'RU'
    )`,
  },
  {
    key: 'missing_cast_metadata',
    label: 'Missing cast metadata',
    where: () => `tmdb_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM movie_people WHERE movie_people.movie_id = movies.id AND role = 'cast'
    )`,
  },
  {
    key: 'missing_director_metadata',
    label: 'Missing director metadata',
    where: () => `tmdb_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM movie_people WHERE movie_people.movie_id = movies.id AND role = 'director'
    )`,
  },
  {
    key: 'missing_genre_metadata',
    label: 'Missing genre metadata',
    where: () => `tmdb_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM movie_genres WHERE movie_genres.movie_id = movies.id
    )`,
  },
  {
    key: 'missing_keyword_metadata',
    label: 'Missing keyword metadata',
    where: () => `tmdb_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM movie_keywords WHERE movie_keywords.movie_id = movies.id
    )`,
  },
];

export const MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE = 100;
export const MAX_CATALOG_HEALTH_ISSUE_OFFSET = 100_000;

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function normalizeSummaryRow(
  row: Partial<Record<SummaryMetricKey, number | string | null | undefined>> | undefined,
): SummaryRow {
  return Object.fromEntries(
    SUMMARY_METRIC_KEYS.map((key) => [key, toNumber(row?.[key])]),
  ) as unknown as SummaryRow;
}

function normalizeSample(row: CatalogMovieSample): CatalogMovieSample {
  return {
    id: String(row.id),
    name: row.name,
    year: Number(row.year),
    tmdb_id: row.tmdb_id === null ? null : Number(row.tmdb_id),
    poster_url: row.poster_url,
    localized_name: row.localized_name,
    duration: Number(row.duration),
    age_rating: row.age_rating,
    tmdb_matched_at: row.tmdb_matched_at,
  };
}

function clampLimit(limit: number): number {
  return Number.isSafeInteger(limit) && limit > 0
    ? Math.min(limit, MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE)
    : MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE;
}

function clampOffset(offset: number): number {
  return Number.isSafeInteger(offset) && offset > 0
    ? Math.min(offset, MAX_CATALOG_HEALTH_ISSUE_OFFSET)
    : 0;
}

function getIssueDefinition(issueKey: string): CatalogHealthIssueDefinition | null {
  return CATALOG_HEALTH_ISSUE_DEFINITIONS.find((issue) => issue.key === issueKey) ?? null;
}

export function isCatalogHealthIssueKey(issueKey: string): boolean {
  return getIssueDefinition(issueKey) !== null;
}

export async function isCatalogHealthIssueResolvedForMovie({
  issueKey,
  movieId,
  staleAfterDays,
}: {
  issueKey: string;
  movieId: string | number;
  staleAfterDays: number;
}): Promise<boolean> {
  const issue = getIssueDefinition(issueKey);
  if (!issue) {
    throw new Error(`Unsupported catalog-health issue "${issueKey}".`);
  }

  const params = issue.key === 'stale_tmdb_metadata' ? [staleAfterDays, movieId] : [movieId];
  const movieIdParam = issue.key === 'stale_tmdb_metadata' ? '$2' : '$1';
  const result = await getPool().query<{ issue_exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM movies
        WHERE id = ${movieIdParam}
          AND (${issue.where('$1')})
     ) AS issue_exists`,
    params,
  );

  return !Boolean(result.rows[0]?.issue_exists);
}

export async function listCatalogHealthIssueMoviePage({
  issueKey,
  limit,
  offset,
  staleAfterDays,
}: {
  issueKey: string;
  limit: number;
  offset: number;
  staleAfterDays: number;
}): Promise<CatalogHealthIssueMoviePage> {
  const issue = getIssueDefinition(issueKey);
  if (!issue) {
    throw new Error(`Unsupported catalog-health issue "${issueKey}".`);
  }

  const boundedLimit = clampLimit(limit);
  const boundedOffset = clampOffset(offset);
  const countParams = issue.key === 'stale_tmdb_metadata' ? [staleAfterDays] : [];
  const pageParams =
    issue.key === 'stale_tmdb_metadata'
      ? [staleAfterDays, boundedLimit, boundedOffset]
      : [boundedLimit, boundedOffset];
  const limitParam = issue.key === 'stale_tmdb_metadata' ? '$2' : '$1';
  const offsetParam = issue.key === 'stale_tmdb_metadata' ? '$3' : '$2';

  const [countResult, pageResult] = await Promise.all([
    getPool().query<{ count: number | string }>(
      `SELECT COUNT(*)::int AS count
         FROM movies
        WHERE ${issue.where('$1')}`,
      countParams,
    ),
    getPool().query<CatalogMovieSample>(
      `SELECT id::text, name, year, tmdb_id, poster_url, localized_name, duration, age_rating, tmdb_matched_at::text
         FROM movies
        WHERE ${issue.where('$1')}
        ORDER BY id
        LIMIT ${limitParam}
        OFFSET ${offsetParam}`,
      pageParams,
    ),
  ]);

  return {
    issueKey,
    label: issue.label,
    totalCount: toNumber(countResult.rows[0]?.count),
    limit: boundedLimit,
    offset: boundedOffset,
    movies: pageResult.rows.map(normalizeSample),
  };
}

function parseMovies(
  movies: string | Pick<CatalogMovieSample, 'id' | 'name' | 'year' | 'tmdb_id'>[],
): Pick<CatalogMovieSample, 'id' | 'name' | 'year' | 'tmdb_id'>[] {
  const parsed = (typeof movies === 'string' ? JSON.parse(movies) : movies) as Pick<
    CatalogMovieSample,
    'id' | 'name' | 'year' | 'tmdb_id'
  >[];
  return parsed.map((movie) => ({
    id: String(movie.id),
    name: movie.name,
    year: Number(movie.year),
    tmdb_id: movie.tmdb_id === null ? null : Number(movie.tmdb_id),
  }));
}

async function getIssueSamples(
  issue: CatalogHealthIssueDefinition,
  options: CatalogHealthOptions,
): Promise<CatalogMovieSample[]> {
  const params =
    issue.key === 'stale_tmdb_metadata'
      ? [options.staleAfterDays, options.sampleLimit]
      : [options.sampleLimit];
  const limitParam = issue.key === 'stale_tmdb_metadata' ? '$2' : '$1';
  const result = await getPool().query<CatalogMovieSample>(
    `SELECT id::text, name, year, tmdb_id, poster_url, localized_name, duration, age_rating, tmdb_matched_at::text
       FROM movies
      WHERE ${issue.where('$1')}
      ORDER BY id
      LIMIT ${limitParam}`,
    params,
  );

  return result.rows.map(normalizeSample);
}

async function getSummary(staleAfterDays: number): Promise<SummaryRow> {
  const result = await getPool().query<SummaryRow>(SUMMARY_SQL, [staleAfterDays]);
  return normalizeSummaryRow(result.rows[0]);
}

async function getDuplicateTmdbIds(limit: number): Promise<DuplicateIdentityReport> {
  const result = await getPool().query<{
    identity_key: string;
    duplicate_count: number | string;
    total_groups: number | string;
    movies: string | Pick<CatalogMovieSample, 'id' | 'name' | 'year' | 'tmdb_id'>[];
  }>(
    `WITH ranked_movies AS (
        SELECT
          id,
          name,
          year,
          tmdb_id,
          tmdb_id::text AS identity_key,
          COUNT(*) OVER (PARTITION BY tmdb_id)::int AS duplicate_count,
          ROW_NUMBER() OVER (PARTITION BY tmdb_id ORDER BY id)::int AS sample_rank
        FROM movies
        WHERE tmdb_id IS NOT NULL
      ),
      duplicate_groups AS (
        SELECT
          identity_key,
          MAX(duplicate_count)::int AS duplicate_count,
          json_agg(
            json_build_object('id', id::text, 'name', name, 'year', year, 'tmdb_id', tmdb_id)
            ORDER BY id
          ) AS movies
        FROM ranked_movies
        WHERE duplicate_count > 1
          AND sample_rank <= $1
        GROUP BY identity_key
      )
      SELECT identity_key, duplicate_count, movies, COUNT(*) OVER()::int AS total_groups
      FROM duplicate_groups
      ORDER BY duplicate_count DESC, identity_key
      LIMIT $1`,
    [limit],
  );

  return {
    totalGroups: toNumber(result.rows[0]?.total_groups),
    groups: result.rows.map((row) => ({
      identityKey: row.identity_key,
      count: toNumber(row.duplicate_count),
      movies: parseMovies(row.movies),
    })),
  };
}

async function getDuplicateNormalizedTitleYears(limit: number): Promise<DuplicateIdentityReport> {
  const result = await getPool().query<{
    identity_key: string;
    duplicate_count: number | string;
    total_groups: number | string;
    movies: string | Pick<CatalogMovieSample, 'id' | 'name' | 'year' | 'tmdb_id'>[];
  }>(
    `WITH keyed_movies AS (
        SELECT
          id,
          name,
          year,
          tmdb_id,
          concat(lower(regexp_replace(btrim(name), '[^[:alnum:]]+', '', 'g')), ':', year) AS identity_key
        FROM movies
      ),
      duplicate_groups AS (
        SELECT
          identity_key,
          MAX(duplicate_count)::int AS duplicate_count,
          json_agg(
            json_build_object('id', id::text, 'name', name, 'year', year, 'tmdb_id', tmdb_id)
            ORDER BY id
          ) AS movies
        FROM (
          SELECT
            *,
            COUNT(*) OVER (PARTITION BY identity_key)::int AS duplicate_count,
            ROW_NUMBER() OVER (PARTITION BY identity_key ORDER BY id)::int AS sample_rank
          FROM keyed_movies
          WHERE identity_key <> concat(':', year)
        ) ranked_movies
        WHERE duplicate_count > 1
          AND sample_rank <= $1
        GROUP BY identity_key
      )
      SELECT identity_key, duplicate_count, movies, COUNT(*) OVER()::int AS total_groups
      FROM duplicate_groups
      ORDER BY duplicate_count DESC, identity_key
      LIMIT $1`,
    [limit],
  );

  return {
    totalGroups: toNumber(result.rows[0]?.total_groups),
    groups: result.rows.map((row) => ({
      identityKey: row.identity_key,
      count: toNumber(row.duplicate_count),
      movies: parseMovies(row.movies),
    })),
  };
}

export async function getCatalogHealthReport(
  options: CatalogHealthOptions,
): Promise<CatalogHealthReport> {
  const summary = await getSummary(options.staleAfterDays);
  const issues = await Promise.all(
    CATALOG_HEALTH_ISSUE_DEFINITIONS.map(async (issue) => {
      const count = summary[issue.key];
      return {
        key: issue.key,
        label: issue.label,
        count,
        samples: count > 0 ? await getIssueSamples(issue, options) : [],
      };
    }),
  );

  const [duplicateTmdbIds, duplicateNormalizedTitleYears] = await Promise.all([
    getDuplicateTmdbIds(options.sampleLimit),
    getDuplicateNormalizedTitleYears(options.sampleLimit),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    staleAfterDays: options.staleAfterDays,
    totalMovies: summary.total_movies,
    issues,
    duplicateTmdbIds,
    duplicateNormalizedTitleYears,
  };
}

function formatMovieSample(movie: CatalogMovieSample): string {
  const tmdb = movie.tmdb_id === null ? 'tmdb:-' : `tmdb:${movie.tmdb_id}`;
  return `#${movie.id} ${movie.name} (${movie.year}) ${tmdb}`;
}

function formatDuplicateGroup(group: DuplicateIdentityGroup): string {
  const movies = group.movies
    .map((movie) => {
      const tmdb = movie.tmdb_id === null ? 'tmdb:-' : `tmdb:${movie.tmdb_id}`;
      return `#${movie.id} ${movie.name} (${movie.year}) ${tmdb}`;
    })
    .join('; ');

  return `  - ${group.identityKey} (${group.count}): ${movies}`;
}

function formatDuplicateReport(title: string, report: DuplicateIdentityReport): string[] {
  const lines = [`${title}: ${report.totalGroups}`];
  if (report.groups.length > 0) lines.push(...report.groups.map(formatDuplicateGroup));
  return lines;
}

export function formatCatalogHealthReport(report: CatalogHealthReport): string {
  const lines = [
    'Catalog health report',
    `Generated: ${report.generatedAt}`,
    `Stale threshold: ${report.staleAfterDays} days`,
    '',
    `Total movies: ${report.totalMovies}`,
    '',
    'Issue counts',
  ];

  for (const issue of report.issues) {
    lines.push(`- ${issue.label}: ${issue.count}`);
  }

  lines.push('', 'Likely duplicate identities');
  lines.push(...formatDuplicateReport('Duplicate TMDB ids', report.duplicateTmdbIds));
  lines.push(
    ...formatDuplicateReport(
      'Duplicate normalized title/year groups',
      report.duplicateNormalizedTitleYears,
    ),
  );

  lines.push('', 'Samples');
  for (const issue of report.issues.filter((item) => item.count > 0)) {
    lines.push(`${issue.key} (${issue.samples.length}/${issue.count})`);
    if (issue.samples.length === 0) {
      lines.push('  - No samples returned');
    } else {
      lines.push(...issue.samples.map((movie) => `  - ${formatMovieSample(movie)}`));
    }
  }

  return `${lines.join('\n')}\n`;
}

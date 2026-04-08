export type TMDBSource = 'now_playing' | 'upcoming' | 'top_rated' | 'popular';

export interface Config {
  tmdbReadAccessToken: string;
  openaiApiKey: string;
  databaseUrl: string;
  sources: TMDBSource[];
  maxPagesPerSource: number;
  minVoteCount: number;
  minVoteAverage: number;
  maxMoviesPerRun: number;
  dryRun: boolean;
  schedule: string;
}

function parsePositiveInt(value: string | undefined, defaultValue: number, name: string): number {
  if (value === undefined || value === '') return defaultValue;
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${JSON.stringify(value)}`);
  }
  return num;
}

function parsePositiveFloat(value: string | undefined, defaultValue: number, name: string): number {
  if (value === undefined || value === '') return defaultValue;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error(`${name} must be a positive number, got: ${JSON.stringify(value)}`);
  }
  return num;
}

export function loadConfig(): Config {
  const missing: string[] = [];

  // TMDB_READ_ACCESS_TOKEN is a TMDB v4 Bearer read access token, distinct from the
  // v3 TMDB_API_KEY (query-param auth) used by the main application.
  const tmdbReadAccessToken = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!tmdbReadAccessToken) missing.push('TMDB_READ_ACCESS_TOKEN');

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) missing.push('OPENAI_API_KEY');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) missing.push('DATABASE_URL');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const validSources: TMDBSource[] = ['now_playing', 'upcoming', 'top_rated', 'popular'];
  const rawSources = process.env.TMDB_SOURCES?.split(',').map((s) => s.trim()) ?? [];
  const filteredSources = rawSources.filter((s) =>
    validSources.includes(s as TMDBSource),
  ) as TMDBSource[];

  if (rawSources.length > 0 && filteredSources.length === 0) {
    throw new Error(
      `TMDB_SOURCES must include at least one valid source. Valid values are: ${validSources.join(', ')}`,
    );
  }

  const sources: TMDBSource[] = rawSources.length > 0 ? filteredSources : validSources;

  return {
    tmdbReadAccessToken: tmdbReadAccessToken!,
    openaiApiKey: openaiApiKey!,
    databaseUrl: databaseUrl!,
    sources,
    maxPagesPerSource: parsePositiveInt(
      process.env.MAX_PAGES_PER_SOURCE,
      3,
      'MAX_PAGES_PER_SOURCE',
    ),
    minVoteCount: parsePositiveInt(process.env.MIN_VOTE_COUNT, 500, 'MIN_VOTE_COUNT'),
    minVoteAverage: parsePositiveFloat(process.env.MIN_VOTE_AVERAGE, 6.5, 'MIN_VOTE_AVERAGE'),
    maxMoviesPerRun: parsePositiveInt(process.env.MAX_MOVIES_PER_RUN, 50, 'MAX_MOVIES_PER_RUN'),
    dryRun: process.env.DRY_RUN === 'true',
    schedule: process.env.SYNC_SCHEDULE?.trim() ?? '0 0 * * 0', // Default: weekly Sunday midnight UTC
  };
}

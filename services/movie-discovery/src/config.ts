export type TMDBSource = 'now_playing' | 'upcoming' | 'top_rated' | 'popular';

export interface Config {
  tmdbApiKey: string;
  openaiApiKey: string;
  databaseUrl: string;
  sources: TMDBSource[];
  maxPagesPerSource: number;
  minVoteCount: number;
  minVoteAverage: number;
  maxMoviesPerRun: number;
  language: string;
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

  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) missing.push('TMDB_API_KEY');

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
    tmdbApiKey: tmdbApiKey!,
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
    language: process.env.TMDB_LANGUAGE?.trim() || 'en-US',
    dryRun: process.env.DRY_RUN === 'true',
    schedule: process.env.SYNC_SCHEDULE?.trim() ?? '0 0 * * 0', // Default: weekly Sunday midnight UTC
  };
}

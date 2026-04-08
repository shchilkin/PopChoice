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
  dryRun: boolean;
  schedule: string;
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

  const rawSources = process.env.TMDB_SOURCES?.split(',').map((s) => s.trim()) ?? [];
  const validSources: TMDBSource[] = ['now_playing', 'upcoming', 'top_rated', 'popular'];
  const sources: TMDBSource[] =
    rawSources.length > 0
      ? (rawSources.filter((s) => validSources.includes(s as TMDBSource)) as TMDBSource[])
      : validSources;

  return {
    tmdbApiKey: tmdbApiKey!,
    openaiApiKey: openaiApiKey!,
    databaseUrl: databaseUrl!,
    sources,
    maxPagesPerSource: parseInt(process.env.MAX_PAGES_PER_SOURCE ?? '3', 10),
    minVoteCount: parseInt(process.env.MIN_VOTE_COUNT ?? '500', 10),
    minVoteAverage: parseFloat(process.env.MIN_VOTE_AVERAGE ?? '6.5'),
    maxMoviesPerRun: parseInt(process.env.MAX_MOVIES_PER_RUN ?? '50', 10),
    dryRun: process.env.DRY_RUN === 'true',
    schedule: process.env.SYNC_SCHEDULE?.trim() ?? '0 0 * * 0', // Default: weekly Sunday midnight UTC
  };
}

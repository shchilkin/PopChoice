import { parsePositiveFloat, parsePositiveInt, requireEnvVars } from '@pop-choice/shared';

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

export function loadConfig(): Config {
  const env = requireEnvVars(['TMDB_API_KEY', 'OPENAI_API_KEY', 'DATABASE_URL']);

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

  return {
    tmdbApiKey: env.TMDB_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY,
    databaseUrl: env.DATABASE_URL,
    sources: rawSources.length > 0 ? filteredSources : validSources,
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
    schedule: process.env.SYNC_SCHEDULE?.trim() ?? '0 0 * * 0',
  };
}

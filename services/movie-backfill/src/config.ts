import { parseNonNegativeInt, parsePositiveInt, requireEnvVars } from '@pop-choice/shared';

export interface Config {
  tmdbApiKey: string;
  openaiApiKey: string;
  databaseUrl: string;
  dryRun: boolean;
  batchSize: number;
  maxMovies: number;
}

export function loadConfig(): Config {
  const env = requireEnvVars(['TMDB_API_KEY', 'OPENAI_API_KEY', 'DATABASE_URL']);
  return {
    tmdbApiKey: env.TMDB_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY,
    databaseUrl: env.DATABASE_URL,
    dryRun: process.env.DRY_RUN === 'true',
    batchSize: parsePositiveInt(process.env.BATCH_SIZE, 5, 'BATCH_SIZE'),
    maxMovies: parseNonNegativeInt(process.env.MAX_MOVIES, 0, 'MAX_MOVIES'),
  };
}

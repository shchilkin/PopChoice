export interface Config {
  tmdbApiKey: string;
  openaiApiKey: string;
  databaseUrl: string;
  dryRun: boolean;
  batchSize: number;
  maxMovies: number; // 0 = unlimited
}

function parseNonNegativeInt(
  value: string | undefined,
  defaultValue: number,
  name: string,
): number {
  if (value === undefined || value === '') return defaultValue;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new Error(`${name} must be a non-negative integer, got: ${JSON.stringify(value)}`);
  }
  return num;
}

function parsePositiveInt(value: string | undefined, defaultValue: number, name: string): number {
  if (value === undefined || value === '') return defaultValue;
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${JSON.stringify(value)}`);
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

  return {
    tmdbApiKey: tmdbApiKey!,
    openaiApiKey: openaiApiKey!,
    databaseUrl: databaseUrl!,
    dryRun: process.env.DRY_RUN === 'true',
    batchSize: parsePositiveInt(process.env.BATCH_SIZE, 5, 'BATCH_SIZE'),
    maxMovies: parseNonNegativeInt(process.env.MAX_MOVIES, 0, 'MAX_MOVIES'),
  };
}

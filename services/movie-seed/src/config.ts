import { existsSync } from 'fs';
import path from 'path';

import { requireEnvVars } from '@pop-choice/shared';

export interface Config {
  openaiApiKey: string;
  databaseUrl: string;
  moviesFilePath: string;
  dryRun: boolean;
}

function resolveDefaultMoviesFilePath(): string {
  const cwdPath = path.resolve(process.cwd(), 'movies.txt');
  if (existsSync(cwdPath)) return cwdPath;

  const serviceLocalPath = path.resolve(process.cwd(), 'services/movie-seed/movies.txt');
  if (existsSync(serviceLocalPath)) return serviceLocalPath;

  return cwdPath;
}

export function loadConfig(): Config {
  const env = requireEnvVars(['OPENAI_API_KEY', 'DATABASE_URL']);
  return {
    openaiApiKey: env.OPENAI_API_KEY,
    databaseUrl: env.DATABASE_URL,
    dryRun: process.env.DRY_RUN === 'true',
    moviesFilePath: process.env.MOVIES_FILE_PATH ?? resolveDefaultMoviesFilePath(),
  };
}

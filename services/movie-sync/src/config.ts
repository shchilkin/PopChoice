/**
 * Environment configuration for movie-sync service.
 * All required and optional env vars are validated here at startup.
 */

import { existsSync } from 'fs';
import path from 'path';

export interface Config {
  openaiApiKey: string;
  databaseUrl: string;
  cronSchedule: string;
  dryRun: boolean;
  moviesFilePath: string;
}

/**
 * Resolve the default path to movies.txt when MOVIES_FILE_PATH is not set.
 * Tries <cwd>/movies.txt first (works in Docker where cwd=/app and in repo root).
 * Falls back to <cwd>/../../movies.txt so the service also works when started
 * from its own subdirectory (e.g. `npm run dev` from services/movie-sync/).
 */
function resolveDefaultMoviesFilePath(): string {
  const cwdPath = path.resolve(process.cwd(), 'movies.txt');
  if (existsSync(cwdPath)) return cwdPath;

  const repoRootPath = path.resolve(process.cwd(), '../../movies.txt');
  if (existsSync(repoRootPath)) return repoRootPath;

  // Neither found – return the cwd path so the error is clear when the file is read
  return cwdPath;
}

export function loadConfig(): Config {
  const missing: string[] = [];

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) missing.push('OPENAI_API_KEY');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) missing.push('DATABASE_URL');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const moviesFilePath = process.env.MOVIES_FILE_PATH ?? resolveDefaultMoviesFilePath();

  return {
    openaiApiKey: openaiApiKey!,
    databaseUrl: databaseUrl!,
    cronSchedule: process.env.CRON_SCHEDULE?.trim() ?? '0 3 * * *', // Default: 3 AM daily UTC
    dryRun: process.env.DRY_RUN === 'true',
    moviesFilePath,
  };
}

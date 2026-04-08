/**
 * Environment configuration for movie-seed service.
 * All required and optional env vars are validated here at startup.
 */

import { existsSync } from 'fs';
import path from 'path';

export interface Config {
  openaiApiKey: string;
  databaseUrl: string;
  moviesFilePath: string;
  dryRun: boolean;
}

/**
 * Resolve the default path to movies.txt when MOVIES_FILE_PATH is not set.
 * Tries <cwd>/movies.txt first (works in Docker where cwd=/app and when running
 * from services/movie-seed/ directly).
 * Falls back to <cwd>/services/movie-seed/movies.txt so the service also works when
 * started from the repository root.
 */
function resolveDefaultMoviesFilePath(): string {
  const cwdPath = path.resolve(process.cwd(), 'movies.txt');
  if (existsSync(cwdPath)) return cwdPath;

  const serviceLocalPath = path.resolve(process.cwd(), 'services/movie-seed/movies.txt');
  if (existsSync(serviceLocalPath)) return serviceLocalPath;

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
    dryRun: process.env.DRY_RUN === 'true',
    moviesFilePath,
  };
}

/**
 * Environment configuration for movie-sync service.
 * All required and optional env vars are validated here at startup.
 */

import path from 'path';

export interface Config {
  openaiApiKey: string;
  databaseUrl: string;
  cronSchedule: string;
  dryRun: boolean;
  moviesFilePath: string;
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

  const moviesFilePath = process.env.MOVIES_FILE_PATH ?? path.resolve(process.cwd(), 'movies.txt');

  return {
    openaiApiKey: openaiApiKey!,
    databaseUrl: databaseUrl!,
    cronSchedule: process.env.CRON_SCHEDULE?.trim() ?? '0 3 * * *', // Default: 3 AM daily UTC
    dryRun: process.env.DRY_RUN === 'true',
    moviesFilePath,
  };
}

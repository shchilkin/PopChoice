/**
 * Environment configuration for movie-sync service.
 * All required and optional env vars are validated here at startup.
 */

export interface Config {
  tmdbApiKey: string;
  openaiApiKey: string;
  supabaseUrl: string;
  supabaseApiKey: string;
  cronSchedule: string;
  dryRun: boolean;
}

export function loadConfig(): Config {
  const missing: string[] = [];

  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) missing.push('TMDB_API_KEY');

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) missing.push('OPENAI_API_KEY');

  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) missing.push('SUPABASE_URL');

  const supabaseApiKey = process.env.SUPABASE_API_KEY;
  if (!supabaseApiKey) missing.push('SUPABASE_API_KEY');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    tmdbApiKey: tmdbApiKey!,
    openaiApiKey: openaiApiKey!,
    supabaseUrl: supabaseUrl!,
    supabaseApiKey: supabaseApiKey!,
    cronSchedule: process.env.CRON_SCHEDULE?.trim() ?? '0 3 * * *', // Default: 3 AM daily UTC
    dryRun: process.env.DRY_RUN === 'true',
  };
}

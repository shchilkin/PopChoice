/**
 * Database operations for movie-sync service.
 * Adapted from src/utils/database/ in the main PopChoice app.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { logger } from './logger.js';

export interface MovieRecord {
  name: string;
  year: number;
  age_rating: string;
  description: string;
  duration: number;
  score_rating: number;
  embedding: number[];
}

let supabase: SupabaseClient | null = null;

export function initSupabase(url: string, apiKey: string): void {
  supabase = createClient(url, apiKey);
}

function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase client not initialized — call initSupabase() first');
  }
  return supabase;
}

function getMovieKey(name: string, year: number): string {
  return `${name}\u0000${year}`;
}

async function getExistingMovieKeys(movies: MovieRecord[]): Promise<Set<string>> {
  const existingKeys = new Set<string>();

  if (movies.length === 0) {
    return existingKeys;
  }

  const batchSize = 100;

  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    const names = [...new Set(batch.map((movie) => movie.name))];
    const years = [...new Set(batch.map((movie) => movie.year))];

    const { data, error } = await getSupabase()
      .from('movies')
      .select('name, year')
      .in('name', names)
      .in('year', years);

    if (error) {
      throw new Error(`Error checking movie existence: ${error.message}`);
    }

    for (const movie of data ?? []) {
      existingKeys.add(getMovieKey(movie.name, movie.year));
    }
  }

  return existingKeys;
}

/**
 * Filter out movies that already exist in the database.
 * Returns indices of new (non-duplicate) movies.
 */
export async function filterNewMovies(movies: MovieRecord[]): Promise<number[]> {
  try {
    const existingKeys = await getExistingMovieKeys(movies);
    const newIndices: number[] = [];

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      const exists = existingKeys.has(getMovieKey(movie.name, movie.year));

      if (!exists) {
        newIndices.push(i);
      } else {
        logger.debug('Skipping duplicate', { name: movie.name, year: movie.year });
      }
    }

    return newIndices;
  } catch (err) {
    // If batch check fails, assume all are new (will be caught by unique constraint)
    logger.warn('Duplicate check failed, assuming all movies are new', {
      error: err instanceof Error ? err.message : String(err),
      movieCount: movies.length,
    });

    return movies.map((_, index) => index);
  }
}

/**
 * Get count of movies currently in database.
 */
export async function getMovieCount(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('movies')
    .select('id', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Error getting movie count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Upsert movie records into Supabase in batches.
 * Uses onConflict to handle duplicate (name, year) entries idempotently.
 */
export async function insertMovies(
  movies: MovieRecord[],
  batchSize: number = 50,
): Promise<{ success: number; errors: number }> {
  let success = 0;
  let errors = 0;

  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);

    try {
      const { data, error } = await getSupabase()
        .from('movies')
        .upsert(batch, { onConflict: 'name,year', ignoreDuplicates: true })
        .select('id');

      if (error) {
        throw error;
      }

      const inserted = data?.length || 0;
      success += inserted;

      logger.info('Batch upserted', {
        batch: Math.floor(i / batchSize) + 1,
        inserted,
        total: movies.length,
      });
    } catch (batchErr) {
      logger.warn('Batch upsert failed, falling back to individual upserts', {
        batch: Math.floor(i / batchSize) + 1,
        error: batchErr instanceof Error ? batchErr.message : String(batchErr),
      });
      // Fallback: upsert one by one to isolate failures
      for (const movie of batch) {
        try {
          const { data, error } = await getSupabase()
            .from('movies')
            .upsert([movie], { onConflict: 'name,year', ignoreDuplicates: true })
            .select('id');
          if (error) throw error;
          success += data?.length || 0;
        } catch (singleErr) {
          errors++;
          logger.warn('Failed to upsert movie', {
            name: movie.name,
            year: movie.year,
            error: singleErr instanceof Error ? singleErr.message : String(singleErr),
          });
        }
      }
    }
  }

  return { success, errors };
}

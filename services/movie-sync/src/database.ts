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

/**
 * Check if a movie already exists in the database by name and year.
 */
export async function movieExists(name: string, year: number): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('movies')
    .select('id')
    .eq('name', name)
    .eq('year', year)
    .limit(1);

  if (error) {
    throw new Error(`Error checking movie existence: ${error.message}`);
  }

  return data !== null && data.length > 0;
}

/**
 * Filter out movies that already exist in the database.
 * Returns indices of new (non-duplicate) movies.
 */
export async function filterNewMovies(movies: MovieRecord[]): Promise<number[]> {
  const newIndices: number[] = [];

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    try {
      const exists = await movieExists(movie.name, movie.year);
      if (!exists) {
        newIndices.push(i);
      } else {
        logger.debug('Skipping duplicate', { name: movie.name, year: movie.year });
      }
    } catch (err) {
      // If check fails, assume new (will be caught by unique constraint)
      logger.warn('Duplicate check failed, assuming new movie', {
        name: movie.name,
        year: movie.year,
        error: err instanceof Error ? err.message : String(err),
      });
      newIndices.push(i);
    }
  }

  return newIndices;
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
          const { error } = await getSupabase()
            .from('movies')
            .upsert([movie], { onConflict: 'name,year', ignoreDuplicates: true });
          if (error) throw error;
          success++;
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

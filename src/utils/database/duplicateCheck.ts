import { getDbClient } from '@/clients/dbClient';

import type { MovieRecord } from '../types';

/**
 * Check if a movie already exists in the database
 * @param name - Movie name
 * @param year - Movie year
 * @returns True if movie exists, false otherwise
 */
export async function movieExists(name: string, year: number): Promise<boolean> {
  const db = getDbClient();
  const { data, error } = await db
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
 * Filter out movies that already exist in the database
 * @param movieRecords - Array of movie records to check
 * @returns Object with new movies and existing movies
 */
export async function filterExistingMovies(movieRecords: MovieRecord[]): Promise<{
  newMovies: MovieRecord[];
  existingMovies: Array<{ name: string; year: number; index: number }>;
}> {
  const newMovies: MovieRecord[] = [];
  const existingMovies: Array<{ name: string; year: number; index: number }> = [];

  for (let i = 0; i < movieRecords.length; i++) {
    const movie = movieRecords[i];

    try {
      const exists = await movieExists(movie.name, movie.year);

      if (exists) {
        existingMovies.push({
          name: movie.name,
          year: movie.year,
          index: i,
        });
      } else {
        newMovies.push(movie);
      }
    } catch {
      // If we can't check, assume it's new (will be caught by unique constraint)
      newMovies.push(movie);
    }
  }

  return { newMovies, existingMovies };
}

/**
 * Clear all movies from the database (use with caution!)
 * @returns Number of deleted records
 */
export async function clearAllMovies(): Promise<number> {
  const db = getDbClient();
  const { error } = await db.from('movies').delete().neq('id', 0); // Delete all records

  if (error) {
    throw new Error(`Error clearing movies: ${error.message}`);
  }

  // Get count after deletion to verify
  const count = await getMovieCount();
  return count;
}

/**
 * Get count of movies currently in database
 * @returns Number of movies in database
 */
export async function getMovieCount(): Promise<number> {
  const db = getDbClient();
  const result = await db.from('movies').select('id', { count: 'exact', head: true });

  if (result.error) {
    throw new Error(`Error getting movie count: ${result.error.message}`);
  }

  return result.count || 0;
}

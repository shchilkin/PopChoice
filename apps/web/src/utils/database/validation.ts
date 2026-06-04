import { getDbClient } from '@/clients/dbClient';

import type { MovieRecord } from '../types';

/**
 * Filter out movies that already exist in the database
 * @param movieRecords - Array of movie records to check
 * @returns Object with new movies and existing movies
 */

function makeMovieKey(name: string, year: number): string {
  return JSON.stringify([name, year]);
}

export async function filterExistingMovies(movieRecords: MovieRecord[]): Promise<{
  newMovies: MovieRecord[];
  existingMovies: Array<{ name: string; year: number; index: number }>;
}> {
  if (movieRecords.length === 0) {
    return { newMovies: [], existingMovies: [] };
  }

  const db = getDbClient();

  // De-duplicate candidate names to minimise the number of DB round-trips.
  const uniqueNames = [...new Set(movieRecords.map((m) => m.name))];

  // Fetch existing rows for all candidate names in a single query to avoid
  // unbounded parallel requests against the DB connection pool.
  const { data: existingRows, error } = await db
    .from<{ name: string; year: number }>('movies')
    .select('name, year')
    .in('name', uniqueNames);

  if (error) {
    throw new Error(`Error fetching existing movies: ${error.message}`);
  }

  // Build a Set of composite keys for O(1) lookups.
  const existingKeys = new Set<string>();
  if (existingRows) {
    for (const row of existingRows) {
      existingKeys.add(makeMovieKey(row.name, row.year));
    }
  }

  const newMovies: MovieRecord[] = [];
  const existingMovies: Array<{ name: string; year: number; index: number }> = [];

  for (let i = 0; i < movieRecords.length; i++) {
    const movie = movieRecords[i];
    if (existingKeys.has(makeMovieKey(movie.name, movie.year))) {
      existingMovies.push({ name: movie.name, year: movie.year, index: i });
    } else {
      newMovies.push(movie);
    }
  }

  return { newMovies, existingMovies };
}

/**
 * Clear all movies from the database (use with caution!)
 * @returns Number of movies remaining after deletion (expected to be 0)
 */
export async function clearAllMovies(): Promise<number> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'clearAllMovies() is not allowed in production. Use targeted deletions instead.',
    );
  }

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
async function getMovieCount(): Promise<number> {
  const db = getDbClient();
  const result = await db.from('movies').select('id', { count: 'exact', head: true });

  if (result.error) {
    throw new Error(`Error getting movie count: ${result.error.message}`);
  }

  return result.count || 0;
}

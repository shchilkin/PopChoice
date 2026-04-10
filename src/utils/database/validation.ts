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
  if (movieRecords.length === 0) {
    return { newMovies: [], existingMovies: [] };
  }

  const db = getDbClient();

  // De-duplicate candidate names to minimise the number of DB round-trips.
  // One query per unique movie name (vs one query per record in the old loop).
  const uniqueNames = [...new Set(movieRecords.map((m) => m.name))];

  // Fetch existing rows matching any candidate name in parallel.
  const fetchResults = await Promise.all(
    uniqueNames.map((name) =>
      db.from<{ name: string; year: number }>('movies').select('name, year').eq('name', name),
    ),
  );

  // Build a Set of "name\0year" keys for O(1) lookups.
  const existingKeys = new Set<string>();
  for (const result of fetchResults) {
    if (result.data) {
      for (const row of result.data) {
        existingKeys.add(`${row.name}\0${row.year}`);
      }
    }
  }

  const newMovies: MovieRecord[] = [];
  const existingMovies: Array<{ name: string; year: number; index: number }> = [];

  for (let i = 0; i < movieRecords.length; i++) {
    const movie = movieRecords[i];
    if (existingKeys.has(`${movie.name}\0${movie.year}`)) {
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
export async function getMovieCount(): Promise<number> {
  const db = getDbClient();
  const result = await db.from('movies').select('id', { count: 'exact', head: true });

  if (result.error) {
    throw new Error(`Error getting movie count: ${result.error.message}`);
  }

  return result.count || 0;
}

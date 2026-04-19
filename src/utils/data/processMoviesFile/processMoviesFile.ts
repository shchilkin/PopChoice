import logger from '@/lib/logger';

import { moviesArraySchema } from '../../schemas/movieSchemas';

import type { MovieEntry, RawMovieEntry } from '../../types';

/**
 * Process movies file and return structured movie data
 * @param filePath - Path to the movie text file
 * @returns Array of validated movie entries
 */
export async function processMoviesFile(filePath: string): Promise<MovieEntry[]> {
  const { readFile } = await import('fs/promises');

  let data: string;
  try {
    data = await readFile(filePath, 'utf-8');
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }

  const entries = data.split(/\r?\n/).filter(Boolean);

  if (entries.length % 2 !== 0) {
    throw new Error(
      'Invalid file format: Odd number of lines detected. Each movie entry must have a description line.',
    );
  }

  const rawMovies: RawMovieEntry[] = [];

  for (let i = 0; i < entries.length; i += 2) {
    const [movieName, ageRating, duration, scoreRating] = entries[i]
      .split('|')
      .map((part) => part.trim());
    const description = entries[i + 1]?.trim() || '';
    rawMovies.push({ movieName, ageRating, duration, scoreRating, description });
  }

  const parseResult = moviesArraySchema.safeParse(rawMovies);

  if (parseResult.success) {
    return parseResult.data;
  } else {
    logger.error({ err: parseResult.error.message }, 'Validation errors');
    return [];
  }
}

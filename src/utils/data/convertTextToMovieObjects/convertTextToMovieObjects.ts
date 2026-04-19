import logger from '@/lib/logger';

import { moviesArraySchema } from '../../schemas/movieSchemas';
import { MovieEntry, RawMovieEntry } from '../../types';

/**
 * Convert an array of text lines into movie objects
 * Used for processing individual chunks that contain movie data
 */
export function convertTextToMovieObjects(lines: string[]): MovieEntry[] {
  if (lines.length === 0) {
    return [];
  }

  // Filter out empty lines
  const validLines = lines.filter(Boolean);

  if (validLines.length % 2 !== 0) {
    throw new Error(
      'Invalid chunk format: Odd number of lines detected. Each movie entry must have a description line.',
    );
  }

  const rawMovies: RawMovieEntry[] = [];

  for (let i = 0; i < validLines.length; i += 2) {
    const [movieName, ageRating, duration, scoreRating] = validLines[i]
      .split('|')
      .map((part) => part.trim());
    const description = validLines[i + 1]?.trim() || '';
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

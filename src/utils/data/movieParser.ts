import { z } from 'zod/v4';

import type { ParsedMovie } from '../types';

/**
 * Movie parsing utilities for converting text data into structured movie objects
 */

// Schema definitions
export const ageRatings = z.enum(['G', 'PG', 'PG-13', 'R', 'NR', '12+', '15', '16+', '18+']);

export const movieSchema = z.object({
  movieName: z.string(),
  ageRating: ageRatings,
  duration: z
    .string()
    .transform((val) => parseDurationToMinutes(val))
    .refine((num) => num > 0, { message: 'Duration must be a positive number' }),
  scoreRating: z
    .string()
    .transform((val) => Number(val.replace(/rating/i, '').trim()))
    .refine((num) => !isNaN(num), { message: 'Score rating must be a number' }),
  description: z.string(),
});

const moviesArraySchema = z.array(movieSchema);

// Types
type RawMovieEntry = {
  movieName: string;
  ageRating: string;
  duration: string;
  scoreRating: string;
  description: string;
};

type MovieEntry = z.infer<typeof movieSchema>;

/**
 * Convert duration string to minutes
 * @param duration - Duration string like "1h 42m", "2h", "3h 27m", "90m"
 * @returns Duration in minutes as integer
 */
export function parseDurationToMinutes(duration: string): number {
  if (!duration || typeof duration !== 'string') {
    return 0;
  }

  const trimmed = duration.trim();
  let totalMinutes = 0;

  // Match hours: "1h", "2h", etc.
  const hoursMatch = trimmed.match(/(\d+)h/);
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1], 10) * 60;
  }

  // Match minutes: "42m", "90m", etc.
  const minutesMatch = trimmed.match(/(\d+)m/);
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1], 10);
  }

  // If no hours or minutes found, try to parse as plain number (assume minutes)
  if (totalMinutes === 0) {
    const numberMatch = trimmed.match(/^(\d+)$/);
    if (numberMatch) {
      totalMinutes = parseInt(numberMatch[1], 10);
    }
  }

  return totalMinutes;
}

/**
 * Parse a movie name with year format "Movie Name: YYYY"
 * @param nameWithYear - Full movie name including year (e.g., "The Matrix: 1999")
 * @returns Parsed movie name and year
 */
export function parseMovieNameAndYear(nameWithYear: string): ParsedMovie {
  const yearMatch = nameWithYear.match(/:\s*(\d{4})\s*$/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
  const name = nameWithYear.replace(/:\s*\d{4}\s*$/, '').trim();

  return { name, year };
}

/**
 * Extract year from a movie title line that includes metadata
 * @param titleLine - Full title line (e.g., "The Matrix: 1999 | R | 2h 16m | 8.7 rating")
 * @returns Extracted year or 0 if not found
 */
export function extractYearFromTitleLine(titleLine: string): number {
  const yearMatch = titleLine.match(/:\s*(\d{4})\s*\|/);
  return yearMatch ? parseInt(yearMatch[1], 10) : 0;
}

/**
 * Clean movie name by removing year and extra whitespace
 * @param nameWithYear - Movie name that may include year
 * @returns Clean movie name
 */
export function cleanMovieName(nameWithYear: string): string {
  return nameWithYear.replace(/:\s*\d{4}\s*$/, '').trim();
}

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
    // TODO: Implement better error handling

    console.error('Validation errors:', parseResult.error);
    return [];
  }
}

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
    console.error('Validation errors:', parseResult.error);
    return [];
  }
}

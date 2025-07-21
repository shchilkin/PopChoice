import type { ParsedMovie } from '../../types';

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

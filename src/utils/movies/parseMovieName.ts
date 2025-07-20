/**
 * Utility functions for parsing movie names and extracting years
 */

export interface ParsedMovieName {
  name: string;
  year: number;
  original: string;
}

/**
 * Parse a movie name with year format "Movie Name: YYYY"
 * @param nameWithYear - Full movie name including year (e.g., "The Matrix: 1999")
 * @returns Parsed movie name and year
 */
export function parseMovieNameAndYear(nameWithYear: string): ParsedMovieName {
  const yearMatch = nameWithYear.match(/:\s*(\d{4})\s*$/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
  const name = nameWithYear.replace(/:\s*\d{4}\s*$/, '').trim();

  return {
    name,
    year,
    original: nameWithYear,
  };
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

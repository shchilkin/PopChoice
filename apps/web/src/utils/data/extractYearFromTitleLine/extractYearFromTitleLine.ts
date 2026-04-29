/**
 * Extract year from a movie title line that includes metadata
 * @param titleLine - Full title line (e.g., "The Matrix: 1999 | R | 2h 16m | 8.7 rating")
 * @returns Extracted year or 0 if not found
 */
export function extractYearFromTitleLine(titleLine: string): number {
  const yearMatch = titleLine.match(/:\s*(\d{4})\s*\|/);
  return yearMatch ? parseInt(yearMatch[1], 10) : 0;
}

/**
 * Clean movie name by removing year and extra whitespace
 * @param nameWithYear - Movie name that may include year
 * @returns Clean movie name
 */
export function cleanMovieName(nameWithYear: string): string {
  return nameWithYear.replace(/:\s*\d{4}\s*$/, '').trim();
}

import { readFileSync } from 'fs';

/**
 * Counts the total number of movies and finds the maximum chunk size
 * @param filePath - Path to the movie text file to analyze
 * @returns Object containing movie count and maximum chunk size
 */

export function getMovieStats(filePath: string): { movieCount: number; maxChunkSize: number } {
  const content = readFileSync(filePath, 'utf-8');

  // Split by empty lines to separate movie entries (CRLF-safe)
  const chunks = content.split(/(?:\r?\n){2,}/);

  let movieCount = 0;
  let maxChunkSize = 0;

  chunks.forEach((chunk) => {
    if (!chunk.trim()) return;

    const lines = chunk.trim().split(/\r?\n/);

    // Check if first line contains movie title with year (format: "Title: YYYY | ...")
    if (lines.length > 0 && /^[A-Za-z0-9].*: \d{4} \|/.test(lines[0])) {
      movieCount++;
      const chunkSize = chunk.length;
      if (chunkSize > maxChunkSize) {
        maxChunkSize = chunkSize;
      }
    }
  });

  return { movieCount, maxChunkSize };
}

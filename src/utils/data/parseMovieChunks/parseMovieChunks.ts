import { readFileSync } from 'fs';

/**
 * Parses movie chunks from file content without validation
 * @param filePath - Path to the movie text file to parse
 * @returns Array of raw movie chunk data
 */
export function parseMovieChunks(filePath: string): unknown[] {
  const content = readFileSync(filePath, 'utf-8');

  // Split by empty lines to separate movie entries
  const chunks = content.split('\n\n');

  const rawMovieChunks: unknown[] = [];

  chunks.forEach((chunk, i) => {
    if (!chunk.trim()) return;

    const lines = chunk.trim().split('\n');

    // Check if first line contains movie title with year (format: "Title: YYYY | ...")
    if (lines.length > 0 && /^[A-Za-z0-9].*: \d{4} \|/.test(lines[0])) {
      const movieName = lines[0].replace(/: \d{4} \|.*$/, '').trim();
      const chunkSize = chunk.length;
      const lineCount = lines.length;

      // Create raw data object for validation
      const rawChunk = {
        name: movieName,
        chunkSize,
        lineCount,
        chunkNumber: i + 1,
        content: chunk,
      };

      rawMovieChunks.push(rawChunk);
    }
  });

  return rawMovieChunks;
}

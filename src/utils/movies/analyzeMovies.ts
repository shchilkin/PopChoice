import { readFileSync } from 'fs';

import { z } from 'zod';

/**
 * Zod schema for validating movie chunk data structure
 */
const movieChunkSchema = z.object({
  /** Name of the movie */
  name: z.string().min(1, 'Movie name cannot be empty'),
  /** Size of the chunk in characters */
  chunkSize: z.number().int().positive('Chunk size must be a positive integer'),
  /** Number of lines in the chunk */
  lineCount: z.number().int().positive('Line count must be a positive integer'),
  /** Sequential chunk number in the file */
  chunkNumber: z.number().int().positive('Chunk number must be a positive integer'),
  /** Full content of the movie chunk */
  content: z.string().min(1, 'Content cannot be empty'),
});

/**
 * Type inferred from the Zod schema for movie chunk data
 */
type MovieChunk = z.infer<typeof movieChunkSchema>;

/**
 * Array of movie chunks schema for validation
 */
const movieChunksArraySchema = z.array(movieChunkSchema);

/**
 * Export the schema and type for use in other modules
 */
export { movieChunkSchema, type MovieChunk };

/**
 * Counts the total number of movies and finds the maximum chunk size
 * @param filePath - Path to the movie text file to analyze
 * @returns Object containing movie count and maximum chunk size
 */
export function getMovieStats(filePath: string): { movieCount: number; maxChunkSize: number } {
  const content = readFileSync(filePath, 'utf-8');

  // Split by empty lines to separate movie entries
  const chunks = content.split('\n\n');

  let movieCount = 0;
  let maxChunkSize = 0;

  chunks.forEach((chunk) => {
    if (!chunk.trim()) return;

    const lines = chunk.trim().split('\n');

    // Check if first line contains movie title with year (format: "Title: YYYY | ...")
    if (lines.length > 0 && /^[A-Za-z].*: \d{4} \|/.test(lines[0])) {
      movieCount++;
      const chunkSize = chunk.length;
      if (chunkSize > maxChunkSize) {
        maxChunkSize = chunkSize;
      }
    }
  });

  return { movieCount, maxChunkSize };
}

/**
 * Parses movie chunks from file content without validation
 * @param filePath - Path to the movie text file to parse
 * @returns Array of raw movie chunk data
 */
function parseMovieChunks(filePath: string): unknown[] {
  const content = readFileSync(filePath, 'utf-8');

  // Split by empty lines to separate movie entries
  const chunks = content.split('\n\n');

  const rawMovieChunks: unknown[] = [];

  chunks.forEach((chunk, i) => {
    if (!chunk.trim()) return;

    const lines = chunk.trim().split('\n');

    // Check if first line contains movie title with year (format: "Title: YYYY | ...")
    if (lines.length > 0 && /^[A-Za-z].*: \d{4} \|/.test(lines[0])) {
      const movieName = lines[0].split(':')[0].trim();
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

/**
 * Analyzes movie chunks from a text file and displays statistics about chunk sizes.
 *
 * This function reads a movie data file, splits it into chunks by empty lines,
 * and analyzes the size distribution of each movie entry. It uses Zod validation
 * to ensure data integrity and provides runtime type safety. Useful for
 * understanding the data structure and identifying the largest movie descriptions
 * for embedding optimization.
 *
 * @param filePath - Path to the movie text file to analyze
 * @returns Array of validated MovieChunk objects sorted by size (largest first)
 * @throws {Error} When movie chunk validation fails due to invalid data format
 */
function analyzeMovieChunks(filePath: string): MovieChunk[] {
  // Parse movie chunks from file
  const rawMovieChunks = parseMovieChunks(filePath);

  // Validate all chunks using Zod
  const validationResult = movieChunksArraySchema.safeParse(rawMovieChunks);

  if (!validationResult.success) {
    console.error('Validation errors found in movie chunks:');
    validationResult.error.issues.forEach((issue) => {
      console.error(`- ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error('Movie chunk validation failed. Check the data format.');
  }

  const movieChunks = validationResult.data;

  // Sort by chunk size (largest first)
  movieChunks.sort((a, b) => b.chunkSize - a.chunkSize);

  console.log(`Total movies found: ${movieChunks.length}`);
  console.log(`\nTop 10 largest chunks by size (characters):`);
  console.log('-'.repeat(80));

  movieChunks.slice(0, 10).forEach((movie, i) => {
    console.log(
      `${(i + 1).toString().padStart(2)}. ${movie.name.padEnd(50)} | ${movie.chunkSize.toString().padStart(4)} chars | ${movie.lineCount.toString().padStart(2)} lines`,
    );
  });

  const biggest = movieChunks[0];
  console.log(`\nLargest chunk:`);
  console.log('='.repeat(80));
  console.log(`Movie: ${biggest.name}`);
  console.log(`Size: ${biggest.chunkSize} characters`);
  console.log(`Lines: ${biggest.lineCount}`);
  console.log(`Chunk number: ${biggest.chunkNumber}`);
  console.log(`\nContent:`);
  console.log('-'.repeat(40));
  console.log(biggest.content);

  return movieChunks;
}

/**
 * Runs the movie chunk analysis on the movies.txt file.
 * This is the main execution point that analyzes and displays movie chunk statistics.
 */
// Run analysis only if this file is executed directly
if (
  process.argv[1]?.endsWith('/analyzeMovies.ts') ||
  process.argv[1]?.endsWith('\\analyzeMovies.ts')
) {
  analyzeMovieChunks('./movies.txt');
}

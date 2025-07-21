import { movieChunksArraySchema } from '../../schemas/movieSchemas';
import { parseMovieChunks } from '../parseMovieChunks';

import type { MovieChunk } from '@/utils/types';

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
export function analyzeMovieChunks(filePath: string): MovieChunk[] {
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

  if (movieChunks.length === 0) {
    return movieChunks;
  }

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

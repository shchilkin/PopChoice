import logger from '@/lib/logger';

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
    logger.error('Validation errors found in movie chunks:');
    validationResult.error.issues.forEach((issue) => {
      logger.error(`- ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error('Movie chunk validation failed. Check the data format.');
  }

  const movieChunks = validationResult.data;

  // Sort by chunk size (largest first)
  movieChunks.sort((a, b) => b.chunkSize - a.chunkSize);

  logger.info(`Total movies found: ${movieChunks.length}`);

  if (movieChunks.length === 0) {
    return movieChunks;
  }

  logger.info(`\nTop 10 largest chunks by size (characters):`);
  logger.info('-'.repeat(80));

  movieChunks.slice(0, 10).forEach((movie, i) => {
    logger.info(
      `${(i + 1).toString().padStart(2)}. ${movie.name.padEnd(50)} | ${movie.chunkSize.toString().padStart(4)} chars | ${movie.lineCount.toString().padStart(2)} lines`,
    );
  });

  const biggest = movieChunks[0];
  logger.info(`\nLargest chunk:`);
  logger.info('='.repeat(80));
  logger.info(`Movie: ${biggest.name}`);
  logger.info(`Size: ${biggest.chunkSize} characters`);
  logger.info(`Lines: ${biggest.lineCount}`);
  logger.info(`Chunk number: ${biggest.chunkNumber}`);
  logger.info(`\nContent:`);
  logger.info('-'.repeat(40));
  logger.info(biggest.content);

  return movieChunks;
}

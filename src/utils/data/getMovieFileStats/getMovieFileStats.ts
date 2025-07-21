import { movieFileStatsSchema } from '../../schemas';
import { splitMovieDocument } from '../splitMovieDocument';

import type { MovieFileStats } from '../../types';

/**
 * Calculate statistics about movie file chunks
 *
 * @param filePath - Path to the movie file
 * @returns Promise<MovieFileStats> Statistics about the file chunks
 */
export async function getMovieFileStats(filePath: string): Promise<MovieFileStats> {
  // Split the file into chunks using the same function as the main process
  const chunks = await splitMovieDocument(filePath);

  if (chunks.length === 0) {
    const emptyStats = {
      totalChunks: 0,
      avgChunkSize: 0,
      maxChunkSize: 0,
      minChunkSize: 0,
      totalFileSize: 0,
    };

    // Validate the result with schema
    return movieFileStatsSchema.parse(emptyStats);
  }

  // Calculate chunk sizes
  const chunkSizes = chunks.map((chunk) => chunk.pageContent.length);

  const totalChunks = chunks.length;
  const totalFileSize = chunkSizes.reduce((sum, size) => sum + size, 0);
  const avgChunkSize = Math.round(totalFileSize / totalChunks);
  const maxChunkSize = Math.max(...chunkSizes);
  const minChunkSize = Math.min(...chunkSizes);

  const stats = {
    totalChunks,
    avgChunkSize,
    maxChunkSize,
    minChunkSize,
    totalFileSize,
  };

  // Validate the result with schema before returning
  return movieFileStatsSchema.parse(stats);
}

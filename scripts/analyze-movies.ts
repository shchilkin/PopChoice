#!/usr/bin/env tsx
import logger from '@/lib/logger';
import { analyzeMovieChunks } from '@/utils/data';

/**
 * Analyze movie chunks script
 *
 * This script analyzes movie data from movies.txt file and displays statistics
 * about chunk sizes, helping with embedding optimization.
 *
 * Usage:
 *   npm run analyze-movies [file-path]
 *
 * If no file path is provided, defaults to './movies.txt'
 */
function main() {
  // Get file path from command line argument or use default
  const filePath = process.argv[2] || './movies.txt';

  logger.info('🎬 Starting movie chunk analysis...');
  logger.info(`📁 Analyzing file: ${filePath}`);
  logger.info('='.repeat(80));

  try {
    const movieChunks = analyzeMovieChunks(filePath);

    logger.info('\n' + '='.repeat(80));
    logger.info('✅ Analysis completed successfully!');
    logger.info(`📊 Processed ${movieChunks.length} movie entries`);

    if (movieChunks.length > 0) {
      const avgChunkSize = Math.round(
        movieChunks.reduce((sum, chunk) => sum + chunk.chunkSize, 0) / movieChunks.length,
      );
      const maxChunkSize = Math.max(...movieChunks.map((chunk) => chunk.chunkSize));
      const minChunkSize = Math.min(...movieChunks.map((chunk) => chunk.chunkSize));

      logger.info(`📈 Average chunk size: ${avgChunkSize} characters`);
      logger.info(`📊 Size range: ${minChunkSize} - ${maxChunkSize} characters`);
    }
  } catch (error) {
    logger.error('\n❌ Analysis failed:');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the script
main();

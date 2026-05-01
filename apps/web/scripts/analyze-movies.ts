#!/usr/bin/env tsx

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

  console.log('🎬 Starting movie chunk analysis...');
  console.log(`📁 Analyzing file: ${filePath}`);
  console.log('='.repeat(80));

  try {
    const movieChunks = analyzeMovieChunks(filePath);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis completed successfully!');
    console.log(`📊 Processed ${movieChunks.length} movie entries`);

    if (movieChunks.length > 0) {
      const avgChunkSize = Math.round(
        movieChunks.reduce((sum, chunk) => sum + chunk.chunkSize, 0) / movieChunks.length,
      );
      const maxChunkSize = Math.max(...movieChunks.map((chunk) => chunk.chunkSize));
      const minChunkSize = Math.min(...movieChunks.map((chunk) => chunk.chunkSize));

      console.log(`📈 Average chunk size: ${avgChunkSize} characters`);
      console.log(`📊 Size range: ${minChunkSize} - ${maxChunkSize} characters`);
    }
  } catch (error) {
    console.error('\n❌ Analysis failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the script
main();

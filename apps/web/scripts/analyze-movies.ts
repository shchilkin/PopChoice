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

  printAnalysisHeader(filePath);

  try {
    const movieChunks = analyzeMovieChunks(filePath);
    printAnalysisReport(movieChunks);
  } catch (error) {
    exitWithAnalysisError(error);
  }
}

function printAnalysisHeader(filePath: string) {
  console.log('🎬 Starting movie chunk analysis...');
  console.log(`📁 Analyzing file: ${filePath}`);
  console.log('='.repeat(80));
}

function printAnalysisReport(movieChunks: ReturnType<typeof analyzeMovieChunks>) {
  console.log('\n' + '='.repeat(80));
  console.log('✅ Analysis completed successfully!');
  console.log(`📊 Processed ${movieChunks.length} movie entries`);
  printChunkSizeStats(movieChunks);
}

function printChunkSizeStats(movieChunks: ReturnType<typeof analyzeMovieChunks>) {
  if (movieChunks.length === 0) {
    return;
  }

  const stats = getChunkSizeStats(movieChunks);
  console.log(`📈 Average chunk size: ${stats.average} characters`);
  console.log(`📊 Size range: ${stats.min} - ${stats.max} characters`);
}

function getChunkSizeStats(movieChunks: ReturnType<typeof analyzeMovieChunks>) {
  const chunkSizes = movieChunks.map((chunk) => chunk.chunkSize);
  return {
    average: Math.round(chunkSizes.reduce((sum, size) => sum + size, 0) / chunkSizes.length),
    max: Math.max(...chunkSizes),
    min: Math.min(...chunkSizes),
  };
}

function exitWithAnalysisError(error: unknown) {
  console.error('\n❌ Analysis failed:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// Run the script
main();

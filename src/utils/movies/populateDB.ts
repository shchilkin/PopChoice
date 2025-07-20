import path from 'path';

import { batchInsertMovies } from '@/utils/database/insertMovies';
import { createEmbeddingsWithProgress } from '@/utils/embeddings/createEmbeddings';
import { getMovieFileStats, splitMovieDocument, type MovieDocument } from '@/utils/movieSplitter';

import { getMovieStats } from './analyzeMovies';
import { extractYearFromTitleLine } from './parseMovieName';

// Resolve path to movies.txt from project root
const moviesPath = path.resolve(process.cwd(), 'movies.txt');

// Get original movie statistics
const { movieCount } = getMovieStats(moviesPath);
console.log(`Original movies: ${movieCount}`);

// Split using custom movie-aware splitter
const chunks: MovieDocument[] = await splitMovieDocument(moviesPath);

// Get chunk statistics
const stats = await getMovieFileStats(moviesPath);

console.log(`\nChunk Results:`);
console.log(`- Generated chunks: ${chunks.length}`);
console.log(`- Average chunk size: ${stats.avgChunkSize} characters`);
console.log(`- Max chunk size: ${stats.maxChunkSize} characters`);
console.log(`- Min chunk size: ${stats.minChunkSize} characters`);
// If not perfect 1:1 mapping -> data is corrupted -> throw error
console.log(`\nPerfect 1:1 mapping: ${chunks.length === movieCount ? '✅' : '❌'}`);

// Create embeddings for each chunk using the generic function
const chunksWithEmbeddings = await createEmbeddingsWithProgress(chunks, {
  model: 'text-embedding-3-large',
  batchSize: 50,
  logProgress: true,
});

// Insert movies into Supabase database
const insertResult = await batchInsertMovies(chunksWithEmbeddings, 100);

// Display results summary
console.log(`\n📊 Database Insertion Summary:`);
console.log(`✅ Successfully inserted: ${insertResult.totalSuccess} movies`);
console.log(`❌ Failed insertions: ${insertResult.totalErrors} movies`);

if (insertResult.totalErrors > 0) {
  console.log(`\n❌ First few errors:`);
  insertResult.errorDetails.slice(0, 3).forEach((error) => {
    console.log(`  - Index ${error.index}: ${error.error}`);
  });
}

// Display chunk information with embeddings (first few only)
console.log(`\n📝 Sample Movie Data (first 3):`);
chunksWithEmbeddings.slice(0, 3).forEach((chunk, index) => {
  // Extract year for display using utility function
  const titleLine = chunk.pageContent.split('\n')[0];
  const year = extractYearFromTitleLine(titleLine);

  console.log(`\nChunk ${index + 1}:`);
  console.log(`- Movie Name: ${chunk.metadata.movieName}`);
  console.log(`- Year: ${year || 'Unknown'}`);
  console.log(`- Movie Index: ${chunk.metadata.movieIndex}`);
  console.log(`- Chunk Size: ${chunk.metadata.chunkSize} characters`);
  console.log(`- Embedding Size: ${chunk.embedding.length} dimensions`);
  console.log(`- Source: ${chunk.metadata.source}`);
});

// const movieEntries = chunks.map((chunk) =>
//   convertTextToMovieObjects(chunk.pageContent.split('\n')),
// );

// TODO: create embedding for whole chunk string
//

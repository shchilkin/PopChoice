import path from 'path';

import { splitDocument } from '@/utils/createChunks';

import { getMovieStats } from './analyzeMovies';

// Resolve path to movies.txt from project root
const moviesPath = path.resolve(process.cwd(), 'movies.txt');

// Get movie statistics
const { movieCount, maxChunkSize } = getMovieStats(moviesPath);

console.log(`Total movies: ${movieCount}`);
console.log(`Maximum chunk size: ${maxChunkSize} characters`);

// Each chunk should contain whole movie information
const chunks = await splitDocument(moviesPath);

console.log(`Generated ${chunks.length} chunks from ${movieCount} movies`);
console.log(`Difference: ${chunks.length - movieCount} extra chunks`);

// Let's analyze chunk sizes to understand the splitting
const chunkSizes = chunks.map((chunk) => chunk.pageContent.length);
const avgChunkSize = Math.round(chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length);
const maxActualChunk = Math.max(...chunkSizes);
const minActualChunk = Math.min(...chunkSizes);

console.log(`\nChunk size analysis:`);
console.log(`- Average chunk size: ${avgChunkSize} characters`);
console.log(`- Largest actual chunk: ${maxActualChunk} characters`);
console.log(`- Smallest actual chunk: ${minActualChunk} characters`);

// Find chunks that might be split movies
const largishChunks = chunkSizes.filter((size) => size > 500).length;
const smallChunks = chunkSizes.filter((size) => size < 200).length;

console.log(`- Chunks > 500 chars: ${largishChunks}`);
console.log(`- Chunks < 200 chars: ${smallChunks} (possible movie fragments)`);

// Show some examples of smaller chunks (potential splits)
console.log(`\nExamples of potentially split chunks:`);
chunks
  .filter((chunk) => chunk.pageContent.length < 200)
  .slice(0, 3)
  .forEach((chunk, i) => {
    console.log(`\n--- Small chunk ${i + 1} (${chunk.pageContent.length} chars) ---`);
    console.log(chunk.pageContent.substring(0, 150) + '...');
  });

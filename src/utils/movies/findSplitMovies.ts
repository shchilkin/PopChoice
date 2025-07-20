import { readFileSync } from 'fs';
import path from 'path';

import { splitDocument } from '@/utils/createChunks';

import { getMovieStats } from './analyzeMovies';

// Resolve path to movies.txt from project root
const moviesPath = path.resolve(process.cwd(), 'movies.txt');

// Get movie statistics
const { movieCount, maxChunkSize } = getMovieStats(moviesPath);

console.log(`Total movies: ${movieCount}`);
console.log(`Maximum chunk size: ${maxChunkSize} characters`);

// Types for better TypeScript support
interface OriginalMovie {
  index: number;
  name: string;
  content: string;
  size: number;
}

interface ChunkAnalysis {
  chunkIndex: number;
  movieName: string;
  chunkSize: number;
  originalSize: number;
  isComplete: boolean;
  startsWithMovie: boolean;
}

// Parse original movies from file
function parseOriginalMovies(filePath: string): OriginalMovie[] {
  const content = readFileSync(filePath, 'utf-8');
  const movieChunks = content.split('\n\n');

  return movieChunks
    .map((chunk, index) => {
      if (!chunk.trim()) return null;

      const lines = chunk.trim().split('\n');

      // Check if first line contains movie title with year (format: "Title: YYYY | ...")
      if (lines.length > 0 && /^[A-Za-z].*: \d{4} \|/.test(lines[0])) {
        const movieName = lines[0].split(':')[0].trim();
        return {
          index: index + 1,
          name: movieName,
          content: chunk,
          size: chunk.length,
        };
      }
      return null;
    })
    .filter((movie): movie is OriginalMovie => movie !== null);
}

// Test with default chunk size (700)
console.log(`\n=== Testing with DEFAULT chunk size (700) ===`);
const defaultChunks = await splitDocument(moviesPath);
console.log(`Generated ${defaultChunks.length} chunks from ${movieCount} movies`);
console.log(`Difference: ${defaultChunks.length - movieCount} extra chunks`);

// Test with maxChunkSize + buffer
console.log(`\n=== Testing with MAX chunk size (${maxChunkSize + 100}) ===`);
const maxChunks = await splitDocument(moviesPath, {
  chunkSize: maxChunkSize + 100,
  chunkOverlap: 0,
});
console.log(`Generated ${maxChunks.length} chunks from ${movieCount} movies`);
console.log(`Difference: ${maxChunks.length - movieCount} extra chunks`);

// Parse original movies
const originalMovies = parseOriginalMovies(moviesPath);
console.log(`\nParsed ${originalMovies.length} original movies`);

// Function to find which movies might be split
function analyzeChunkMapping(chunks: Array<{ pageContent: string }>, movies: OriginalMovie[]) {
  console.log(`\n--- Chunk Analysis ---`);

  // Analyze each chunk to see if it contains a full movie or fragment
  const chunkAnalysis: ChunkAnalysis[] = chunks.map((chunk, index) => {
    const chunkContent = chunk.pageContent;
    const lines = chunkContent.split('\n');

    // Check if chunk starts with a movie title
    const startsWithMovie = lines.length > 0 && /^[A-Za-z].*: \d{4} \|/.test(lines[0]);

    if (startsWithMovie) {
      const movieName = lines[0].split(':')[0].trim();

      // Find the original movie
      const originalMovie = movies.find((m) => m.name === movieName);

      return {
        chunkIndex: index + 1,
        movieName,
        chunkSize: chunkContent.length,
        originalSize: originalMovie?.size || 0,
        isComplete: originalMovie ? Math.abs(chunkContent.length - originalMovie.size) < 10 : false,
        startsWithMovie: true,
      };
    }

    return {
      chunkIndex: index + 1,
      movieName: 'Fragment/Continuation',
      chunkSize: chunkContent.length,
      originalSize: 0,
      isComplete: false,
      startsWithMovie: false,
    };
  });

  // Find movies that might be split
  const movieChunkCounts: Record<string, number> = {};
  chunkAnalysis.forEach((analysis) => {
    if (analysis.startsWithMovie) {
      movieChunkCounts[analysis.movieName] = (movieChunkCounts[analysis.movieName] || 0) + 1;
    }
  });

  // Find incomplete chunks (potential fragments)
  const incompleteChunks = chunkAnalysis.filter((a) => a.startsWithMovie && !a.isComplete);
  const fragmentChunks = chunkAnalysis.filter((a) => !a.startsWithMovie);

  console.log(`\nIncomplete movie chunks (potentially split):`);
  incompleteChunks.forEach((chunk) => {
    console.log(`- Chunk ${chunk.chunkIndex}: ${chunk.movieName}`);
    console.log(`  Original: ${chunk.originalSize} chars, Chunk: ${chunk.chunkSize} chars`);
  });

  console.log(`\nFragment chunks (continuations):`);
  fragmentChunks.slice(0, 5).forEach((chunk) => {
    const preview =
      chunk.chunkSize > 100
        ? chunks[chunk.chunkIndex - 1].pageContent.substring(0, 100) + '...'
        : chunks[chunk.chunkIndex - 1].pageContent;
    console.log(
      `- Chunk ${chunk.chunkIndex} (${chunk.chunkSize} chars): ${preview.replace(/\n/g, ' ')}`,
    );
  });

  return { incompleteChunks, fragmentChunks };
}

// Analyze default chunking
console.log(`\n🔍 ANALYZING DEFAULT CHUNKING (700 chars)`);
analyzeChunkMapping(defaultChunks, originalMovies);

// Analyze max chunking
console.log(`\n🔍 ANALYZING MAX CHUNKING (${maxChunkSize + 100} chars)`);
analyzeChunkMapping(maxChunks, originalMovies);

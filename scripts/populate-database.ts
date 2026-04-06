#!/usr/bin/env tsx

/**
 * Standalone script to populate the PopChoice movie database
 *
 * This script:
 * 1. Reads movies.txt file
 * 2. Splits into individual movie chunks (1:1 mapping)
 * 3. Checks for duplicates to avoid expensive embedding creation
 * 4. Creates embeddings only for new movies (cost optimization)
 * 5. Inserts new movies into the configured database (Supabase or PostgreSQL)
 *
 * Usage:
 *   npm run populate-db
 *   # or directly:
 *   tsx scripts/populate-database.ts
 *   # or with options:
 */

import path from 'path';

import { setDbClient } from '@/clients/dbClient';
import { createPgDbClient } from '@/clients/pgClient';
import { getMovieFileStats, splitMovieDocument } from '@/utils';

import { createEmbeddingsWithProgress } from '../src/utils/ai/embeddings';
import { getMovieStats } from '../src/utils/data/getMovieStats';

import type { ChunkWithEmbedding, MovieDocument } from '../src/utils/types';

// Parse command line arguments
const args = process.argv.slice(2);
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log(`
PopChoice Database Population Script

Usage:
  npm run populate-db
  tsx scripts/populate-database.ts [options]

Options:
  --help, -h      Show this help message

Environment Variables:
  OPENAI_API_KEY     Required for creating embeddings

  Database (one of the following):
  DATABASE_URL       PostgreSQL connection string (e.g. Railway)
  SUPABASE_URL       Supabase project URL (used with SUPABASE_API_KEY)
  SUPABASE_API_KEY   Supabase anon key

  If DATABASE_URL is set it takes priority over Supabase credentials.

Examples:
  npm run populate-db                    # Normal operation (skip duplicates)
  tsx scripts/populate-database.ts      # Same as above

`);
  process.exit(0);
}

// Check required environment variables
const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
const hasPg = Boolean(process.env.DATABASE_URL);
const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_API_KEY);

if (!hasOpenAI) {
  console.error('❌ Missing required environment variable: OPENAI_API_KEY');
  process.exit(1);
}

if (!hasPg && !hasSupabase) {
  console.error('❌ Missing database configuration.');
  console.error(
    '   Set DATABASE_URL for PostgreSQL or SUPABASE_URL + SUPABASE_API_KEY for Supabase.',
  );
  process.exit(1);
}

// If DATABASE_URL is set, configure the pg backend
if (hasPg) {
  console.log('🐘 Using PostgreSQL backend (DATABASE_URL detected)');
  setDbClient(createPgDbClient());
} else {
  console.log('⚡ Using Supabase backend (SUPABASE_URL detected)');
}

async function main() {
  console.log('🎬 PopChoice Database Population Script');
  console.log('=====================================\n');

  // Resolve path to movies.txt from project root
  const moviesPath = path.resolve(process.cwd(), 'movies.txt');

  // Check if movies file exists
  try {
    const fs = await import('fs/promises');
    await fs.access(moviesPath);
  } catch {
    console.error(`❌ Movies file not found: ${moviesPath}`);
    console.error('Please ensure movies.txt exists in the project root.');
    process.exit(1);
  }

  try {
    // Get original movie statistics
    const { movieCount } = getMovieStats(moviesPath);
    console.log(`📖 Original movies: ${movieCount}`);

    // Split using custom movie-aware splitter
    const chunks: MovieDocument[] = await splitMovieDocument(moviesPath);

    // Get chunk statistics
    const stats = await getMovieFileStats(moviesPath);

    console.log(`\n📊 Chunk Results:`);
    console.log(`- Generated chunks: ${chunks.length}`);
    console.log(`- Average chunk size: ${stats.avgChunkSize} characters`);
    console.log(`- Max chunk size: ${stats.maxChunkSize} characters`);
    console.log(`- Min chunk size: ${stats.minChunkSize} characters`);

    // Validate perfect 1:1 mapping
    const isPerfectMapping = chunks.length === movieCount;
    console.log(`- Perfect 1:1 mapping: ${isPerfectMapping ? '✅' : '❌'}`);

    if (!isPerfectMapping) {
      console.error(
        `\n❌ Data integrity error: Expected ${movieCount} chunks, got ${chunks.length}`,
      );
      console.error('This indicates corrupted data. Please check movies.txt format.');
      process.exit(1);
    }

    // Create embeddings for all movies
    // Note: We should check for duplicates BEFORE creating expensive embeddings
    console.log(`\n🔍 Checking for duplicates before creating embeddings...`);

    // Parse all movies first to check which ones are new
    const movieRecords: Array<{
      name: string;
      year: number;
      chunkIndex: number;
      chunk: (typeof chunks)[0];
    }> = [];
    const parseErrors: Array<{ index: number; error: string }> = [];

    // Import the parsing functions
    const { convertTextToMovieObjects, parseMovieNameAndYear } = await import('../src/utils/data');

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        const lines = chunk.pageContent.split('\n').filter(Boolean);
        const movieEntries = convertTextToMovieObjects(lines);

        if (movieEntries.length !== 1) {
          throw new Error(`Expected 1 movie per chunk, got ${movieEntries.length}`);
        }

        const movie = movieEntries[0];
        const parsedMovie = parseMovieNameAndYear(movie.movieName);

        movieRecords.push({
          name: parsedMovie.name,
          year: parsedMovie.year,
          chunkIndex: i,
          chunk: chunk,
        });
      } catch (error) {
        parseErrors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown parsing error',
        });
      }
    }

    console.log(`✅ Parsed ${movieRecords.length} movies successfully`);
    if (parseErrors.length > 0) {
      console.log(`⚠️ Failed to parse ${parseErrors.length} movies`);
    }

    // Check which movies already exist in database
    const { movieExists } = await import('../src/utils/database/validation');
    const newMovies: typeof movieRecords = [];
    const existingMovies: Array<{ name: string; year: number; index: number }> = [];

    console.log('🔍 Checking database for existing movies...');
    for (const record of movieRecords) {
      try {
        const exists = await movieExists(record.name, record.year);

        if (exists) {
          existingMovies.push({
            name: record.name,
            year: record.year,
            index: record.chunkIndex,
          });
        } else {
          newMovies.push(record);
        }
      } catch {
        // If we can't check, assume it's new (will be caught by unique constraint)
        newMovies.push(record);
      }
    }

    console.log(`🆕 New movies to process: ${newMovies.length}`);
    console.log(`🔄 Duplicate movies (will skip): ${existingMovies.length}`);

    if (existingMovies.length > 0) {
      console.log(`\n📋 Sample duplicates found:`);
      existingMovies.slice(0, 5).forEach((duplicate) => {
        console.log(`  - "${duplicate.name}" (${duplicate.year})`);
      });
      if (existingMovies.length > 5) {
        console.log(`  ... and ${existingMovies.length - 5} more duplicates`);
      }
    }

    // Only process chunks for NEW movies
    const newMovieIndices = new Set(newMovies.map((movie) => movie.chunkIndex));
    const chunksToProcess = chunks.filter((_, index) => newMovieIndices.has(index));

    console.log(`\n🧠 Creating embeddings for ${chunksToProcess.length} NEW movies only...`);

    if (chunksToProcess.length === 0) {
      console.log(`\n🎉 No new movies to process - all movies already exist in database!`);
      console.log(`✅ Successfully inserted: 0 movies`);
      console.log(`🔄 Skipped duplicates: ${existingMovies.length} movies`);
      console.log(`❌ Failed insertions: ${parseErrors.length} movies`);
      process.exit(parseErrors.length > 0 ? 1 : 0);
    }

    // Estimate cost for NEW movies only
    const estimatedTokens = chunksToProcess.length * 400;
    const estimatedCost = (estimatedTokens / 1000000) * 0.13; // $0.13 per 1M tokens

    console.log(
      `💰 Estimated cost: ~$${estimatedCost.toFixed(4)} USD (assuming ~400 tokens/movie)`,
    );

    const chunksWithEmbeddings: ChunkWithEmbedding<MovieDocument>[] =
      await createEmbeddingsWithProgress(chunksToProcess, {
        model: 'text-embedding-3-large',
        batchSize: 50,
        logProgress: true,
      });

    console.log(`✅ Created ${chunksWithEmbeddings.length} embeddings`);

    // Insert into database (skip duplicate check since we already filtered)
    console.log(`\n💾 Inserting movies into database...`);
    const { batchInsertMovies } = await import('../src/utils/database/operations');
    const insertResult = await batchInsertMovies(chunksWithEmbeddings, 100);

    // Final summary
    console.log(`\n🎉 Database Population Complete!`);
    console.log(`=====================================`);
    console.log(`✅ Successfully inserted: ${insertResult.totalSuccess} movies`);
    console.log(`🔄 Skipped duplicates: ${existingMovies.length} movies`);
    console.log(`❌ Failed insertions: ${insertResult.totalErrors + parseErrors.length} movies`);

    if (insertResult.totalErrors > 0 || parseErrors.length > 0) {
      console.log(`\n❌ Error Summary:`);
      [...insertResult.errorDetails, ...parseErrors].slice(0, 3).forEach((error) => {
        console.log(`  - Index ${error.index}: ${error.error}`);
      });
      const totalErrors = insertResult.totalErrors + parseErrors.length;
      if (totalErrors > 3) {
        console.log(`  ... and ${totalErrors - 3} more errors`);
      }
    }

    console.log(`\n📊 Final Statistics:`);
    console.log(`- Total movies processed: ${movieCount}`);
    console.log(`- Embeddings created: ${chunksWithEmbeddings.length}`);
    console.log(`- Database insertions: ${insertResult.totalSuccess}`);
    console.log(`- Skipped (duplicates): ${existingMovies.length}`);

    if (insertResult.totalSuccess > 0) {
      // Calculate actual cost based on estimated tokens per chunk
      const actualTokens = chunksWithEmbeddings.length * 400; // ~400 tokens per movie chunk
      const actualCost = (actualTokens / 1000000) * 0.13; // $0.13 per 1M tokens

      console.log(
        `\n💰 Approximate cost: $${actualCost.toFixed(4)} USD (${chunksWithEmbeddings.length} movies × ~400 tokens)`,
      );
    }

    process.exit(insertResult.totalErrors + parseErrors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error(`\n❌ Fatal error during database population:`);

    console.error(error instanceof Error ? error.message : 'Unknown error');

    console.error(`\nStack trace:`);

    console.error(error instanceof Error ? error.stack : 'No stack trace available');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n\n⏹️  Process interrupted by user`);

  console.log(`Database may be in partial state - safe to re-run script`);
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log(`\n\n⏹️  Process terminated`);
  process.exit(143);
});

// Run the main function
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

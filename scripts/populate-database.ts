#!/usr/bin/env tsx
import path from 'node:path';

import logger from '@/lib/logger';
import { getMovieFileStats, splitMovieDocument } from '@/utils';

import { createEmbeddingsWithProgress } from '../src/utils/ai/embeddings';
import { getMovieStats } from '../src/utils/data/getMovieStats';

import type { ChunkWithEmbedding, MovieDocument } from '../src/utils/types';

/**
 * Standalone script to populate the PopChoice movie database
 *
 * This script:
 * 1. Reads movies.txt file
 * 2. Splits into individual movie chunks (1:1 mapping)
 * 3. Checks for duplicates to avoid expensive embedding creation
 * 4. Creates embeddings only for new movies (cost optimization)
 * 5. Inserts new movies into the PostgreSQL database
 *
 * Usage:
 *   npm run populate-db
 *   # or directly:
 *   tsx scripts/populate-database.ts
 *   # or with options:
 */

// Parse command line arguments
const args = process.argv.slice(2);
const help = args.includes('--help') || args.includes('-h');

if (help) {
  logger.info(`
PopChoice Database Population Script

Usage:
  npm run populate-db
  tsx scripts/populate-database.ts [options]

Options:
  --help, -h      Show this help message

Environment Variables:
  OPENAI_API_KEY     Required for creating embeddings
  DATABASE_URL       PostgreSQL connection string (e.g. Railway)

Examples:
  npm run populate-db                    # Normal operation (skip duplicates)
  tsx scripts/populate-database.ts      # Same as above

`);
  process.exit(0);
}

// Check required environment variables
const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
const hasPg = Boolean(process.env.DATABASE_URL);

if (!hasOpenAI) {
  logger.error('❌ Missing required environment variable: OPENAI_API_KEY');
  process.exit(1);
}

if (!hasPg) {
  logger.error('❌ Missing required environment variable: DATABASE_URL');
  logger.error('   Set DATABASE_URL to your PostgreSQL connection string.');
  process.exit(1);
}

async function main() {
  logger.info('🎬 PopChoice Database Population Script');
  logger.info('=====================================\n');

  // Resolve path to movies.txt
  const moviesPath = path.resolve(process.cwd(), 'services/movie-seed/movies.txt');

  // Check if movies file exists
  try {
    const fs = await import('fs/promises');
    await fs.access(moviesPath);
  } catch {
    logger.error(`❌ Movies file not found: ${moviesPath}`);
    logger.error('Please ensure movies.txt exists at services/movie-seed/movies.txt.');
    process.exit(1);
  }

  try {
    // Get original movie statistics
    const { movieCount } = getMovieStats(moviesPath);
    logger.info(`📖 Original movies: ${movieCount}`);

    // Split using custom movie-aware splitter
    const chunks: MovieDocument[] = await splitMovieDocument(moviesPath);

    // Get chunk statistics
    const stats = await getMovieFileStats(moviesPath);

    logger.info(`\n📊 Chunk Results:`);
    logger.info(`- Generated chunks: ${chunks.length}`);
    logger.info(`- Average chunk size: ${stats.avgChunkSize} characters`);
    logger.info(`- Max chunk size: ${stats.maxChunkSize} characters`);
    logger.info(`- Min chunk size: ${stats.minChunkSize} characters`);

    // Validate perfect 1:1 mapping
    const isPerfectMapping = chunks.length === movieCount;
    logger.info(`- Perfect 1:1 mapping: ${isPerfectMapping ? '✅' : '❌'}`);

    if (!isPerfectMapping) {
      logger.error(
        `\n❌ Data integrity error: Expected ${movieCount} chunks, got ${chunks.length}`,
      );
      logger.error('This indicates corrupted data. Please check movies.txt format.');
      process.exit(1);
    }

    // Create embeddings for all movies
    // Note: We should check for duplicates BEFORE creating expensive embeddings
    logger.info(`\n🔍 Checking for duplicates before creating embeddings...`);

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

    logger.info(`✅ Parsed ${movieRecords.length} movies successfully`);
    if (parseErrors.length > 0) {
      logger.info(`⚠️ Failed to parse ${parseErrors.length} movies`);
    }

    // Check which movies already exist in database
    const { movieExists } = await import('../src/utils/database/validation');
    const newMovies: typeof movieRecords = [];
    const existingMovies: Array<{ name: string; year: number; index: number }> = [];

    logger.info('🔍 Checking database for existing movies...');
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

    logger.info(`🆕 New movies to process: ${newMovies.length}`);
    logger.info(`🔄 Duplicate movies (will skip): ${existingMovies.length}`);

    if (existingMovies.length > 0) {
      logger.info(`\n📋 Sample duplicates found:`);
      existingMovies.slice(0, 5).forEach((duplicate) => {
        logger.info(`  - "${duplicate.name}" (${duplicate.year})`);
      });
      if (existingMovies.length > 5) {
        logger.info(`  ... and ${existingMovies.length - 5} more duplicates`);
      }
    }

    // Only process chunks for NEW movies
    const newMovieIndices = new Set(newMovies.map((movie) => movie.chunkIndex));
    const chunksToProcess = chunks.filter((_, index) => newMovieIndices.has(index));

    logger.info(`\n🧠 Creating embeddings for ${chunksToProcess.length} NEW movies only...`);

    if (chunksToProcess.length === 0) {
      logger.info(`\n🎉 No new movies to process - all movies already exist in database!`);
      logger.info(`✅ Successfully inserted: 0 movies`);
      logger.info(`🔄 Skipped duplicates: ${existingMovies.length} movies`);
      logger.info(`❌ Failed insertions: ${parseErrors.length} movies`);
      process.exit(parseErrors.length > 0 ? 1 : 0);
    }

    // Estimate cost for NEW movies only
    const estimatedTokens = chunksToProcess.length * 400;
    const estimatedCost = (estimatedTokens / 1000000) * 0.13; // $0.13 per 1M tokens

    logger.info(
      `💰 Estimated cost: ~$${estimatedCost.toFixed(4)} USD (assuming ~400 tokens/movie)`,
    );

    const chunksWithEmbeddings: ChunkWithEmbedding<MovieDocument>[] =
      await createEmbeddingsWithProgress(chunksToProcess, {
        model: 'text-embedding-3-large',
        batchSize: 50,
        logProgress: true,
      });

    logger.info(`✅ Created ${chunksWithEmbeddings.length} embeddings`);

    // Insert into database (skip duplicate check since we already filtered)
    logger.info(`\n💾 Inserting movies into database...`);
    const { batchInsertMovies } = await import('../src/utils/database/operations');
    const insertResult = await batchInsertMovies(chunksWithEmbeddings, 100);

    // Final summary
    logger.info(`\n🎉 Database Population Complete!`);
    logger.info(`=====================================`);
    logger.info(`✅ Successfully inserted: ${insertResult.totalSuccess} movies`);
    logger.info(`🔄 Skipped duplicates: ${existingMovies.length} movies`);
    logger.info(`❌ Failed insertions: ${insertResult.totalErrors + parseErrors.length} movies`);

    if (insertResult.totalErrors > 0 || parseErrors.length > 0) {
      logger.info(`\n❌ Error Summary:`);
      [...insertResult.errorDetails, ...parseErrors].slice(0, 3).forEach((error) => {
        logger.info(`  - Index ${error.index}: ${error.error}`);
      });
      const totalErrors = insertResult.totalErrors + parseErrors.length;
      if (totalErrors > 3) {
        logger.info(`  ... and ${totalErrors - 3} more errors`);
      }
    }

    logger.info(`\n📊 Final Statistics:`);
    logger.info(`- Total movies processed: ${movieCount}`);
    logger.info(`- Embeddings created: ${chunksWithEmbeddings.length}`);
    logger.info(`- Database insertions: ${insertResult.totalSuccess}`);
    logger.info(`- Skipped (duplicates): ${existingMovies.length}`);

    if (insertResult.totalSuccess > 0) {
      // Calculate actual cost based on estimated tokens per chunk
      const actualTokens = chunksWithEmbeddings.length * 400; // ~400 tokens per movie chunk
      const actualCost = (actualTokens / 1000000) * 0.13; // $0.13 per 1M tokens

      logger.info(
        `\n💰 Approximate cost: $${actualCost.toFixed(4)} USD (${chunksWithEmbeddings.length} movies × ~400 tokens)`,
      );
    }

    process.exit(insertResult.totalErrors + parseErrors.length > 0 ? 1 : 0);
  } catch (error) {
    logger.error(`\n❌ Fatal error during database population:`);

    logger.error(error instanceof Error ? error.message : 'Unknown error');

    logger.error(`\nStack trace:`);

    logger.error(error instanceof Error ? error.stack : 'No stack trace available');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info(`\n\n⏹️  Process interrupted by user`);

  logger.info(`Database may be in partial state - safe to re-run script`);
  process.exit(130);
});

process.on('SIGTERM', () => {
  logger.info(`\n\n⏹️  Process terminated`);
  process.exit(143);
});

// Run the main function
main().catch((error) => {
  logger.error('❌ Unhandled error:', error);
  process.exit(1);
});

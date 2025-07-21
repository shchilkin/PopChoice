#!/usr/bin/env tsx

/**
 * Standalone script to populate the PopChoice movie database
 *
 * This script:
 * 1. Reads movies.txt file
 * 2. Splits into individual movie chunks (1:1 mapping)
 * 3. Checks for duplicates to avoid expensive embedding creation
 * 4. Creates embeddings only for new movies (cost optimization)
 * 5. Inserts new movies into Supabase database
 *
 * Usage:
 *   npm run populate-db
 *   # or directly:
 *   tsx scripts/populate-database.ts
 *   # or with options:
 *   tsx scripts/populate-database.ts --force-all
 */

import path from 'path';

import { createEmbeddingsWithProgress } from '../src/utils/ai/embeddings';
import { getMovieStats } from '../src/utils/data/movieAnalyzer';
import { getMovieFileStats, splitMovieDocument } from '../src/utils/data/movieSplitter';
import { batchInsertMoviesWithDuplicateCheck } from '../src/utils/database/insertMovies';

import type { ChunkWithEmbedding, MovieDocument } from '../src/utils/types';

// Parse command line arguments
const args = process.argv.slice(2);
const forceAll = args.includes('--force-all');
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log(`
PopChoice Database Population Script

Usage:
  npm run populate-db
  tsx scripts/populate-database.ts [options]

Options:
  --force-all     Skip duplicate checking and process all movies (expensive!)
  --help, -h      Show this help message

Environment Variables:
  OPENAI_API_KEY     Required for creating embeddings
  SUPABASE_URL       Required for database connection  
  SUPABASE_API_KEY   Required for database connection

Examples:
  npm run populate-db                    # Normal operation (skip duplicates)
  tsx scripts/populate-database.ts      # Same as above
  tsx scripts/populate-database.ts --force-all  # Process all movies (expensive)
`);
  process.exit(0);
}

// Check required environment variables
const requiredEnvVars = ['OPENAI_API_KEY', 'SUPABASE_URL'];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach((varName) => {
    console.error(`  - ${varName}`);
  });
  console.error('\nPlease set these variables in your .env file or environment.');
  process.exit(1);
}

async function main() {
  console.log('🎬 PopChoice Database Population Script');
  console.log('=====================================\n');

  if (forceAll) {
    console.log('⚠️  FORCE MODE: Processing all movies (will ignore duplicates check)');
    console.log('💰 This may result in high OpenAI API costs!\n');
  }

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
    // Note: Duplicate checking happens during insertion to avoid expensive embeddings for existing movies
    console.log(`\n🧠 Creating embeddings for ${chunks.length} movies...`);

    // Estimate ~400 tokens per movie chunk (conservative estimate)
    const estimatedTokens = chunks.length * 400;
    const estimatedCost = (estimatedTokens / 1000000) * 0.13; // $0.13 per 1M tokens

    console.log(
      `💰 Estimated cost: ~$${estimatedCost.toFixed(4)} USD (assuming ~400 tokens/movie)`,
    );

    const chunksWithEmbeddings: ChunkWithEmbedding<MovieDocument>[] =
      await createEmbeddingsWithProgress(chunks, {
        model: 'text-embedding-3-large',
        batchSize: 50,
        logProgress: true,
      });

    console.log(`✅ Created ${chunksWithEmbeddings.length} embeddings`);

    // Insert into database
    console.log(`\n💾 Inserting movies into database...`);
    const insertResult = await batchInsertMoviesWithDuplicateCheck(
      chunksWithEmbeddings,
      100, // batch size
      forceAll, // skip duplicate check if force mode
    );

    // Final summary
    console.log(`\n🎉 Database Population Complete!`);
    console.log(`=====================================`);
    console.log(`✅ Successfully inserted: ${insertResult.totalSuccess} movies`);
    console.log(`🔄 Skipped duplicates: ${insertResult.totalSkipped} movies`);
    console.log(`❌ Failed insertions: ${insertResult.totalErrors} movies`);

    if (insertResult.totalErrors > 0) {
      console.log(`\n❌ Error Summary:`);
      insertResult.errorDetails.slice(0, 3).forEach((error) => {
        console.log(`  - Index ${error.index}: ${error.error}`);
      });
      if (insertResult.errorDetails.length > 3) {
        console.log(`  ... and ${insertResult.errorDetails.length - 3} more errors`);
      }
    }

    console.log(`\n📊 Final Statistics:`);
    console.log(`- Total movies processed: ${movieCount}`);
    console.log(`- Embeddings created: ${chunksWithEmbeddings.length}`);
    console.log(`- Database insertions: ${insertResult.totalSuccess}`);
    console.log(`- Skipped (duplicates): ${insertResult.totalSkipped}`);

    if (insertResult.totalSuccess > 0) {
      // Calculate actual cost based on estimated tokens per chunk
      const actualTokens = chunksWithEmbeddings.length * 400; // ~400 tokens per movie chunk
      const actualCost = (actualTokens / 1000000) * 0.13; // $0.13 per 1M tokens

      console.log(
        `\n💰 Approximate cost: $${actualCost.toFixed(4)} USD (${chunksWithEmbeddings.length} movies × ~400 tokens)`,
      );
    }

    process.exit(insertResult.totalErrors > 0 ? 1 : 0);
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

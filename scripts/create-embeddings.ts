#!/usr/bin/env tsx

/**
 * Standalone script to create embeddings for movie data
 *
 * This script creates embeddings for movies in the database that don't have them yet.
 * It's useful when you have movies in the database but need to generate embeddings.
 *
 * Usage:
 *   npm run create-embeddings
 *   # or directly:
 *   tsx scripts/create-embeddings.ts
 */

import { supabase } from '../src/clients/supabaseClient';
import { createEmbeddingsWithProgress } from '../src/utils/ai/embeddings';

import type { MovieDocument } from '../src/utils/types';

async function main() {
  console.log('🎬 Starting embedding creation process...');
  console.log('='.repeat(80));

  try {
    // Fetch movies from database that don't have embeddings
    const { data: movies, error } = await supabase
      .from('movie_chunks')
      .select('*')
      .is('embedding', null);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!movies || movies.length === 0) {
      console.log('✅ All movies already have embeddings!');
      return;
    }

    console.log(`📊 Found ${movies.length} movies without embeddings`);
    console.log('🚀 Creating embeddings...');

    // Convert to the format expected by the embedding function
    const movieChunks: MovieDocument[] = movies.map((movie: any) => ({
      pageContent: movie.content,
      metadata: {
        title: movie.title,
        year: movie.year,
        genre: movie.genre,
        chunkIndex: movie.chunk_index,
      },
    }));

    // Create embeddings
    const chunksWithEmbeddings = await createEmbeddingsWithProgress(movieChunks, {
      model: 'text-embedding-3-large',
      batchSize: 20,
      logProgress: true,
    });

    // Update database with embeddings
    console.log('\n💾 Saving embeddings to database...');

    for (let i = 0; i < chunksWithEmbeddings.length; i++) {
      const chunk = chunksWithEmbeddings[i];
      const originalMovie = movies[i];

      const { error: updateError } = await supabase
        .from('movie_chunks')
        .update({ embedding: chunk.embedding })
        .eq('id', originalMovie.id);

      if (updateError) {
        console.error(`❌ Failed to update movie ${originalMovie.id}: ${updateError.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Embedding creation completed successfully!');
    console.log(`📈 Created and saved ${chunksWithEmbeddings.length} embeddings`);
  } catch (error) {
    console.error('\n❌ Embedding creation failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
PopChoice Embeddings Creation Script

Usage:
  npm run create-embeddings
  tsx scripts/create-embeddings.ts [options]

Options:
  --help, -h      Show this help message

Environment Variables:
  OPENAI_API_KEY     Required for creating embeddings
  SUPABASE_URL       Required for database connection  
  SUPABASE_API_KEY   Required for database connection

Description:
  Creates embeddings for movies in the database that don't have them yet.
  This is useful when you have movies in your database but need to generate
  their embeddings for vector similarity search.

Examples:
  npm run create-embeddings                    # Create embeddings for all movies without them
`);
  process.exit(0);
}

// Run the script
main();

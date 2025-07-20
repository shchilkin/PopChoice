import { supabase } from '@/clients';
import { parseMovieNameAndYear } from '@/utils/movies/parseMovieName';
import { convertTextToMovieObjects } from '@/utils/processMoviesData';

import type { ChunkWithEmbedding } from '@/utils/embeddings/createEmbeddings';
import type { MovieDocument } from '@/utils/movieSplitter';

/**
 * Database movie record matching the Supabase movies table structure
 */
export interface MovieRecord {
  name: string;
  year: number; // extracted year
  age_rating: string;
  description: string;
  duration: number; // in minutes
  score_rating: number;
  embedding: number[]; // vector(3072)
}

/**
 * Insert movies into Supabase movies table
 * @param chunksWithEmbeddings - Array of chunks with embeddings
 * @returns Results of the insertion
 */
export async function insertMoviesIntoSupabase(
  chunksWithEmbeddings: ChunkWithEmbedding<MovieDocument>[],
): Promise<{ success: number; errors: Array<{ index: number; error: string }> }> {
  const movieRecords: MovieRecord[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  // Parse each chunk into movie data
  for (let i = 0; i < chunksWithEmbeddings.length; i++) {
    const chunk = chunksWithEmbeddings[i];

    try {
      // Split chunk content into lines and parse
      const lines = chunk.pageContent.split('\n').filter(Boolean);
      const movieEntries = convertTextToMovieObjects(lines);

      if (movieEntries.length !== 1) {
        throw new Error(`Expected 1 movie per chunk, got ${movieEntries.length}`);
      }

      const movie = movieEntries[0];

      // Extract year from movie name and clean the name using utility function
      const parsedMovie = parseMovieNameAndYear(movie.movieName);

      // Map to database structure
      const movieRecord: MovieRecord = {
        name: parsedMovie.name,
        year: parsedMovie.year,
        age_rating: movie.ageRating,
        description: movie.description,
        duration: movie.duration, // Already converted to minutes by schema
        score_rating: movie.scoreRating, // Already converted to number by schema
        embedding: chunk.embedding,
      };
      movieRecords.push(movieRecord);
    } catch (error) {
      errors.push({
        index: i,
        error: error instanceof Error ? error.message : 'Unknown parsing error',
      });
    }
  }

  // Insert valid records into Supabase
  let successCount = 0;

  if (movieRecords.length > 0) {
    try {
      const { data, error } = await supabase.from('movies').insert(movieRecords).select('id');

      if (error) {
        throw error;
      }

      successCount = data?.length || 0;
    } catch {
      // If bulk insert fails, try individual inserts to isolate problematic records
      for (let i = 0; i < movieRecords.length; i++) {
        try {
          const { error } = await supabase.from('movies').insert([movieRecords[i]]);

          if (error) {
            throw error;
          }

          successCount++;
        } catch (singleError) {
          errors.push({
            index: i,
            error: singleError instanceof Error ? singleError.message : 'Database insertion error',
          });
        }
      }
    }
  }

  return {
    success: successCount,
    errors,
  };
}

/**
 * Batch insert movies with progress logging
 * @param chunksWithEmbeddings - Array of chunks with embeddings
 * @param batchSize - Number of records to insert per batch
 */
export async function batchInsertMovies(
  chunksWithEmbeddings: ChunkWithEmbedding<MovieDocument>[],
  batchSize: number = 100,
): Promise<{
  totalSuccess: number;
  totalErrors: number;
  errorDetails: Array<{ index: number; error: string }>;
}> {
  let totalSuccess = 0;
  const allErrors: Array<{ index: number; error: string }> = [];

  console.log(`\n📝 Inserting ${chunksWithEmbeddings.length} movies into Supabase...`);

  // Process in batches
  for (let i = 0; i < chunksWithEmbeddings.length; i += batchSize) {
    const batch = chunksWithEmbeddings.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(chunksWithEmbeddings.length / batchSize);

    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} movies)`);

    try {
      const result = await insertMoviesIntoSupabase(batch);

      totalSuccess += result.success;

      // Adjust error indices to be global
      const adjustedErrors = result.errors.map((error) => ({
        ...error,
        index: error.index + i,
      }));

      allErrors.push(...adjustedErrors);

      console.log(
        `✅ Batch ${batchNumber}: ${result.success} successful, ${result.errors.length} errors`,
      );
    } catch (batchError) {
      console.error(`❌ Batch ${batchNumber} failed:`, batchError);

      // Mark all items in this batch as errors
      for (let j = 0; j < batch.length; j++) {
        allErrors.push({
          index: i + j,
          error: batchError instanceof Error ? batchError.message : 'Batch processing error',
        });
      }
    }
  }

  console.log(`\n🎉 Insertion complete!`);
  console.log(`✅ Successfully inserted: ${totalSuccess} movies`);
  console.log(`❌ Failed insertions: ${allErrors.length} movies`);

  if (allErrors.length > 0) {
    console.log(`\n❌ Error details:`);
    allErrors.slice(0, 5).forEach((error) => {
      console.log(`  - Index ${error.index}: ${error.error}`);
    });
    if (allErrors.length > 5) {
      console.log(`  ... and ${allErrors.length - 5} more errors`);
    }
  }

  return {
    totalSuccess,
    totalErrors: allErrors.length,
    errorDetails: allErrors,
  };
}

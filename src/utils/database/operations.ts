import { getDbClient } from '@/clients/dbClient';
import { convertTextToMovieObjects, parseMovieNameAndYear } from '@/utils/data';

import { filterExistingMovies, getMovieCount } from './validation';

import type { ChunkWithEmbedding, MovieDocument, MovieRecord } from '../types';

/**
 * Insert movies into the database
 * @param chunksWithEmbeddings - Array of chunks with embeddings
 * @returns Results of the insertion
 */
export async function insertMovies(
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

  // Insert valid records into database
  let successCount = 0;
  const db = getDbClient();

  if (movieRecords.length > 0) {
    try {
      const { data, error } = await db.from('movies').insert(movieRecords).select('id');

      if (error) {
        throw error;
      }

      successCount = data?.length || 0;
    } catch {
      // If bulk insert fails, try individual inserts to isolate problematic records
      for (let i = 0; i < movieRecords.length; i++) {
        try {
          const { error } = await db.from('movies').insert([movieRecords[i]]);

          if (error) {
            throw error;
          }

          successCount++;
        } catch (singleError) {
          const errorMessage =
            singleError instanceof Error ? singleError.message : JSON.stringify(singleError);
          console.error(`❌ Insert error for record ${i}:`, errorMessage);
          errors.push({
            index: i,
            error: errorMessage,
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

  console.log(`\n📝 Inserting ${chunksWithEmbeddings.length} movies into database...`);

  // Process in batches
  for (let i = 0; i < chunksWithEmbeddings.length; i += batchSize) {
    const batch = chunksWithEmbeddings.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(chunksWithEmbeddings.length / batchSize);

    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} movies)`);

    try {
      const result = await insertMovies(batch);

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

/**
 * Batch insert movies with duplicate checking to avoid inserting existing movies
 * @param chunksWithEmbeddings - Array of chunks with embeddings
 * @param batchSize - Number of records to insert per batch
 * @param skipDuplicateCheck - Skip duplicate check for faster insertion (default: false)
 */
export async function batchInsertMoviesWithDuplicateCheck(
  chunksWithEmbeddings: ChunkWithEmbedding<MovieDocument>[],
  batchSize: number = 100,
  skipDuplicateCheck: boolean = false,
): Promise<{
  totalSuccess: number;
  totalErrors: number;
  totalSkipped: number;
  errorDetails: Array<{ index: number; error: string }>;
  duplicates: Array<{ name: string; year: number; index: number }>;
}> {
  console.log(`\n🔍 Checking for duplicates among ${chunksWithEmbeddings.length} movies...`);

  // First, get current database count
  const initialCount = await getMovieCount();
  console.log(`📊 Current movies in database: ${initialCount}`);

  if (!skipDuplicateCheck && chunksWithEmbeddings.length > 0) {
    // Parse all movies first to check for duplicates
    const movieRecords: MovieRecord[] = [];
    const parseErrors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < chunksWithEmbeddings.length; i++) {
      const chunk = chunksWithEmbeddings[i];

      try {
        const lines = chunk.pageContent.split('\n').filter(Boolean);
        const movieEntries = convertTextToMovieObjects(lines);

        if (movieEntries.length !== 1) {
          throw new Error(`Expected 1 movie per chunk, got ${movieEntries.length}`);
        }

        const movie = movieEntries[0];
        const parsedMovie = parseMovieNameAndYear(movie.movieName);

        const movieRecord: MovieRecord = {
          name: parsedMovie.name,
          year: parsedMovie.year,
          age_rating: movie.ageRating,
          description: movie.description,
          duration: movie.duration,
          score_rating: movie.scoreRating,
          embedding: chunk.embedding,
        };

        movieRecords.push(movieRecord);
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

    // Filter out existing movies
    const { newMovies, existingMovies } = await filterExistingMovies(movieRecords);

    console.log(`🆕 New movies to insert: ${newMovies.length}`);
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

    // Insert only new movies
    if (newMovies.length > 0) {
      // Create a mapping from the movieRecords back to their original chunk indices
      const movieRecordToChunkIndex: Map<number, number> = new Map();
      let recordIndex = 0;

      for (let chunkIndex = 0; chunkIndex < chunksWithEmbeddings.length; chunkIndex++) {
        // Skip chunks that had parsing errors
        if (parseErrors.some((error) => error.index === chunkIndex)) {
          continue;
        }
        // Map this record index to its original chunk index
        movieRecordToChunkIndex.set(recordIndex, chunkIndex);
        recordIndex++;
      }

      // Find which chunks correspond to new movies
      const newChunks: ChunkWithEmbedding<MovieDocument>[] = [];
      const existingMovieIndices = new Set(existingMovies.map((existing) => existing.index));

      for (let i = 0; i < movieRecords.length; i++) {
        if (!existingMovieIndices.has(i)) {
          const originalChunkIndex = movieRecordToChunkIndex.get(i);
          if (originalChunkIndex !== undefined) {
            newChunks.push(chunksWithEmbeddings[originalChunkIndex]);
          }
        }
      }

      console.log(
        `📦 Sending ${newChunks.length} chunks to database (${newMovies.length} records expected)`,
      );

      const insertResult = await batchInsertMovies(newChunks, batchSize);

      return {
        totalSuccess: insertResult.totalSuccess,
        totalErrors: insertResult.totalErrors + parseErrors.length,
        totalSkipped: existingMovies.length,
        errorDetails: [...insertResult.errorDetails, ...parseErrors],
        duplicates: existingMovies,
      };
    } else {
      return {
        totalSuccess: 0,
        totalErrors: parseErrors.length,
        totalSkipped: existingMovies.length,
        errorDetails: parseErrors,
        duplicates: existingMovies,
      };
    }
  } else {
    // Skip duplicate check - use existing function
    const result = await batchInsertMovies(chunksWithEmbeddings, batchSize);
    return {
      totalSuccess: result.totalSuccess,
      totalErrors: result.totalErrors,
      totalSkipped: 0,
      errorDetails: result.errorDetails,
      duplicates: [],
    };
  }
}

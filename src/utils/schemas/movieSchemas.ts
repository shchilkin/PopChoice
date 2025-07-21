import { z } from 'zod';

/**
 * Schema for validating movie chunk data structure
 * Used for analyzing movie data files and chunk sizes
 */
export const movieChunkSchema = z.object({
  /** Name of the movie */
  name: z.string().min(1, 'Movie name cannot be empty'),
  /** Size of the chunk in characters */
  chunkSize: z.number().int().positive('Chunk size must be a positive integer'),
  /** Number of lines in the chunk */
  lineCount: z.number().int().positive('Line count must be a positive integer'),
  /** Sequential chunk number in the file */
  chunkNumber: z.number().int().positive('Chunk number must be a positive integer'),
  /** Full content of the movie chunk */
  content: z.string().min(1, 'Content cannot be empty'),
});

/**
 * Array of movie chunks schema for batch validation
 */
export const movieChunksArraySchema = z.array(movieChunkSchema);

/**
 * Schema for parsed movie name and year
 */
export const parsedMovieSchema = z.object({
  name: z.string(),
  year: z.number(),
});

/**
 * Schema for movie document metadata
 */
export const movieDocumentSchema = z.object({
  pageContent: z.string(),
  metadata: z.object({
    movieIndex: z.number(),
    movieName: z.string(),
    chunkSize: z.number(),
    source: z.string(),
  }),
});

/**
 * Schema for movie database records
 */
export const movieRecordSchema = z.object({
  name: z.string(),
  year: z.number(),
  age_rating: z.string(),
  description: z.string(),
  duration: z.number(), // Duration in minutes
  score_rating: z.number(),
  embedding: z.array(z.number()),
});

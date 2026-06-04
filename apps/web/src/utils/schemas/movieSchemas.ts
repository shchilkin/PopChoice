import { z } from 'zod';

/**
 * Enum for movie age ratings
 */
export const ageRatings = z.enum(['G', 'PG', 'PG-13', 'R', 'NR', '12+', '15', '16+', '18+']);

/**
 * Helper function to convert duration string to minutes
 * This is used in the schema transformation and available for testing
 */
function parseDurationToMinutes(duration: string): number {
  if (!duration || typeof duration !== 'string') {
    return 0;
  }

  const trimmed = duration.trim();
  let totalMinutes = 0;

  // Match hours: "1h", "2h", etc.
  const hoursMatch = trimmed.match(/(\d+)h/);
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1], 10) * 60;
  }

  // Match minutes: "42m", "90m", etc.
  const minutesMatch = trimmed.match(/(\d+)m/);
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1], 10);
  }

  // If no hours or minutes found, try to parse as plain number (assume minutes)
  if (totalMinutes === 0) {
    const numberMatch = trimmed.match(/^(\d+)$/);
    if (numberMatch) {
      totalMinutes = parseInt(numberMatch[1], 10);
    }
  }

  return totalMinutes;
}

/**
 * Schema for parsing movie entries from text files
 * Used for converting raw text data into structured movie objects
 */
export const movieSchema = z.object({
  movieName: z.string(),
  ageRating: ageRatings,
  duration: z
    .string()
    .transform((val) => parseDurationToMinutes(val))
    .refine((num) => num > 0, { message: 'Duration must be a positive number' }),
  scoreRating: z
    .string()
    .transform((val) => Number(val.replace(/rating/i, '').trim()))
    .refine((num) => !isNaN(num), { message: 'Score rating must be a number' }),
  description: z.string(),
});

/**
 * Array of movie entries schema for batch validation
 */
export const moviesArraySchema = z.array(movieSchema);

/**
 * Raw movie entry type for text parsing
 */
export const rawMovieEntrySchema = z.object({
  movieName: z.string(),
  ageRating: z.string(),
  duration: z.string(),
  scoreRating: z.string(),
  description: z.string(),
});

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
 * Schema for movie metadata used in document processing
 */
export const movieMetadataSchema = z.object({
  movieIndex: z.number().int().positive(),
  movieName: z.string().min(1),
  chunkSize: z.number().int().nonnegative(),
  source: z.string().min(1),
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

/**
 * Schema for movie file statistics
 * Used for analyzing movie data files and their chunk distributions
 */
export const movieFileStatsSchema = z.object({
  totalChunks: z.number().int().nonnegative('Total chunks must be non-negative'),
  avgChunkSize: z.number().int().nonnegative('Average chunk size must be non-negative'),
  maxChunkSize: z.number().int().nonnegative('Max chunk size must be non-negative'),
  minChunkSize: z.number().int().nonnegative('Min chunk size must be non-negative'),
  totalFileSize: z.number().int().nonnegative('Total file size must be non-negative'),
});

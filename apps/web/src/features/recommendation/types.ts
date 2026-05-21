import z from 'zod';

import { PARTICIPANT_NAME_MAX_LENGTH } from './limits';

// ---------------------------------------------------------------------------
// Request validation schemas
// ---------------------------------------------------------------------------

export const personFormDataSchema = z.object({
  name: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z
      .string()
      .trim()
      .max(PARTICIPANT_NAME_MAX_LENGTH, 'Name must be 80 characters or fewer')
      .optional(),
  ),
  favoriteMovie: z.string().trim().max(200, 'Favorite movie must be 200 characters or fewer'),
  favoriteMovieWhy: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().trim().max(300, 'Favorite movie reason must be 300 characters or fewer').optional(),
  ),
  newVsClassic: z
    .string()
    .trim()
    .min(1, 'New vs Classic preference is required')
    .max(100, 'New vs Classic preference must be 100 characters or fewer'),
  moodPreference: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Mood preference cannot be empty')
        .max(100, 'Each mood preference must be 100 characters or fewer'),
    )
    .min(1, 'At least one mood preference is required')
    .max(10, 'No more than 10 mood preferences allowed'),
  tonePreference: z
    .string()
    .trim()
    .min(1, 'Tone preference is required')
    .max(100, 'Tone preference must be 100 characters or fewer'),
  favoriteActor: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().trim().max(100, 'Favorite actor must be 100 characters or fewer').optional(),
  ),
});

export const requestBodySchema = z.union([
  personFormDataSchema, // Single person
  z
    .array(personFormDataSchema)
    .min(1, 'At least one person is required')
    .max(10, 'No more than 10 people allowed'), // Multiple people
]);

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

export const recommendationResponseSchema = z
  .object({
    description: z.string(),
    title: z.string().describe('The title of the recommended movie'),
  })
  .strict();

export const recommendationResponseJsonSchema = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    title: {
      type: 'string',
      description: 'The title of the recommended movie',
    },
  },
  required: ['description', 'title'],
  additionalProperties: false,
} as const;

export const apiResponseSchema = z.object({
  description: z.string(),
  title: z.string(),
  posterURL: z.string().url().optional(),
  // Enhanced movie details from the matched result
  movieDetails: z
    .object({
      year: z.number(),
      age_rating: z.string(),
      duration: z.number(),
      score_rating: z.number(),
      similarity: z.number(),
    })
    .optional(),
  // All similar movies found (for debugging or alternative suggestions)
  similarMovies: z
    .array(
      z.object({
        id: z.number(),
        tmdbId: z.number().nullable().optional(),
        name: z.string(),
        year: z.number(),
        similarity: z.number(),
        age_rating: z.string(),
        duration: z.number(),
        score_rating: z.number(),
        posterURL: z.string().url().optional(), // Added poster URL support
        aiDescription: z.string().optional(), // Added AI-generated description
        localizedName: z.string().optional(), // Localized title from TMDB
        isMainRecommendation: z.boolean().optional(), // Mark main recommendation
        fromTMDB: z.boolean().optional(), // True for movies sourced from TMDB fallback
      }),
    )
    .optional(),
  // Flag indicating that TMDB fallback was used to broaden results
  usedBroaderSearch: z.boolean().optional(),
  // Actual number of movies in the local database (for display)
  dbMovieCount: z.number().optional(),
});

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

export type PersonFormData = z.infer<typeof personFormDataSchema>;
export type RecommendationRequestBody = z.infer<typeof requestBodySchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;

/** Full movie match enriched with metadata from the database or TMDB. */
export type EnhancedMovieMatch = {
  id: number;
  name: string;
  age_rating: string;
  description: string;
  duration: number;
  score_rating: number;
  year: number;
  tmdbId?: number | null;
  similarity: number;
  content: string;
  /** Pre-populated poster URL, e.g. from TMDB discover response — skips re-lookup if set. */
  posterURL?: string;
};

/** Minimal movie match returned from the vector DB RPC. */
export type MovieMatch = {
  id: number;
  content: string;
  similarity: number;
};

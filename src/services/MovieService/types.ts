import z from 'zod';

export const POSTER_SIZES = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'] as const;

export const posterSize = z.enum(POSTER_SIZES).default('original');

export type PosterSize = z.infer<typeof posterSize>;

export const TMDB_MovieDetailsSchema = z.object({
  adult: z.boolean(),
  backdrop_path: z.string().nullable(),
  genre_ids: z.array(z.number()),
  id: z.number(),
  original_language: z.string(),
  original_title: z.string(),
  overview: z.string(),
  popularity: z.number(),
  poster_path: z.string().nullable(),
  release_date: z.string(),
  title: z.string(),
  video: z.boolean(),
  vote_average: z.number(),
  vote_count: z.number(),
});

export type TMDB_MovieEntry = z.infer<typeof TMDB_MovieDetailsSchema>;

import { z } from 'zod';

export const deleteMovieMemorySchema = z
  .object({
    movieKey: z.string().min(1).max(160),
  })
  .strict();

export const searchMovieMemorySchema = z
  .object({
    query: z.string().trim().min(2).max(80),
  })
  .strict();

export const listMovieMemorySchema = z
  .object({
    offset: z.coerce.number().int().min(0).optional().default(0),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  })
  .strict();

const movieMemoryIdSchema = z.coerce
  .number()
  .int()
  .refine((value) => value !== 0, 'Movie id is required');

export const addMovieMemorySchema = z
  .object({
    movieId: movieMemoryIdSchema,
    kind: z.enum(['watched', 'not_seen']).optional().default('watched'),
    locale: z.enum(['en', 'ru', 'fi']).optional(),
  })
  .strict();

export const addMovieMemoryBatchSchema = z
  .object({
    locale: z.enum(['en', 'ru', 'fi']).optional(),
    items: z
      .array(
        z
          .object({
            movieId: movieMemoryIdSchema,
            kind: z.enum(['watched', 'not_seen']).optional().default('watched'),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();

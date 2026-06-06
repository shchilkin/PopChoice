import z from 'zod';

const tmdbDiscoverMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string(),
  release_date: z.string(),
  vote_average: z.number(),
  vote_count: z.number().optional(),
  popularity: z.number().optional(),
  original_language: z.string().optional(),
  original_title: z.string().optional(),
  genre_ids: z.array(z.number()).optional(),
  poster_path: z.string().nullable(),
});

export type TMDBDiscoverMovie = z.infer<typeof tmdbDiscoverMovieSchema>;

export const tmdbDiscoverResponseSchema = z.object({
  results: z.array(tmdbDiscoverMovieSchema).optional(),
});

export type TMDBDiscoverQueryShape = {
  genreIds: number[];
  sortBy: string;
  voteCountGte: number;
  withoutGenreIds: number[];
  primary_release_date_gte?: string;
  primary_release_date_lte?: string;
  with_runtime_lte?: number;
};

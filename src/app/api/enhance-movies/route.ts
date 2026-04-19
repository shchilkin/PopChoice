import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import logger from '@/lib/logger';
import { withAuth } from '@/lib/withAuth';

import type { MovieRecommendation } from '@/utils/client';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const requestBodySchema = z.object({
  movies: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      year: z.number(),
      similarity: z.number(),
      age_rating: z.string().optional(),
      duration: z.number().optional(),
      score_rating: z.number().optional(),
      posterURL: z.string().optional(),
      description: z.string().optional(),
      localizedName: z.string().optional(),
      isMainRecommendation: z.boolean().optional(),
      fromTMDB: z.boolean().optional(),
    }),
  ),
});

interface TMDBMovieData {
  id: number;
  title: string;
  poster_path?: string;
  overview?: string;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
}

function createEnhancedDescription(movie: MovieRecommendation, tmdbData: TMDBMovieData): string {
  const details = [];

  // Add our similarity score
  if (movie.similarity) {
    details.push(`${Math.round(movie.similarity * 100)}% match`);
  }

  // Add release year
  if (movie.year) {
    details.push(`Released: ${movie.year}`);
  }

  // Add age rating
  if (movie.age_rating) {
    details.push(`Rating: ${movie.age_rating}`);
  }

  // Add duration
  if (movie.duration) {
    details.push(`Duration: ${movie.duration} min`);
  }

  // Add our score rating
  if (movie.score_rating) {
    details.push(`Score: ${movie.score_rating}/10`);
  }

  // Add TMDB vote average if available
  if (tmdbData.vote_average && tmdbData.vote_average > 0) {
    details.push(`TMDB: ${tmdbData.vote_average.toFixed(1)}/10`);
  }

  // Add TMDB overview if available (truncated)
  let description = details.join(' • ');

  if (tmdbData.overview) {
    const overview =
      tmdbData.overview.length > 200
        ? `${tmdbData.overview.substring(0, 200)}...`
        : tmdbData.overview;
    description = `${description}\n\n${overview}`;
  }

  return description;
}

async function enhanceMovieWithPoster(
  movie: MovieRecommendation,
  tmdbApiKey: string,
): Promise<MovieRecommendation> {
  try {
    const searchQuery = encodeURIComponent(`${movie.name} ${movie.year}`);
    const searchUrl = `${TMDB_BASE_URL}/search/movie?query=${searchQuery}&year=${movie.year}`;

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${tmdbApiKey}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status, movie: movie.name },
        'TMDB API error during enhancement',
      );
      return movie;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const movieData = data.results[0];

      const posterURL = movieData.poster_path
        ? `${TMDB_IMAGE_BASE_URL}/w500${movieData.poster_path}`
        : undefined;

      const enhancedDescription = createEnhancedDescription(movie, movieData);

      return {
        ...movie,
        posterURL,
        description: enhancedDescription,
      };
    }

    return movie;
  } catch (error) {
    logger.warn({ err: error, movieTitle: movie.name }, 'Failed to enhance movie');
    return movie;
  }
}

async function postHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const tmdbApiKey = process.env.TMDB_API_KEY;

    // We parse the body to extract the movies array
    const body = await request.json();
    const parsedBody = requestBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: parsedBody.error.issues },
        { status: 400 },
      );
    }

    const { movies } = parsedBody.data;

    // If TMDB API key is not configured, just return the movies as-is
    if (!tmdbApiKey) {
      logger.warn('TMDB_API_KEY not configured — skipping enhancement');
      return NextResponse.json({ enhancedMovies: movies });
    }

    const enhancedMovies: MovieRecommendation[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      const batch = movies.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((movie) => enhanceMovieWithPoster(movie, tmdbApiKey));
      const batchResults = await Promise.all(batchPromises);
      enhancedMovies.push(...batchResults);

      if (i + BATCH_SIZE < movies.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return NextResponse.json({ enhancedMovies });
  } catch (error) {
    logger.error({ err: error }, 'Unexpected error in enhance-movies API');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);

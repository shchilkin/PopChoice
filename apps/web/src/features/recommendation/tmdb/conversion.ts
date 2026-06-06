import { IMAGE_BASE_URL } from '@/integrations/tmdb';
import { parseTMDBReleaseYear } from '@/lib/tmdb';

import type { EnhancedMovieMatch } from '../types';
import type { TMDBDiscoverMovie } from './types';

export function tmdbMovieToEnhancedMatch(
  movie: TMDBDiscoverMovie,
  similarity: number,
): EnhancedMovieMatch {
  const year = parseTMDBReleaseYear(movie.release_date);
  const score = Number(movie.vote_average?.toFixed(1)) || 0;

  const content = [`${movie.title} (${year}) | TMDB Score: ${score}/10`, movie.overview || '']
    .filter(Boolean)
    .join('\n');
  const posterURL = movie.poster_path ? `${IMAGE_BASE_URL}/w500${movie.poster_path}` : undefined;

  return {
    id: -movie.id,
    tmdbId: movie.id,
    name: movie.title,
    age_rating: 'NR',
    description: movie.overview || '',
    duration: 0,
    score_rating: score,
    year,
    similarity,
    content,
    originalLanguage: movie.original_language ?? null,
    popularity: movie.popularity ?? null,
    posterURL,
    source: 'tmdb-discover',
    voteCount: movie.vote_count ?? null,
  };
}

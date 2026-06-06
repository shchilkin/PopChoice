import { parseTMDBReleaseYear } from '@/lib/tmdb';

export type TMDBMovieEmbeddingTextInput = {
  title: string;
  overview?: string | null;
  release_date: string;
  vote_average?: number | null;
};

export function formatTMDBMovieEmbeddingText(movie: TMDBMovieEmbeddingTextInput): string {
  const year = parseTMDBReleaseYear(movie.release_date);
  const score = Number(movie.vote_average?.toFixed(1)) || 0;
  return [`${movie.title} (${year}) | TMDB Score: ${score}/10`, movie.overview || '']
    .filter(Boolean)
    .join('\n');
}

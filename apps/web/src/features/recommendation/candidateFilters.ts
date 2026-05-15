import type { TMDBDiscoverMovie } from './tmdb';
import type { EnhancedMovieMatch, PersonFormData } from './types';

function normalizeMovieTitle(title: string): string {
  return title
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/^(the|a|an)\s+/, '')
    .replace(/\s+/g, ' ');
}

export function getMentionedMovieTitleKeys(allPeopleData: PersonFormData[]): Set<string> {
  return new Set(
    allPeopleData
      .map((person) => normalizeMovieTitle(person.favoriteMovie))
      .filter((title) => title.length > 0),
  );
}

export function isMentionedMovieTitle(title: string, mentionedTitleKeys: Set<string>): boolean {
  const normalizedTitle = normalizeMovieTitle(title);
  if (!normalizedTitle) return false;
  return mentionedTitleKeys.has(normalizedTitle);
}

export function excludeMentionedLocalMovies(
  movies: EnhancedMovieMatch[],
  mentionedTitleKeys: Set<string>,
): EnhancedMovieMatch[] {
  if (mentionedTitleKeys.size === 0) return movies;
  return movies.filter((movie) => !isMentionedMovieTitle(movie.name, mentionedTitleKeys));
}

export function excludeMentionedTMDBMovies(
  movies: TMDBDiscoverMovie[],
  mentionedTitleKeys: Set<string>,
): TMDBDiscoverMovie[] {
  if (mentionedTitleKeys.size === 0) return movies;
  return movies.filter((movie) => !isMentionedMovieTitle(movie.title, mentionedTitleKeys));
}

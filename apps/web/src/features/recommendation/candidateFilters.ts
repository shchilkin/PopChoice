import { getMovieIdentityKey, getMovieTitleKey, getYearFromReleaseDate } from '@/lib/movieIdentity';

import type { TMDBDiscoverMovie } from './tmdb';
import type { EnhancedMovieMatch, PersonFormData } from './types';
import type {
  RecommendationFeedbackKind,
  UserMovieInteractionKind,
} from '@/lib/db/recommendations';

export type FeedbackMoviePreference = {
  kind: RecommendationFeedbackKind | UserMovieInteractionKind;
  movieKey?: string | null;
  tmdbId?: number | null;
  movieName: string;
  movieYear: number | null;
};

export type FeedbackCandidateSignals = {
  excludedMovieKeys: Set<string>;
  excludedTitleKeys: Set<string>;
  downrankMovieKeys: Set<string>;
  downrankTitleKeys: Set<string>;
};

const FEEDBACK_DOWNRANK_AMOUNT = 0.08;

export function getMentionedMovieTitleKeys(allPeopleData: PersonFormData[]): Set<string> {
  return new Set(
    allPeopleData
      .map((person) => getMovieTitleKey(person.favoriteMovie))
      .filter((title): title is string => Boolean(title)),
  );
}

export function isMentionedMovieTitle(title: string, mentionedTitleKeys: Set<string>): boolean {
  const normalizedTitle = getMovieTitleKey(title);
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

export function getFeedbackCandidateSignals(
  preferences: FeedbackMoviePreference[],
): FeedbackCandidateSignals {
  const excludedMovieKeys = new Set<string>();
  const excludedTitleKeys = new Set<string>();
  const downrankMovieKeys = new Set<string>();
  const downrankTitleKeys = new Set<string>();

  for (const preference of preferences) {
    const movieKey =
      preference.movieKey ??
      getMovieIdentityKey({
        tmdbId: preference.tmdbId,
        title: preference.movieName,
        year: preference.movieYear,
      });
    const titleKey = getMovieTitleKey(preference.movieName);

    if (
      preference.kind === 'already_watched' ||
      preference.kind === 'watched' ||
      preference.kind === 'not_interested' ||
      preference.kind === 'too_obvious' ||
      preference.kind === 'too_obscure'
    ) {
      if (movieKey) excludedMovieKeys.add(movieKey);
      if (titleKey) excludedTitleKeys.add(titleKey);
    }

    if (preference.kind === 'wrong_mood') {
      if (movieKey) downrankMovieKeys.add(movieKey);
      if (titleKey) downrankTitleKeys.add(titleKey);
    }
  }

  return { excludedMovieKeys, excludedTitleKeys, downrankMovieKeys, downrankTitleKeys };
}

function getLocalMovieIdentityKey(movie: EnhancedMovieMatch): string | null {
  return getMovieIdentityKey({ title: movie.name, year: movie.year });
}

function getTMDBMovieIdentityKey(movie: TMDBDiscoverMovie): string | null {
  return getMovieIdentityKey({
    tmdbId: movie.id,
    title: movie.title,
    year: getYearFromReleaseDate(movie.release_date),
  });
}

function isFeedbackExcludedLocalMovie(
  movie: EnhancedMovieMatch,
  signals: FeedbackCandidateSignals,
): boolean {
  const movieKey = getLocalMovieIdentityKey(movie);
  const titleKey = getMovieTitleKey(movie.name);
  return Boolean(
    (movieKey && signals.excludedMovieKeys.has(movieKey)) ||
    (titleKey && signals.excludedTitleKeys.has(titleKey)),
  );
}

function isFeedbackDownrankedLocalMovie(
  movie: EnhancedMovieMatch,
  signals: FeedbackCandidateSignals,
): boolean {
  const movieKey = getLocalMovieIdentityKey(movie);
  const titleKey = getMovieTitleKey(movie.name);
  return Boolean(
    (movieKey && signals.downrankMovieKeys.has(movieKey)) ||
    (titleKey && signals.downrankTitleKeys.has(titleKey)),
  );
}

function isFeedbackExcludedTMDBMovie(
  movie: TMDBDiscoverMovie,
  signals: FeedbackCandidateSignals,
): boolean {
  const movieKey = getTMDBMovieIdentityKey(movie);
  const titleKey = getMovieTitleKey(movie.title);
  return Boolean(
    (movieKey && signals.excludedMovieKeys.has(movieKey)) ||
    (titleKey && signals.excludedTitleKeys.has(titleKey)),
  );
}

export function applyFeedbackToLocalMovies(
  movies: EnhancedMovieMatch[],
  signals: FeedbackCandidateSignals,
): EnhancedMovieMatch[] {
  if (
    signals.excludedMovieKeys.size === 0 &&
    signals.excludedTitleKeys.size === 0 &&
    signals.downrankMovieKeys.size === 0 &&
    signals.downrankTitleKeys.size === 0
  ) {
    return movies;
  }

  return movies
    .filter((movie) => !isFeedbackExcludedLocalMovie(movie, signals))
    .map((movie) => {
      if (!isFeedbackDownrankedLocalMovie(movie, signals)) return movie;

      return {
        ...movie,
        similarity: Math.max(0, movie.similarity - FEEDBACK_DOWNRANK_AMOUNT),
      };
    })
    .sort((a, b) => b.similarity - a.similarity);
}

export function excludeFeedbackTMDBMovies(
  movies: TMDBDiscoverMovie[],
  signals: FeedbackCandidateSignals,
): TMDBDiscoverMovie[] {
  if (signals.excludedMovieKeys.size === 0 && signals.excludedTitleKeys.size === 0) return movies;
  return movies.filter((movie) => !isFeedbackExcludedTMDBMovie(movie, signals));
}

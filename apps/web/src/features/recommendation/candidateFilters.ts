import { getMovieIdentityKey, getMovieTitleKey, getYearFromReleaseDate } from '@/lib/movieIdentity';

import type { TMDBDiscoverMovie } from './tmdb';
import type { EnhancedMovieMatch, PersonFormData } from './types';
import type {
  RecommendationFeedbackKind,
  UserRecommendationMemoryKind,
  UserMovieInteractionKind,
} from '@/lib/db/recommendations';

export type FeedbackMoviePreference = {
  kind: RecommendationFeedbackKind | UserMovieInteractionKind | UserRecommendationMemoryKind;
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
  boostMovieKeys: Set<string>;
  boostTitleKeys: Set<string>;
};

const FEEDBACK_DOWNRANK_AMOUNT = 0.08;
const LIKED_MEMORY_BOOST_AMOUNT = 0.04;

const EXCLUDED_FEEDBACK_KINDS = new Set<FeedbackMoviePreference['kind']>([
  'already_watched',
  'not_interested',
  'recently_recommended',
  'too_obscure',
  'too_obvious',
  'watched',
]);

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
  const signals = createEmptyFeedbackCandidateSignals();

  for (const preference of preferences) {
    addPreferenceToSignals(signals, preference);
  }

  return signals;
}

function createEmptyFeedbackCandidateSignals(): FeedbackCandidateSignals {
  return {
    boostMovieKeys: new Set<string>(),
    boostTitleKeys: new Set<string>(),
    downrankMovieKeys: new Set<string>(),
    downrankTitleKeys: new Set<string>(),
    excludedMovieKeys: new Set<string>(),
    excludedTitleKeys: new Set<string>(),
  };
}

function addPreferenceToSignals(
  signals: FeedbackCandidateSignals,
  preference: FeedbackMoviePreference,
) {
  const keys = getPreferenceKeys(preference);
  const targets = getSignalTargets(signals, preference.kind);

  if (!targets) {
    return;
  }

  addFeedbackKeys(targets.movieKeys, targets.titleKeys, keys);
}

function getPreferenceKeys(preference: FeedbackMoviePreference) {
  return {
    movieKey:
      preference.movieKey ??
      getMovieIdentityKey({
        tmdbId: preference.tmdbId,
        title: preference.movieName,
        year: preference.movieYear,
      }),
    titleKey: getMovieTitleKey(preference.movieName),
  };
}

function getSignalTargets(
  signals: FeedbackCandidateSignals,
  kind: FeedbackMoviePreference['kind'],
) {
  if (EXCLUDED_FEEDBACK_KINDS.has(kind)) {
    return { movieKeys: signals.excludedMovieKeys, titleKeys: signals.excludedTitleKeys };
  }

  if (kind === 'wrong_mood') {
    return { movieKeys: signals.downrankMovieKeys, titleKeys: signals.downrankTitleKeys };
  }

  if (kind === 'liked') {
    return { movieKeys: signals.boostMovieKeys, titleKeys: signals.boostTitleKeys };
  }

  return null;
}

function addFeedbackKeys(
  movieKeys: Set<string>,
  titleKeys: Set<string>,
  keys: { movieKey: string | null; titleKey: string | null },
) {
  if (keys.movieKey) movieKeys.add(keys.movieKey);
  if (keys.titleKey) titleKeys.add(keys.titleKey);
}

function getLocalMovieIdentityKey(movie: EnhancedMovieMatch): string | null {
  return getMovieIdentityKey({ tmdbId: movie.tmdbId, title: movie.name, year: movie.year });
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

function isFeedbackBoostedLocalMovie(
  movie: EnhancedMovieMatch,
  signals: FeedbackCandidateSignals,
): boolean {
  const movieKey = getLocalMovieIdentityKey(movie);
  const titleKey = getMovieTitleKey(movie.name);
  return Boolean(
    (movieKey && signals.boostMovieKeys.has(movieKey)) ||
    (titleKey && signals.boostTitleKeys.has(titleKey)),
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
    signals.downrankTitleKeys.size === 0 &&
    signals.boostMovieKeys.size === 0 &&
    signals.boostTitleKeys.size === 0
  ) {
    return movies;
  }

  return movies
    .filter((movie) => !isFeedbackExcludedLocalMovie(movie, signals))
    .map((movie) => {
      const isDownranked = isFeedbackDownrankedLocalMovie(movie, signals);
      const isBoosted = !isDownranked && isFeedbackBoostedLocalMovie(movie, signals);

      if (!isDownranked && !isBoosted) return movie;

      return {
        ...movie,
        similarity: Math.min(
          1,
          Math.max(
            0,
            movie.similarity -
              (isDownranked ? FEEDBACK_DOWNRANK_AMOUNT : 0) +
              (isBoosted ? LIKED_MEMORY_BOOST_AMOUNT : 0),
          ),
        ),
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

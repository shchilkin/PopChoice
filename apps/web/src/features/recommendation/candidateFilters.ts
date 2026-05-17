import type { TMDBDiscoverMovie } from './tmdb';
import type { EnhancedMovieMatch, PersonFormData } from './types';
import type { RecommendationFeedbackKind } from '@/lib/db/recommendations';

export type FeedbackMoviePreference = {
  kind: RecommendationFeedbackKind;
  movieName: string;
  movieYear: number | null;
};

export type FeedbackCandidateSignals = {
  excludedTitleKeys: Set<string>;
  downrankTitleKeys: Set<string>;
};

const FEEDBACK_DOWNRANK_AMOUNT = 0.08;

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

function getMovieTitleKey(title: string): string | null {
  const normalized = normalizeMovieTitle(title);
  return normalized.length > 0 ? normalized : null;
}

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
  const excludedTitleKeys = new Set<string>();
  const downrankTitleKeys = new Set<string>();

  for (const preference of preferences) {
    const titleKey = getMovieTitleKey(preference.movieName);
    if (!titleKey) continue;

    if (
      preference.kind === 'already_watched' ||
      preference.kind === 'wrong_mood' ||
      preference.kind === 'too_obvious' ||
      preference.kind === 'too_obscure'
    ) {
      excludedTitleKeys.add(titleKey);
    }

    if (preference.kind === 'wrong_mood' || preference.kind === 'too_obvious') {
      downrankTitleKeys.add(titleKey);
    }
  }

  return { excludedTitleKeys, downrankTitleKeys };
}

function isFeedbackExcludedTitle(title: string, signals: FeedbackCandidateSignals): boolean {
  const titleKey = getMovieTitleKey(title);
  if (!titleKey) return false;
  return signals.excludedTitleKeys.has(titleKey);
}

function isFeedbackDownrankedTitle(title: string, signals: FeedbackCandidateSignals): boolean {
  const titleKey = getMovieTitleKey(title);
  if (!titleKey) return false;
  return signals.downrankTitleKeys.has(titleKey);
}

export function applyFeedbackToLocalMovies(
  movies: EnhancedMovieMatch[],
  signals: FeedbackCandidateSignals,
): EnhancedMovieMatch[] {
  if (signals.excludedTitleKeys.size === 0 && signals.downrankTitleKeys.size === 0) {
    return movies;
  }

  return movies
    .filter((movie) => !isFeedbackExcludedTitle(movie.name, signals))
    .map((movie) => {
      if (!isFeedbackDownrankedTitle(movie.name, signals)) return movie;

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
  if (signals.excludedTitleKeys.size === 0) return movies;
  return movies.filter((movie) => !isFeedbackExcludedTitle(movie.title, signals));
}

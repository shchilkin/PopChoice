import { getMovieTitleKey } from '@/lib/movieIdentity';

import type { EnhancedMovieMatch } from './types';
import type { Locale } from '@/lib/locale';

type RecommendationMessage = {
  description: string;
  title: string;
};

type CandidateMovie = Pick<EnhancedMovieMatch, 'id' | 'name' | 'year'>;

type GuardedRecommendation<TMovie extends CandidateMovie> = {
  description: string;
  movie: TMovie;
  replacedOutOfSetTitle: boolean;
  requestedTitle: string;
  title: string;
};

function getTitleKeys(title: string, year?: number): Set<string> {
  const keys = new Set<string>();
  const titleKey = getMovieTitleKey(title);
  if (titleKey) keys.add(titleKey);

  const withoutTrailingYear = title.replace(/\s*\(\d{4}\)\s*$/, '');
  const withoutTrailingYearKey = getMovieTitleKey(withoutTrailingYear);
  if (withoutTrailingYearKey) keys.add(withoutTrailingYearKey);

  if (year) {
    const withYearKey = getMovieTitleKey(`${title} (${year})`);
    if (withYearKey) keys.add(withYearKey);
  }

  return keys;
}

export function findCandidateByRecommendedTitle<TMovie extends CandidateMovie>(
  movies: TMovie[],
  recommendedTitle: string,
): TMovie | undefined {
  const recommendedKeys = getTitleKeys(recommendedTitle);
  if (recommendedKeys.size === 0) return undefined;

  return movies.find((movie) => {
    const movieKeys = getTitleKeys(movie.name, movie.year);
    return Array.from(movieKeys).some((key) => recommendedKeys.has(key));
  });
}

function buildMemoryFallbackDescription(movieTitle: string, locale: Locale): string {
  if (locale === 'ru') {
    return `${movieTitle} выбран из самых сильных оставшихся совпадений с учетом вашей памяти о фильмах, чтобы не повторять уже просмотренные или недавние рекомендации.`;
  }

  if (locale === 'fi') {
    return `${movieTitle} valittiin vahvimmista jäljellä olevista osumista elokuvamuistisi perusteella, jotta emme toista jo katsottuja tai hiljattain suositeltuja elokuvia.`;
  }

  return `${movieTitle} was picked from your strongest remaining matches after applying your movie memory, so we avoid titles you have already watched or recently seen here.`;
}

export function resolveGuardedRecommendation<TMovie extends CandidateMovie>(
  responseMessage: RecommendationMessage,
  movies: TMovie[],
  locale: Locale,
): GuardedRecommendation<TMovie> {
  const matchedMovie = findCandidateByRecommendedTitle(movies, responseMessage.title);
  if (matchedMovie) {
    return {
      description: responseMessage.description,
      movie: matchedMovie,
      replacedOutOfSetTitle: false,
      requestedTitle: responseMessage.title,
      title: matchedMovie.name,
    };
  }

  const fallbackMovie = movies[0];
  if (!fallbackMovie) {
    throw new Error('No recommendation candidates are available.');
  }

  return {
    description: buildMemoryFallbackDescription(fallbackMovie.name, locale),
    movie: fallbackMovie,
    replacedOutOfSetTitle: true,
    requestedTitle: responseMessage.title,
    title: fallbackMovie.name,
  };
}

import { MIN_HIGH_QUALITY_LOCAL, SIMILARITY_THRESHOLD } from './config';

import type { RecommendationSourceStrategy } from './types';

export { MIN_HIGH_QUALITY_LOCAL, SIMILARITY_THRESHOLD } from './config';

/** Pure routing helper — separated so it can be unit-tested without mocking the full route. */
export function shouldFallBackToTMDB(movies: { similarity: number }[]): boolean {
  return movies.filter((m) => m.similarity >= SIMILARITY_THRESHOLD).length < MIN_HIGH_QUALITY_LOCAL;
}

export type TMDBFallbackDecision = {
  reason:
    | 'external-lookup-disabled'
    | 'local-results-sufficient'
    | 'local-results-insufficient'
    | 'tmdb-first-primary';
  shouldAttempt: boolean;
};

export function getTMDBFallbackDecision(
  sourceStrategy: RecommendationSourceStrategy,
  movies: { similarity: number }[],
): TMDBFallbackDecision {
  if (sourceStrategy === 'curated-showcase' || sourceStrategy === 'memory-aware-local') {
    return {
      reason: 'external-lookup-disabled',
      shouldAttempt: false,
    };
  }

  if (sourceStrategy === 'tmdb-first') {
    return {
      reason: 'tmdb-first-primary',
      shouldAttempt: true,
    };
  }

  if (shouldFallBackToTMDB(movies)) {
    return {
      reason: 'local-results-insufficient',
      shouldAttempt: true,
    };
  }

  return {
    reason: 'local-results-sufficient',
    shouldAttempt: false,
  };
}

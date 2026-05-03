import { MIN_HIGH_QUALITY_LOCAL, SIMILARITY_THRESHOLD } from './config';

export { MIN_HIGH_QUALITY_LOCAL, SIMILARITY_THRESHOLD } from './config';

/** Pure routing helper — separated so it can be unit-tested without mocking the full route. */
export function shouldFallBackToTMDB(movies: { similarity: number }[]): boolean {
  return movies.filter((m) => m.similarity >= SIMILARITY_THRESHOLD).length < MIN_HIGH_QUALITY_LOCAL;
}

/** Minimum cosine similarity for a local result to be considered "high quality". */
export const SIMILARITY_THRESHOLD = 0.4;

/** Trigger TMDB fallback when fewer than this many high-quality local results are found. */
export const MIN_HIGH_QUALITY_LOCAL = 3;

/** Pure routing helper — separated so it can be unit-tested without mocking the full route. */
export function shouldFallBackToTMDB(movies: { similarity: number }[]): boolean {
  return movies.filter((m) => m.similarity >= SIMILARITY_THRESHOLD).length < MIN_HIGH_QUALITY_LOCAL;
}

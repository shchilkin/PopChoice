// UI-related utilities
export * from './colors';

/**
 * Empirical cosine similarity ceiling for text-embedding-3-large on movie queries.
 * No query in the current workload produces a score above this value.
 * Update when re-running `npm run calibrate-similarity` with a new model or larger DB.
 */
export const SIMILARITY_CEILING = 0.62;

/**
 * Scale a raw cosine similarity score to a 0–100 display percentage.
 * 0.62 (the observable ceiling) maps to 100%; scores above the ceiling are clamped.
 */
export function scaleSimilarity(raw: number): number {
  return Math.min(100, Math.round((raw / SIMILARITY_CEILING) * 100));
}

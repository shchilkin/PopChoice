/**
 * Shared TMDB utilities used by both `movie-recommendation` and `more-tmdb-picks` routes.
 */

/**
 * Mapping from normalised genre labels to TMDB genre IDs.
 * Labels are normalised (lowercased, non-alpha stripped) before lookup so that
 * quiz values like "Sci-Fi" → "scifi" and "Action" → "action" resolve correctly.
 */
export const GENRE_LABEL_TO_TMDB_ID: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  drama: 18,
  horror: 27,
  romance: 10749,
  scifi: 878,
  thriller: 53,
  documentary: 99,
};

/**
 * Normalise a quiz genre label to a stable genre key.
 * Strips non-alpha characters and lowercases so "Sci-Fi" → "scifi".
 */
export function normalizeGenreLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z]/g, '');
}

/** Extract a 4-digit year from a TMDB `release_date` string ("YYYY-MM-DD"), defaulting to 0. */
export function parseTMDBReleaseYear(releaseDate: string | null | undefined): number {
  return releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : 0;
}

/**
 * Dot product of two unit-norm vectors equals cosine similarity.
 * OpenAI embeddings (text-embedding-3-large) are L2-normalised, so this is exact.
 * Returns 0 for mismatched embedding lengths and logs a warning so the issue is observable.
 * Callers may provide a structured logger callback (for example, `logger.warn`) to keep
 * runtime warnings consistent with the rest of the server code.
 */
export function cosineSimilarity(
  a: number[],
  b: number[],
  warn: (message: string) => void = console.warn,
): number {
  if (a.length !== b.length) {
    warn(
      `cosineSimilarity received embeddings with mismatched lengths: ${a.length} !== ${b.length}`,
    );
    return 0;
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/** Minimum cosine similarity returned from the DB RPC before a row is considered at all. */
export const LOCAL_VECTOR_MATCH_THRESHOLD = 0.1;

/** Minimum cosine similarity for a local result to be considered high quality. */
export const SIMILARITY_THRESHOLD = 0.4;

/** Trigger TMDB fallback when fewer than this many local results qualify. */
export const MIN_HIGH_QUALITY_LOCAL = 3;

/** Maximum movies in the final merged result set. */
export const MAX_TOTAL_MOVIES = 6;

/** Maximum number of TMDB movies to JIT-seed per request. */
export const MAX_JIT_SEED_MOVIES = 5;

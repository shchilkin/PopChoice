import z from 'zod';

import { openAIClient } from '@/clients';
import { getDbClient } from '@/clients/dbClient';
import logger from '@/lib/logger';
import { IMAGE_BASE_URL } from '@/services';

import type { EnhancedMovieMatch, PersonFormData } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum movies in the final merged result set. */
export const MAX_TOTAL_MOVIES = 6;

/** Maximum number of TMDB movies to JIT-seed per request. */
const MAX_JIT_SEED_MOVIES = 5;

/** TMDB API base URL (v3). */
const TMDB_API_BASE = 'https://api.themoviedb.org/3';

/** Timeout for TMDB discover requests in the main recommendation route. */
const TMDB_DISCOVER_FETCH_TIMEOUT_MS = 8_000;

const tmdbDiscoverMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string(),
  release_date: z.string(),
  vote_average: z.number(),
  poster_path: z.string().nullable(),
});

export type TMDBDiscoverMovie = z.infer<typeof tmdbDiscoverMovieSchema>;

const tmdbDiscoverResponseSchema = z.object({
  results: z.array(tmdbDiscoverMovieSchema).optional(),
});

/**
 * Mapping from stable genre IDs to TMDB genre IDs.
 * The quiz sends genre *labels* (e.g. "Sci-Fi") via toApiFormat. We normalize
 * labels to IDs by stripping non-alpha chars and lowercasing before lookup.
 */
const GENRE_LABEL_TO_TMDB_ID: Record<string, number> = {
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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a quiz genre label to a stable genre key.
 * Strips non-alpha characters and lowercases so "Sci-Fi" → "scifi", "Action" → "action".
 */
function normalizeGenreLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z]/g, '');
}

/** Extract a 4-digit year from a TMDB `release_date` string ("YYYY-MM-DD"), defaulting to 0. */
export function parseTMDBReleaseYear(releaseDate: string | null | undefined): number {
  return releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : 0;
}

/**
 * Derive TMDB /discover/movie query parameters from user quiz preferences.
 * Uses a deterministic mapping to avoid an extra LLM call.
 *
 * The quiz sends human-readable labels (e.g. "Sci-Fi", "New", "Serious and thought-provoking")
 * which we normalize to stable keys before mapping.
 */
function extractTMDBParams(allPeopleData: PersonFormData[]): {
  genre_ids: number[];
  sort_by: string;
  primary_release_date_gte?: string;
  primary_release_date_lte?: string;
} {
  // Aggregate mood preferences across all people.
  // Normalize labels: "Sci-Fi" → "scifi", "Action" → "action", etc.
  const moodCounts: Record<string, number> = {};
  allPeopleData.forEach((p) => {
    p.moodPreference.forEach((mood) => {
      const key = normalizeGenreLabel(mood);
      moodCounts[key] = (moodCounts[key] ?? 0) + 1;
    });
  });

  // Top genres (up to 3) mapped to TMDB IDs
  const genre_ids = Object.entries(moodCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => GENRE_LABEL_TO_TMDB_ID[key])
    .filter((id): id is number => id !== undefined);

  // Era preference: normalize to 'new' | 'classic' | 'both' by keyword matching.
  // Quiz sends e.g. "New", "Classic", "Both new and classic".
  const eraCounts: Record<string, number> = {};
  allPeopleData.forEach((p) => {
    const era = p.newVsClassic.toLowerCase();
    let key: string;
    if (era.includes('both')) {
      key = 'both';
    } else if (era.includes('classic')) {
      key = 'classic';
    } else if (era.includes('new')) {
      key = 'new';
    } else {
      key = 'both';
    }
    eraCounts[key] = (eraCounts[key] ?? 0) + 1;
  });
  const dominantEra = Object.entries(eraCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'both';

  const currentYear = new Date().getFullYear();
  let primary_release_date_gte: string | undefined;
  let primary_release_date_lte: string | undefined;
  if (dominantEra === 'new') {
    primary_release_date_gte = `${currentYear - 5}-01-01`;
  } else if (dominantEra === 'classic') {
    primary_release_date_lte = '2000-12-31';
  }

  // Tone → sort order. Quiz sends e.g. "Serious and thought-provoking", "Dark and intense".
  // Normalize by keyword matching.
  const toneCounts: Record<string, number> = {};
  allPeopleData.forEach((p) => {
    const tone = p.tonePreference.toLowerCase();
    let key: string;
    if (tone.includes('serious')) {
      key = 'serious';
    } else if (tone.includes('dark')) {
      key = 'dark';
    } else if (tone.includes('balanced')) {
      key = 'balanced';
    } else {
      key = 'light';
    }
    toneCounts[key] = (toneCounts[key] ?? 0) + 1;
  });
  const dominantTone = Object.entries(toneCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'light';
  const sort_by =
    dominantTone === 'serious' || dominantTone === 'dark' ? 'vote_average.desc' : 'popularity.desc';

  return { genre_ids, sort_by, primary_release_date_gte, primary_release_date_lte };
}

// ---------------------------------------------------------------------------
// TMDB API
// ---------------------------------------------------------------------------

/**
 * Call TMDB /discover/movie and return up to MAX_TOTAL_MOVIES results.
 * Returns an empty array on any error so callers can treat failures gracefully.
 */
export async function fetchTMDBDiscoverMovies(
  allPeopleData: PersonFormData[],
  tmdbApiKey: string,
): Promise<TMDBDiscoverMovie[]> {
  try {
    const params = extractTMDBParams(allPeopleData);

    const url = new URL(`${TMDB_API_BASE}/discover/movie`);
    if (params.genre_ids.length > 0) {
      url.searchParams.set('with_genres', params.genre_ids.join('|'));
    }
    url.searchParams.set('sort_by', params.sort_by);
    url.searchParams.set('vote_count.gte', '100');
    url.searchParams.set('include_adult', 'false');
    url.searchParams.set('page', '1');
    if (params.primary_release_date_gte) {
      url.searchParams.set('primary_release_date.gte', params.primary_release_date_gte);
    }
    if (params.primary_release_date_lte) {
      url.searchParams.set('primary_release_date.lte', params.primary_release_date_lte);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${tmdbApiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(TMDB_DISCOVER_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, 'TMDB discover request failed');
      return [];
    }

    const parsedResponse = tmdbDiscoverResponseSchema.safeParse(await response.json());
    if (!parsedResponse.success) {
      logger.warn({ zodError: parsedResponse.error }, 'TMDB discover response validation failed');
      return [];
    }
    return (parsedResponse.data.results ?? []).slice(0, MAX_TOTAL_MOVIES);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn({ timeoutMs: TMDB_DISCOVER_FETCH_TIMEOUT_MS }, 'TMDB discover request timed out');
      return [];
    }
    logger.warn({ err: error }, 'Error fetching movies from TMDB discover');
    return [];
  }
}

// ---------------------------------------------------------------------------
// Similarity scoring
// ---------------------------------------------------------------------------

/**
 * Dot product of two unit-norm vectors equals their cosine similarity.
 * OpenAI embeddings (text-embedding-3-large) are L2-normalised, so this is exact.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    logger.warn(
      { aLength: a.length, bLength: b.length },
      'Skipping cosine similarity for mismatched embedding lengths',
    );
    return 0;
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Embed every TMDB movie in a single batched API call, compute real cosine similarity
 * against the user's query embedding, and return fully-populated EnhancedMovieMatch objects.
 * Falls back to a neutral score (0.35) for any movie whose embedding could not be obtained.
 */
export async function scoreAndConvertTMDBMovies(
  movies: TMDBDiscoverMovie[],
  queryEmbedding: number[],
): Promise<{ matches: EnhancedMovieMatch[]; embeddings: Map<number, number[]> }> {
  if (movies.length === 0) return { matches: [], embeddings: new Map() };

  const texts = movies.map((m) => {
    const year = parseTMDBReleaseYear(m.release_date);
    const score = Number(m.vote_average?.toFixed(1)) || 0;
    return [`${m.title} (${year}) | TMDB Score: ${score}/10`, m.overview || '']
      .filter(Boolean)
      .join('\n');
  });

  let rawEmbeddings: number[][] = [];
  try {
    const response = await openAIClient.embeddings.create({
      model: 'text-embedding-3-large',
      input: texts,
    });
    rawEmbeddings = response.data.map((d) => d.embedding);
  } catch (error) {
    logger.warn(
      { err: error },
      'Failed to embed TMDB movies for similarity scoring — using fallback score',
    );
  }

  const embeddingsMap = new Map<number, number[]>();
  const matches = movies.map((movie, i) => {
    const movieEmbedding = rawEmbeddings[i];
    if (movieEmbedding) embeddingsMap.set(movie.id, movieEmbedding);
    const similarity = movieEmbedding ? cosineSimilarity(queryEmbedding, movieEmbedding) : 0.35;
    return tmdbMovieToEnhancedMatch(movie, similarity);
  });

  return { matches, embeddings: embeddingsMap };
}

/**
 * Convert a TMDB discover result to the EnhancedMovieMatch shape used by the rest of the route.
 * Uses a negative TMDB ID so it is distinct from positive local DB IDs.
 */
function tmdbMovieToEnhancedMatch(
  movie: TMDBDiscoverMovie,
  similarity: number,
): EnhancedMovieMatch {
  const year = parseTMDBReleaseYear(movie.release_date);
  const score = Number(movie.vote_average?.toFixed(1)) || 0;

  const content = [`${movie.title} (${year}) | TMDB Score: ${score}/10`, movie.overview || '']
    .filter(Boolean)
    .join('\n');

  // Carry the TMDB poster path through so enhanceSimilarMoviesWithPosters can skip its re-query
  const posterURL = movie.poster_path ? `${IMAGE_BASE_URL}/w500${movie.poster_path}` : undefined;

  return {
    id: -movie.id, // Negative ID distinguishes TMDB-sourced movies from local DB rows (positive bigserial IDs)
    name: movie.title,
    age_rating: 'NR',
    description: movie.overview || '',
    duration: 0,
    score_rating: score,
    year,
    similarity,
    content,
    posterURL,
  };
}

// ---------------------------------------------------------------------------
// JIT seeding
// ---------------------------------------------------------------------------

/**
 * Serializable shape used when passing precomputed embeddings through queue payloads.
 */
export type SerializableTMDBEmbeddings = Record<string, number[]>;

export function serializeTMDBEmbeddings(
  embeddings?: Map<number, number[]>,
): SerializableTMDBEmbeddings | undefined {
  if (!embeddings || embeddings.size === 0) return undefined;
  return Object.fromEntries(
    Array.from(embeddings.entries()).map(([movieId, embedding]) => [String(movieId), embedding]),
  );
}

export function deserializeTMDBEmbeddings(
  serialized?: SerializableTMDBEmbeddings,
): Map<number, number[]> | undefined {
  if (!serialized) return undefined;
  const entries: Array<[number, number[]]> = Object.entries(serialized).flatMap(
    ([movieId, embedding]) => {
      const parsedMovieId = Number(movieId);
      const isValidMovieId = Number.isFinite(parsedMovieId) && Number.isInteger(parsedMovieId);
      const isValidEmbedding =
        Array.isArray(embedding) &&
        embedding.every((value) => typeof value === 'number' && Number.isFinite(value));

      if (!isValidMovieId || !isValidEmbedding) return [];
      return [[parsedMovieId, embedding]];
    },
  );
  return new Map(entries);
}

/**
 * Seed TMDB movies into the local DB for future local vector search.
 */
export async function seedMovies(
  tmdbMovies: TMDBDiscoverMovie[],
  existingLocalKeys: Set<string>,
  precomputedEmbeddings?: Map<number, number[]>,
): Promise<void> {
  const db = getDbClient();
  if (!db.isConfigured()) return;

  // Avoid re-seeding movies already present in the local results for this request
  const toSeed = tmdbMovies.filter(
    (m) =>
      !existingLocalKeys.has(`${m.title.toLowerCase()}|${parseTMDBReleaseYear(m.release_date)}`),
  );
  if (toSeed.length === 0) return;

  const candidateMovies = toSeed.slice(0, MAX_JIT_SEED_MOVIES);
  if (candidateMovies.length === 0) return;

  // Bulk DB existence check to avoid wasting OpenAI embedding tokens on rows that already exist.
  // The DB uniqueness constraint is (name, year). We query by the movies.name column (matching
  // the TMDB title) only, then filter by year in-memory to build exact composite keys —
  // avoids a Cartesian product from two .in() clauses.
  const existingMovieKeys = new Set<string>();
  try {
    // TMDB movies use `title`; the DB column is `name` — same value, different field names.
    const movieNames = candidateMovies.map((m) => m.title);
    const { data: existingMovies, error } = await db
      .from<{ name: string; year: number }>('movies')
      .select('name, year')
      .in('name', movieNames);

    if (error) {
      logger.warn({ err: error }, 'JIT seeding existence pre-check failed');
    } else {
      for (const row of existingMovies ?? []) {
        existingMovieKeys.add(`${row.name.toLowerCase()}|${Number(row.year ?? 0)}`);
      }
    }
  } catch (err) {
    logger.warn({ err }, 'JIT seeding existence pre-check failed with unexpected error');
  }

  for (const movie of candidateMovies) {
    try {
      const year = parseTMDBReleaseYear(movie.release_date);
      const movieKey = `${movie.title.toLowerCase()}|${year}`;

      if (existingMovieKeys.has(movieKey)) {
        logger.debug(
          { movieTitle: movie.title, year },
          'JIT seeding skipped — movie already in database',
        );
        continue;
      }

      const score = Number(movie.vote_average?.toFixed(1)) || 0;

      // Reuse the embedding already computed during similarity scoring if available,
      // falling back to a fresh API call only for movies not in the precomputed map.
      let embedding: number[] | undefined = precomputedEmbeddings?.get(movie.id);
      if (!embedding) {
        const embeddingText = [
          `${movie.title} (${year})`,
          `Rating: NR`,
          `Duration: 0 min`,
          `Score: ${score}/10`,
          `Description: ${movie.overview || ''}`,
        ].join('\n');

        const embeddingResponse = await openAIClient.embeddings.create({
          model: 'text-embedding-3-large',
          input: embeddingText,
        });
        embedding = embeddingResponse.data[0]?.embedding;
      }
      if (!embedding) continue;

      const { error: insertError } = await db.from('movies').insert({
        name: movie.title,
        year,
        age_rating: 'NR',
        description: movie.overview || '',
        duration: 0,
        score_rating: score,
        embedding,
      });

      if (insertError) {
        const errMsg = insertError.message;
        const isDuplicateEntry =
          errMsg.toLowerCase().includes('unique') ||
          errMsg.toLowerCase().includes('duplicate') ||
          errMsg.toLowerCase().includes('already exists');

        if (isDuplicateEntry) {
          logger.debug(
            { movieTitle: movie.title },
            'JIT seeding skipped — movie already in database',
          );
        } else {
          logger.warn({ err: insertError, movieTitle: movie.title }, 'JIT seeding insert failed');
        }
        continue;
      }

      logger.info({ movieTitle: movie.title, year }, 'JIT seeded TMDB movie into database');
    } catch (err) {
      // Catch truly thrown errors (e.g. network failures during embedding)
      const errMsg = err instanceof Error ? err.message : String(err);
      const isDuplicateEntry =
        errMsg.toLowerCase().includes('unique') ||
        errMsg.toLowerCase().includes('duplicate') ||
        errMsg.toLowerCase().includes('already exists');

      if (isDuplicateEntry) {
        logger.debug(
          { movieTitle: movie.title },
          'JIT seeding skipped — movie already in database',
        );
      } else {
        logger.warn({ err, movieTitle: movie.title }, 'JIT seeding failed with unexpected error');
      }
    }
  }
}

/**
 * Fire-and-forget wrapper kept for fail-open fallback when queueing is unavailable.
 */
export function seedMoviesInBackground(
  tmdbMovies: TMDBDiscoverMovie[],
  existingLocalKeys: Set<string>,
  precomputedEmbeddings?: Map<number, number[]>,
): void {
  void seedMovies(tmdbMovies, existingLocalKeys, precomputedEmbeddings);
}

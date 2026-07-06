import { getDbClient } from '@/clients/dbClient';
import { getOpenAIClient } from '@/clients/openaiClient';
import { IMAGE_BASE_URL } from '@/integrations/tmdb';
import logger from '@/lib/logger';
import { MODELS } from '@/lib/models';
import { OPENAI_TIMEOUTS_MS, openAIRequestOptions } from '@/lib/openaiTimeout';
import { parseTMDBReleaseYear } from '@/lib/tmdb';

import { MAX_JIT_SEED_MOVIES } from '../config';

import { formatTMDBMovieEmbeddingText } from './embeddingText';

import type { TMDBDiscoverMovie } from './types';

type ExistingMovieRow = {
  id: string | number;
  name: string;
  poster_url: string | null;
  year: number;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function isDuplicateEntryErrorMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes('unique') ||
    normalizedMessage.includes('duplicate') ||
    normalizedMessage.includes('already exists')
  );
}

function logJITSeedingError(input: { error: unknown; movieTitle: string; warnMessage: string }) {
  if (isDuplicateEntryErrorMessage(getErrorMessage(input.error))) {
    logger.debug(
      { movieTitle: input.movieTitle },
      'JIT seeding skipped — movie already in database',
    );
    return;
  }

  logger.warn({ err: input.error, movieTitle: input.movieTitle }, input.warnMessage);
}

function getTMDBSeedMovieKey(movie: TMDBDiscoverMovie): string {
  return `${movie.title.toLowerCase()}|${parseTMDBReleaseYear(movie.release_date)}`;
}

function getJITSeedCandidates(
  tmdbMovies: TMDBDiscoverMovie[],
  existingLocalKeys: Set<string>,
): TMDBDiscoverMovie[] {
  return tmdbMovies
    .filter((movie) => !existingLocalKeys.has(getTMDBSeedMovieKey(movie)))
    .slice(0, MAX_JIT_SEED_MOVIES);
}

async function getExistingMoviesByKey(
  db: ReturnType<typeof getDbClient>,
  candidateMovies: TMDBDiscoverMovie[],
): Promise<Map<string, ExistingMovieRow>> {
  const existingMoviesByKey = new Map<string, ExistingMovieRow>();

  try {
    const movieNames = candidateMovies.map((movie) => movie.title);
    const { data: existingMovies, error } = await db
      .from<ExistingMovieRow>('movies')
      .select('id, name, year, poster_url')
      .in('name', movieNames);

    if (error) {
      logger.warn({ err: error }, 'JIT seeding existence pre-check failed');
      return existingMoviesByKey;
    }

    for (const row of existingMovies ?? []) {
      existingMoviesByKey.set(`${row.name.toLowerCase()}|${Number(row.year ?? 0)}`, row);
    }
  } catch (err) {
    logger.warn({ err }, 'JIT seeding existence pre-check failed with unexpected error');
  }

  return existingMoviesByKey;
}

async function getTMDBSeedEmbedding(
  movie: TMDBDiscoverMovie,
  precomputedEmbeddings?: Map<number, number[]>,
): Promise<number[] | undefined> {
  const precomputed = precomputedEmbeddings?.get(movie.id);
  if (precomputed) return precomputed;

  const embeddingResponse = await getOpenAIClient().embeddings.create(
    {
      model: MODELS.EMBEDDING,
      input: formatTMDBMovieEmbeddingText(movie),
    },
    openAIRequestOptions(OPENAI_TIMEOUTS_MS.embedding),
  );
  return embeddingResponse.data[0]?.embedding;
}

function isZeroMagnitudeEmbedding(embedding: number[]): boolean {
  return embedding.every((value) => value === 0);
}

function getTMDBPosterUrl(movie: TMDBDiscoverMovie): string | null {
  return movie.poster_path ? `${IMAGE_BASE_URL}/w500${movie.poster_path}` : null;
}

async function insertTMDBSeedMovie(input: {
  db: ReturnType<typeof getDbClient>;
  movie: TMDBDiscoverMovie;
  year: number;
  score: number;
  embedding: number[];
}) {
  return input.db.from('movies').insert({
    tmdb_id: input.movie.id,
    name: input.movie.title,
    year: input.year,
    age_rating: 'NR',
    description: input.movie.overview || '',
    duration: 0,
    score_rating: input.score,
    poster_url: getTMDBPosterUrl(input.movie),
    embedding: input.embedding,
  });
}

async function updateExistingMoviePosterUrl(input: {
  db: ReturnType<typeof getDbClient>;
  existingMovie: ExistingMovieRow;
  movie: TMDBDiscoverMovie;
}): Promise<void> {
  const posterUrl = getTMDBPosterUrl(input.movie);
  if (!posterUrl || input.existingMovie.poster_url || !input.db.query) return;

  try {
    await input.db.query('UPDATE movies SET poster_url = $1 WHERE id = $2 AND poster_url IS NULL', [
      posterUrl,
      input.existingMovie.id,
    ]);
  } catch (err) {
    logger.warn(
      { err, movieTitle: input.movie.title },
      'JIT seeding failed to update existing movie poster URL',
    );
  }
}

async function seedOneTMDBMovie(input: {
  db: ReturnType<typeof getDbClient>;
  movie: TMDBDiscoverMovie;
  existingMoviesByKey: Map<string, ExistingMovieRow>;
  precomputedEmbeddings?: Map<number, number[]>;
}): Promise<void> {
  const year = parseTMDBReleaseYear(input.movie.release_date);
  const movieKey = getTMDBSeedMovieKey(input.movie);
  const existingMovie = input.existingMoviesByKey.get(movieKey);

  if (existingMovie) {
    await updateExistingMoviePosterUrl({ db: input.db, existingMovie, movie: input.movie });
    logger.debug(
      { movieTitle: input.movie.title, year },
      'JIT seeding skipped — movie already in database',
    );
    return;
  }

  const score = Number(input.movie.vote_average?.toFixed(1)) || 0;
  const embedding = await getTMDBSeedEmbedding(input.movie, input.precomputedEmbeddings);
  if (!embedding) return;

  if (isZeroMagnitudeEmbedding(embedding)) {
    logger.warn(
      { movieTitle: input.movie.title, year },
      'JIT seeding skipped — zero-magnitude embedding',
    );
    return;
  }

  const { error: insertError } = await insertTMDBSeedMovie({
    db: input.db,
    movie: input.movie,
    year,
    score,
    embedding,
  });

  if (insertError) {
    logJITSeedingError({
      error: insertError,
      movieTitle: input.movie.title,
      warnMessage: 'JIT seeding insert failed',
    });
    return;
  }

  logger.info({ movieTitle: input.movie.title, year }, 'JIT seeded TMDB movie into database');
}

async function seedOneTMDBMovieWithLogging(input: {
  db: ReturnType<typeof getDbClient>;
  movie: TMDBDiscoverMovie;
  existingMoviesByKey: Map<string, ExistingMovieRow>;
  precomputedEmbeddings?: Map<number, number[]>;
}): Promise<void> {
  try {
    await seedOneTMDBMovie(input);
  } catch (err) {
    logJITSeedingError({
      error: err,
      movieTitle: input.movie.title,
      warnMessage: 'JIT seeding failed with unexpected error',
    });
  }
}

export async function seedMovies(
  tmdbMovies: TMDBDiscoverMovie[],
  existingLocalKeys: Set<string>,
  precomputedEmbeddings?: Map<number, number[]>,
): Promise<void> {
  const db = getDbClient();
  if (!db.isConfigured()) return;

  const candidateMovies = getJITSeedCandidates(tmdbMovies, existingLocalKeys);
  if (candidateMovies.length === 0) return;

  const existingMoviesByKey = await getExistingMoviesByKey(db, candidateMovies);

  for (const movie of candidateMovies) {
    await seedOneTMDBMovieWithLogging({ db, movie, existingMoviesByKey, precomputedEmbeddings });
  }
}

export function seedMoviesInBackground(
  tmdbMovies: TMDBDiscoverMovie[],
  existingLocalKeys: Set<string>,
  precomputedEmbeddings?: Map<number, number[]>,
): void {
  void seedMovies(tmdbMovies, existingLocalKeys, precomputedEmbeddings);
}

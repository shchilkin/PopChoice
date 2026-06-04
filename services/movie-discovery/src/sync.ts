import {
  filterNewMovies,
  getMovieCount,
  insertMovies,
  upsertMovieCatalogMetadata,
} from './database.js';
import { createEmbeddings } from './embeddings.js';
import { applyQualityFilter } from './filter.js';
import { logger } from './logger.js';
import {
  extractUSCertification,
  extractCatalogMetadata,
  fetchFromSources,
  fetchMovieDetails,
  movieToEmbeddingText,
  type TMDBCatalogMetadata,
} from './tmdb.js';

import type { Config } from './config.js';
import type { MovieRecord } from './database.js';
import type { TMDBMovie, TMDBMovieDetails } from './tmdb.js';

/** Maximum concurrent TMDB detail requests per batch to avoid rate limiting. */
const DETAIL_BATCH_SIZE = 5;
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

function getPosterUrl(posterPath: string | null | undefined): string | null {
  return posterPath ? `${TMDB_IMAGE_BASE_URL}/w500${posterPath}` : null;
}

function getReleaseYear(movie: Pick<TMDBMovie, 'release_date'>): number {
  return movie.release_date ? parseInt(movie.release_date.substring(0, 4), 10) : 0;
}

export function selectCandidatesWithValidYears(movies: TMDBMovie[]): {
  skipped: number;
  validYearCandidates: TMDBMovie[];
} {
  const validYearCandidates = movies.filter((movie) => {
    const year = getReleaseYear(movie);
    return Number.isFinite(year) && year > 1800;
  });

  return {
    skipped: movies.length - validYearCandidates.length,
    validYearCandidates,
  };
}

export function toDiscoveryPartialRecord(movie: TMDBMovie): MovieRecord {
  return {
    name: movie.title,
    year: getReleaseYear(movie),
    age_rating: 'NR',
    description: movie.overview || 'No description available.',
    duration: 0,
    score_rating: movie.vote_average,
    embedding: [],
  };
}

export function selectMoviesToProcess(
  movies: TMDBMovie[],
  newIndices: number[],
  maxMoviesPerRun: number,
): { cappedIndices: number[]; moviesToProcess: TMDBMovie[] } {
  const cappedIndices = newIndices.slice(0, maxMoviesPerRun);
  return {
    cappedIndices,
    moviesToProcess: cappedIndices.map((index) => movies[index]),
  };
}

function getDryRunSample(movies: TMDBMovie[]): Array<Pick<TMDBMovie, 'title' | 'release_date'>> {
  return movies.slice(0, 5).map((movie) => ({
    title: movie.title,
    release_date: movie.release_date,
  }));
}

async function fetchMovieDetailsSafely(
  config: Pick<Config, 'language' | 'tmdbApiKey'>,
  movie: TMDBMovie,
): Promise<TMDBMovieDetails | null> {
  try {
    return await fetchMovieDetails(config.tmdbApiKey, movie.id, config.language);
  } catch (err) {
    logger.warn('Failed to fetch movie details, using basic data', {
      movieId: movie.id,
      title: movie.title,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function fetchMovieDetailsInBatches(
  config: Pick<Config, 'language' | 'tmdbApiKey'>,
  movies: TMDBMovie[],
  batchSize = DETAIL_BATCH_SIZE,
): Promise<Array<TMDBMovieDetails | null>> {
  const detailedMovies: Array<TMDBMovieDetails | null> = [];

  for (let batchStart = 0; batchStart < movies.length; batchStart += batchSize) {
    const batch = movies.slice(batchStart, batchStart + batchSize);
    const batchResults = await Promise.all(
      batch.map((movie) => fetchMovieDetailsSafely(config, movie)),
    );
    detailedMovies.push(...batchResults);
  }

  return detailedMovies;
}

function buildFallbackEmbeddingText(movie: TMDBMovie, ageRating: string): string {
  const year = getReleaseYear(movie);
  return [
    `${movie.title} (${year})`,
    `Rating: ${ageRating}`,
    `Score: ${movie.vote_average.toFixed(1)}/10`,
    'Duration: unknown',
    `Description: ${movie.overview || 'No description available.'}`,
  ].join('\n');
}

export function buildDiscoveryPayload(
  movies: TMDBMovie[],
  detailedMovies: Array<TMDBMovieDetails | null>,
): {
  catalogMetadataByTmdbId: Map<number, TMDBCatalogMetadata>;
  embeddingTexts: string[];
  partialRecords: Array<Omit<MovieRecord, 'embedding'>>;
} {
  const partialRecords: Array<Omit<MovieRecord, 'embedding'>> = [];
  const embeddingTexts: string[] = [];
  const catalogMetadataByTmdbId = new Map<number, TMDBCatalogMetadata>();

  for (let i = 0; i < movies.length; i++) {
    const basic = movies[i];
    const details = detailedMovies[i];

    const ageRating = details ? extractUSCertification(details) : 'NR';
    const runtime = details?.runtime ?? 0;
    const year = getReleaseYear(basic);
    const catalogMetadata = details ? extractCatalogMetadata(details) : null;
    if (catalogMetadata) {
      catalogMetadataByTmdbId.set(basic.id, catalogMetadata);
    }

    partialRecords.push({
      name: basic.title,
      year,
      age_rating: ageRating,
      description: basic.overview || 'No description available.',
      duration: runtime,
      score_rating: basic.vote_average,
      poster_url: getPosterUrl(basic.poster_path),
      localized_name: details?.title && details.title !== basic.title ? details.title : null,
      tmdb_id: basic.id,
      tmdb_match_confidence: 1,
      tmdb_match_source: 'tmdb_discovery',
    });
    embeddingTexts.push(
      details
        ? movieToEmbeddingText(details, ageRating)
        : buildFallbackEmbeddingText(basic, ageRating),
    );
  }

  return { catalogMetadataByTmdbId, embeddingTexts, partialRecords };
}

async function upsertCatalogMetadataForInsertedMovies(
  insertedMovies: Awaited<ReturnType<typeof insertMovies>>['insertedMovies'],
  catalogMetadataByTmdbId: Map<number, TMDBCatalogMetadata>,
): Promise<number> {
  let metadataUpdated = 0;
  for (const insertedMovie of insertedMovies) {
    if (!insertedMovie.tmdb_id) continue;
    const catalogMetadata = catalogMetadataByTmdbId.get(insertedMovie.tmdb_id);
    if (!catalogMetadata) continue;

    await upsertMovieCatalogMetadata({
      movieId: insertedMovie.id,
      tmdbMetadata: catalogMetadata.snapshot,
      people: catalogMetadata.people,
      genres: catalogMetadata.genres,
      keywords: catalogMetadata.keywords,
      source: 'tmdb',
    });
    metadataUpdated++;
  }

  return metadataUpdated;
}

export async function runSync(config: Config): Promise<void> {
  const startTime = Date.now();
  logger.info('Discovery sync started', {
    dryRun: config.dryRun,
    sources: config.sources,
    maxPagesPerSource: config.maxPagesPerSource,
    maxMoviesPerRun: config.maxMoviesPerRun,
  });

  const countBefore = await getMovieCount();
  logger.info('Current database state', { movieCount: countBefore });

  // 1. Fetch from all sources
  const candidates = await fetchFromSources(
    config.tmdbApiKey,
    config.sources,
    config.maxPagesPerSource,
    config.language,
  );
  logger.info('Fetched candidates from TMDB', { count: candidates.length });

  if (candidates.length === 0) {
    logger.info('No candidates fetched, nothing to do');
    return;
  }

  // 2. Apply quality filter
  const qualified = applyQualityFilter(candidates, config.minVoteCount, config.minVoteAverage);
  logger.info('Quality filter applied', {
    candidates: candidates.length,
    qualified: qualified.length,
    filtered: candidates.length - qualified.length,
  });

  if (qualified.length === 0) {
    logger.info('No candidates passed quality filter');
    return;
  }

  // 3. Filter out movies with missing or invalid release year before deduplication
  const { skipped, validYearCandidates } = selectCandidatesWithValidYears(qualified);
  if (skipped > 0) {
    logger.warn('Skipped movies with missing or invalid release year', {
      skipped,
    });
  }

  if (validYearCandidates.length === 0) {
    logger.info('No candidates with valid release year');
    return;
  }

  // 4. Deduplicate against database using partial records (no embedding yet)
  const partialRecords = validYearCandidates.map(toDiscoveryPartialRecord);

  const newIndices = await filterNewMovies(partialRecords);
  logger.info('Duplicate check complete', {
    qualified: validYearCandidates.length,
    new: newIndices.length,
    duplicates: validYearCandidates.length - newIndices.length,
  });

  if (newIndices.length === 0) {
    logger.info('All qualified movies already exist in database');
    return;
  }

  // 5. Cap at maxMoviesPerRun
  const { cappedIndices, moviesToProcess } = selectMoviesToProcess(
    validYearCandidates,
    newIndices,
    config.maxMoviesPerRun,
  );
  if (cappedIndices.length < newIndices.length) {
    logger.info('Capped new movies to maxMoviesPerRun', {
      new: newIndices.length,
      capped: cappedIndices.length,
      maxMoviesPerRun: config.maxMoviesPerRun,
    });
  }

  // 6. Dry run — stop before details/embeddings/inserts
  if (config.dryRun) {
    logger.info('DRY RUN: would fetch details and insert', {
      moviesToInsert: moviesToProcess.length,
      sampleMovies: getDryRunSample(moviesToProcess),
    });
    return;
  }

  // 7. Fetch full details (runtime + real age rating) for each movie in small batches
  // to avoid hitting TMDB rate limits (default: 40 req/10 s on v4 API).
  logger.info('Fetching movie details', {
    count: moviesToProcess.length,
    batchSize: DETAIL_BATCH_SIZE,
  });
  const detailedMovies = await fetchMovieDetailsInBatches(config, moviesToProcess);

  // 8. Build records and embedding texts
  const {
    catalogMetadataByTmdbId,
    embeddingTexts,
    partialRecords: finalPartialRecords,
  } = buildDiscoveryPayload(moviesToProcess, detailedMovies);

  // 9. Create embeddings
  const embeddings = await createEmbeddings(config.openaiApiKey, embeddingTexts);

  // 10. Build final records
  const finalRecords: MovieRecord[] = finalPartialRecords.map((r, idx) => ({
    ...r,
    embedding: embeddings[idx],
  }));

  // 11. Insert into database
  const result = await insertMovies(finalRecords);
  const metadataUpdated = await upsertCatalogMetadataForInsertedMovies(
    result.insertedMovies,
    catalogMetadataByTmdbId,
  );

  const countAfter = await getMovieCount();
  const durationMs = Date.now() - startTime;

  logger.info('Discovery sync complete', {
    inserted: result.success,
    errors: result.errors,
    metadataUpdated,
    movieCountBefore: countBefore,
    movieCountAfter: countAfter,
    durationMs,
  });
}

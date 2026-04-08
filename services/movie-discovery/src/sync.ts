import { filterNewMovies, getMovieCount, insertMovies } from './database.js';
import { createEmbeddings } from './embeddings.js';
import { applyQualityFilter } from './filter.js';
import { logger } from './logger.js';
import {
  extractUSCertification,
  fetchFromSources,
  fetchMovieDetails,
  movieToEmbeddingText,
} from './tmdb.js';

import type { Config } from './config.js';
import type { MovieRecord } from './database.js';

/** Maximum concurrent TMDB detail requests per batch to avoid rate limiting. */
const DETAIL_BATCH_SIZE = 5;

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
    config.tmdbReadAccessToken,
    config.sources,
    config.maxPagesPerSource,
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
  const validYearCandidates = qualified.filter((m) => {
    const year = m.release_date ? parseInt(m.release_date.substring(0, 4), 10) : 0;
    return Number.isFinite(year) && year > 1800;
  });
  if (validYearCandidates.length < qualified.length) {
    logger.warn('Skipped movies with missing or invalid release year', {
      skipped: qualified.length - validYearCandidates.length,
    });
  }

  if (validYearCandidates.length === 0) {
    logger.info('No candidates with valid release year');
    return;
  }

  // 4. Deduplicate against database using partial records (no embedding yet)
  const partialRecords: MovieRecord[] = validYearCandidates.map((m) => ({
    name: m.title,
    year: m.release_date ? parseInt(m.release_date.substring(0, 4), 10) : 0,
    age_rating: 'NR', // placeholder; real value fetched below
    description: m.overview || 'No description available.',
    duration: 0, // placeholder; real value fetched below
    score_rating: m.vote_average,
    embedding: [],
  }));

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
  const cappedIndices = newIndices.slice(0, config.maxMoviesPerRun);
  if (cappedIndices.length < newIndices.length) {
    logger.info('Capped new movies to maxMoviesPerRun', {
      new: newIndices.length,
      capped: cappedIndices.length,
      maxMoviesPerRun: config.maxMoviesPerRun,
    });
  }

  const moviesToProcess = cappedIndices.map((i) => validYearCandidates[i]);

  // 6. Dry run — stop before details/embeddings/inserts
  if (config.dryRun) {
    logger.info('DRY RUN: would fetch details and insert', {
      moviesToInsert: moviesToProcess.length,
      sampleMovies: moviesToProcess.slice(0, 5).map((m) => ({
        title: m.title,
        release_date: m.release_date,
      })),
    });
    return;
  }

  // 7. Fetch full details (runtime + real age rating) for each movie in small batches
  // to avoid hitting TMDB rate limits (default: 40 req/10 s on v4 API).
  logger.info('Fetching movie details', {
    count: moviesToProcess.length,
    batchSize: DETAIL_BATCH_SIZE,
  });
  const detailedMovies: (Awaited<ReturnType<typeof fetchMovieDetails>> | null)[] = [];

  for (let batchStart = 0; batchStart < moviesToProcess.length; batchStart += DETAIL_BATCH_SIZE) {
    const batch = moviesToProcess.slice(batchStart, batchStart + DETAIL_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (m) => {
        try {
          const details = await fetchMovieDetails(config.tmdbReadAccessToken, m.id);
          return details;
        } catch (err) {
          logger.warn('Failed to fetch movie details, using basic data', {
            movieId: m.id,
            title: m.title,
            error: err instanceof Error ? err.message : String(err),
          });
          return null;
        }
      }),
    );
    detailedMovies.push(...batchResults);
  }

  // 8. Build records and embedding texts
  const finalPartialRecords: Omit<MovieRecord, 'embedding'>[] = [];
  const embeddingTexts: string[] = [];

  for (let i = 0; i < moviesToProcess.length; i++) {
    const basic = moviesToProcess[i];
    const details = detailedMovies[i];

    const ageRating = details ? extractUSCertification(details) : 'NR';
    const runtime = details?.runtime ?? 0;
    const year = basic.release_date ? parseInt(basic.release_date.substring(0, 4), 10) : 0;

    const record: Omit<MovieRecord, 'embedding'> = {
      name: basic.title,
      year,
      age_rating: ageRating,
      description: basic.overview || 'No description available.',
      duration: runtime,
      score_rating: basic.vote_average,
    };

    finalPartialRecords.push(record);
    embeddingTexts.push(
      details
        ? movieToEmbeddingText(details, ageRating)
        : [
            `${basic.title} (${year})`,
            `Rating: ${ageRating}`,
            `Score: ${basic.vote_average.toFixed(1)}/10`,
            `Description: ${basic.overview || 'No description available.'}`,
          ].join('\n'),
    );
  }

  // 9. Create embeddings
  const embeddings = await createEmbeddings(config.openaiApiKey, embeddingTexts);

  // 10. Build final records
  const finalRecords: MovieRecord[] = finalPartialRecords.map((r, idx) => ({
    ...r,
    embedding: embeddings[idx],
  }));

  // 11. Insert into database
  const result = await insertMovies(finalRecords);

  const countAfter = await getMovieCount();
  const durationMs = Date.now() - startTime;

  logger.info('Discovery sync complete', {
    inserted: result.success,
    errors: result.errors,
    movieCountBefore: countBefore,
    movieCountAfter: countAfter,
    durationMs,
  });
}

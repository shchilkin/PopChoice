import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  createEmbeddings,
  ensureSchema,
  filterNewMovies,
  getMovieCount,
  initDatabase,
  insertMovies,
} from '@pop-choice/shared';

import logger from '@/lib/logger';

import type { MovieRecord } from '@pop-choice/shared';

type MovieSeedRecord = Omit<MovieRecord, 'embedding'>;

type RunCuratedMovieSeedInput = {
  dryRun?: boolean;
  moviesFilePath?: string;
  requestedBy?: string;
};

type ParseMovieEntryResult = {
  movie: MovieSeedRecord | null;
  warning?: {
    context: Record<string, unknown>;
    message: string;
  };
};

function isMovieSeedRecord(value: MovieSeedRecord | undefined): value is MovieSeedRecord {
  return value !== undefined;
}

let databaseInitialized = false;
let schemaReadyPromise: Promise<void> | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for curated movie seed jobs`);
  return value;
}

function ensureDatabase(): void {
  if (databaseInitialized) return;
  initDatabase(getRequiredEnv('DATABASE_URL'));
  databaseInitialized = true;
}

async function ensureMovieSeedSchema(): Promise<void> {
  ensureDatabase();
  schemaReadyPromise ??= ensureSchema();
  await schemaReadyPromise;
}

function resolveDefaultMoviesFilePath(): string {
  const cwdPath = path.resolve(process.cwd(), 'movies.txt');
  if (existsSync(cwdPath)) return cwdPath;

  const serviceLocalPath = path.resolve(process.cwd(), 'services/movie-seed/movies.txt');
  if (existsSync(serviceLocalPath)) return serviceLocalPath;

  return cwdPath;
}

function resolveMoviesFilePath(explicitPath: string | undefined): string {
  const envPath = process.env.MOVIES_FILE_PATH?.trim();
  return explicitPath?.trim() || envPath || resolveDefaultMoviesFilePath();
}

function parseDuration(duration: string): number {
  const trimmed = duration.trim();
  const hours = Number(trimmed.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(trimmed.match(/(\d+)m/)?.[1] ?? 0);
  const total = hours * 60 + minutes;
  const bareMinutes = trimmed.match(/^(\d+)$/)?.[1];

  return total > 0 ? total : Number(bareMinutes ?? 0);
}

function invalidEntry(): ParseMovieEntryResult {
  return { movie: null };
}

function parseMovieEntry(entry: string): ParseMovieEntryResult {
  const lines = entry
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return invalidEntry();

  const firstLine = lines[0];
  if (!/^[A-Za-z0-9].*: \d{4} \|/.test(firstLine)) return invalidEntry();

  const parts = firstLine.split('|').map((part) => part.trim());
  if (parts.length < 4) return invalidEntry();

  const [titleAndYear, ageRating, durationStr, scoreStr] = parts;
  const yearMatch = titleAndYear.match(/:\s*(\d{4})\s*$/);
  if (!yearMatch) return invalidEntry();

  const duration = parseDuration(durationStr);
  if (duration <= 0) {
    return {
      movie: null,
      warning: {
        context: { durationStr, firstLine },
        message: 'Skipping entry with non-positive duration',
      },
    };
  }

  const score = Number.parseFloat(scoreStr.replace(/rating/i, '').trim());
  if (!Number.isFinite(score)) {
    return {
      movie: null,
      warning: {
        context: { firstLine, scoreStr },
        message: 'Skipping entry with unparseable score',
      },
    };
  }

  return {
    movie: {
      age_rating: ageRating,
      description: lines.slice(1).join(' ').trim(),
      duration,
      name: titleAndYear.replace(/:\s*\d{4}\s*$/, '').trim(),
      score_rating: score,
      year: Number.parseInt(yearMatch[1] ?? '0', 10),
    },
  };
}

function readMoviesFile(filePath: string): MovieSeedRecord[] {
  const content = readFileSync(filePath, 'utf-8');
  const chunks = content.split(/(?:\r?\n){2,}/);
  const movies: MovieSeedRecord[] = [];
  let skipped = 0;

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;

    const result = parseMovieEntry(chunk);
    if (!result.movie) {
      skipped++;
      if (result.warning) logger.warn(result.warning.context, result.warning.message);
      continue;
    }

    movies.push(result.movie);
  }

  if (skipped > 0) {
    logger.warn({ skipped }, 'Skipped invalid or unrecognized movie entries');
  }

  return movies;
}

function movieToEmbeddingText(movie: MovieSeedRecord): string {
  return [
    `${movie.name} (${movie.year})`,
    `Rating: ${movie.age_rating}`,
    `Duration: ${movie.duration} min`,
    `Score: ${movie.score_rating.toFixed(1)}/10`,
    `Description: ${movie.description}`,
  ].join('\n');
}

function requireEmbedding(embedding: number[] | undefined, movie: MovieSeedRecord): number[] {
  if (embedding) return embedding;
  throw new Error(`Missing embedding for curated movie seed record: ${movie.name}`);
}

export async function runCuratedMovieSeedJob(input: RunCuratedMovieSeedInput): Promise<void> {
  const dryRun = input.dryRun ?? process.env.DRY_RUN === 'true';
  const moviesFilePath = resolveMoviesFilePath(input.moviesFilePath);
  const startTime = Date.now();

  await ensureMovieSeedSchema();

  logger.info(
    { dryRun, moviesFilePath, requestedBy: input.requestedBy },
    'Curated movie seed started',
  );

  const countBefore = await getMovieCount();
  const partialRecords = readMoviesFile(moviesFilePath);

  if (partialRecords.length === 0) {
    logger.info({ moviesFilePath }, 'Curated movie seed found no movies');
    return;
  }

  const recordsForCheck: MovieRecord[] = partialRecords.map((record) => ({
    ...record,
    embedding: [],
  }));
  const newIndices = await filterNewMovies(recordsForCheck);

  logger.info(
    {
      duplicates: partialRecords.length - newIndices.length,
      new: newIndices.length,
      total: partialRecords.length,
    },
    'Curated movie seed duplicate check complete',
  );

  if (newIndices.length === 0) {
    logger.info({ movieCount: countBefore }, 'Curated movie seed found no new movies');
    return;
  }

  if (dryRun) {
    logger.info(
      {
        moviesToInsert: newIndices.length,
        sampleMovies: newIndices.slice(0, 5).map((index) => ({
          name: partialRecords[index]?.name,
          year: partialRecords[index]?.year,
        })),
      },
      'DRY RUN: curated movie seed would create embeddings and insert movies',
    );
    return;
  }

  const openaiApiKey = getRequiredEnv('OPENAI_API_KEY');
  const newMovies = newIndices.map((index) => partialRecords[index]).filter(isMovieSeedRecord);
  const embeddings = await createEmbeddings(openaiApiKey, newMovies.map(movieToEmbeddingText));
  const finalRecords: MovieRecord[] = newMovies.map((record, index) => ({
    ...record,
    embedding: requireEmbedding(embeddings[index], record),
  }));

  const result = await insertMovies(finalRecords);
  const countAfter = await getMovieCount();

  logger.info(
    {
      durationMs: Date.now() - startTime,
      errors: result.errors,
      inserted: result.success,
      movieCountAfter: countAfter,
      movieCountBefore: countBefore,
    },
    'Curated movie seed complete',
  );
}

/**
 * Reads and parses movies.txt into MovieRecord objects.
 *
 * Expected format per entry (entries separated by blank lines):
 *   Title: Year | AgeRating | Duration | ScoreRating rating
 *   Description text
 */

import { readFileSync } from 'fs';

import { logger } from './logger.js';

import type { MovieRecord } from './database.js';

type MovieSeedRecord = Omit<MovieRecord, 'embedding'>;

interface ParseMovieEntryResult {
  movie: MovieSeedRecord | null;
  warning?: {
    context: Record<string, unknown>;
    message: string;
  };
}

/**
 * Parse a duration string like "1h 42m", "2h", "90m", or a bare integer (minutes) into total minutes.
 */
export function parseDuration(duration: string): number {
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

export function parseMovieEntry(entry: string): ParseMovieEntryResult {
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

  const score = parseFloat(scoreStr.replace(/rating/i, '').trim());
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
      name: titleAndYear.replace(/:\s*\d{4}\s*$/, '').trim(),
      year: parseInt(yearMatch[1], 10),
      age_rating: ageRating,
      description: lines.slice(1).join(' ').trim(),
      duration,
      score_rating: score,
    },
  };
}

/**
 * Read and parse the movies file into partial MovieRecord objects (without embeddings).
 * Skips any entries that do not match the expected format.
 */
export function readMoviesFile(filePath: string): MovieSeedRecord[] {
  const content = readFileSync(filePath, 'utf-8');
  const chunks = content.split(/(?:\r?\n){2,}/);
  const movies: MovieSeedRecord[] = [];
  let skipped = 0;

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;

    const result = parseMovieEntry(chunk);
    if (!result.movie) {
      skipped++;
      if (result.warning) logger.warn(result.warning.message, result.warning.context);
      continue;
    }

    movies.push(result.movie);
  }

  if (skipped > 0) {
    logger.warn('Skipped invalid or unrecognized movie entries', { skipped });
  }

  return movies;
}

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

/**
 * Parse a duration string like "1h 42m", "2h", "90m", or a bare integer (minutes) into total minutes.
 */
function parseDuration(duration: string): number {
  const trimmed = duration.trim();
  let total = 0;

  const hoursMatch = trimmed.match(/(\d+)h/);
  if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 60;

  const minutesMatch = trimmed.match(/(\d+)m/);
  if (minutesMatch) total += parseInt(minutesMatch[1], 10);

  // Fall back to treating a bare integer as minutes
  if (total === 0) {
    const intMatch = trimmed.match(/^(\d+)$/);
    if (intMatch) total = parseInt(intMatch[1], 10);
  }

  return total;
}

/**
 * Read and parse the movies file into partial MovieRecord objects (without embeddings).
 * Skips any entries that do not match the expected format.
 */
export function readMoviesFile(filePath: string): Omit<MovieRecord, 'embedding'>[] {
  const content = readFileSync(filePath, 'utf-8');
  const chunks = content.split(/(?:\r?\n){2,}/);
  const movies: Omit<MovieRecord, 'embedding'>[] = [];
  let skipped = 0;

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const lines = trimmed.split(/\r?\n/);
    if (lines.length < 2) {
      skipped++;
      continue;
    }

    // Validate header: must start with a letter or digit and contain ": YYYY |"
    if (!/^[A-Za-z0-9].*: \d{4} \|/.test(lines[0])) {
      skipped++;
      continue;
    }

    try {
      const parts = lines[0].split('|').map((p) => p.trim());

      // Expect at least 4 pipe-delimited fields
      if (parts.length < 4) {
        skipped++;
        continue;
      }

      const titleAndYear = parts[0]; // e.g. "Casablanca: 1942"
      const ageRating = parts[1]; // e.g. "PG"
      const durationStr = parts[2]; // e.g. "1h 42m"
      const scoreStr = parts[3]; // e.g. "8.5 rating"

      // Extract year from "Title: Year"
      const yearMatch = titleAndYear.match(/:\s*(\d{4})\s*$/);
      if (!yearMatch) {
        skipped++;
        continue;
      }

      const year = parseInt(yearMatch[1], 10);
      const name = titleAndYear.replace(/:\s*\d{4}\s*$/, '').trim();
      const duration = parseDuration(durationStr);
      const score = parseFloat(scoreStr.replace(/rating/i, '').trim());
      const description = lines.slice(1).join(' ').trim();

      if (duration <= 0) {
        skipped++;
        logger.warn('Skipping entry with non-positive duration', {
          firstLine: lines[0],
          durationStr,
        });
        continue;
      }

      if (!Number.isFinite(score)) {
        skipped++;
        logger.warn('Skipping entry with unparseable score', { firstLine: lines[0], scoreStr });
        continue;
      }

      movies.push({
        name,
        year,
        age_rating: ageRating,
        description,
        duration,
        score_rating: score,
      });
    } catch (err) {
      skipped++;
      logger.warn('Failed to parse movie entry', {
        firstLine: lines[0],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (skipped > 0) {
    logger.warn('Skipped invalid or unrecognized movie entries', { skipped });
  }

  return movies;
}

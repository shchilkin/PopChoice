import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseDuration, parseMovieEntry, readMoviesFile } from './movies-file.js';

vi.mock('./logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('parseDuration', () => {
  it.each([
    ['1h 42m', 102],
    ['2h', 120],
    ['90m', 90],
    ['95', 95],
    ['unknown', 0],
  ])('parses "%s" as %i minutes', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });
});

describe('parseMovieEntry', () => {
  it('parses a valid movie entry', () => {
    const result = parseMovieEntry(`Casablanca: 1942 | PG | 1h 42m | 8.5 rating
A cynical expatriate helps former lovers in wartime Morocco.`);

    expect(result.movie).toEqual({
      age_rating: 'PG',
      description: 'A cynical expatriate helps former lovers in wartime Morocco.',
      duration: 102,
      name: 'Casablanca',
      score_rating: 8.5,
      year: 1942,
    });
  });

  it('returns null for an unrecognized header', () => {
    expect(parseMovieEntry('Not a real header\nDescription').movie).toBeNull();
  });

  it('returns a duration warning for non-positive duration', () => {
    const result = parseMovieEntry(`Slow Movie: 2020 | PG | unknown | 6.0 rating
Description.`);

    expect(result.movie).toBeNull();
    expect(result.warning).toEqual({
      context: {
        durationStr: 'unknown',
        firstLine: 'Slow Movie: 2020 | PG | unknown | 6.0 rating',
      },
      message: 'Skipping entry with non-positive duration',
    });
  });

  it('returns a score warning for unparseable scores', () => {
    const result = parseMovieEntry(`Odd Movie: 2020 | PG | 90m | excellent
Description.`);

    expect(result.movie).toBeNull();
    expect(result.warning).toEqual({
      context: {
        firstLine: 'Odd Movie: 2020 | PG | 90m | excellent',
        scoreStr: 'excellent',
      },
      message: 'Skipping entry with unparseable score',
    });
  });
});

describe('readMoviesFile', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it('reads valid entries and skips invalid chunks', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'movie-seed-'));
    tempDirs.push(tempDir);
    const filePath = join(tempDir, 'movies.txt');
    writeFileSync(
      filePath,
      `Casablanca: 1942 | PG | 1h 42m | 8.5 rating
Description one.

Invalid chunk

Arrival: 2016 | PG-13 | 116m | 7.9 rating
Description two.`,
    );

    const movies = readMoviesFile(filePath);

    expect(movies.map((movie) => movie.name)).toEqual(['Casablanca', 'Arrival']);
    expect(movies[1]).toMatchObject({ duration: 116, year: 2016 });
  });
});

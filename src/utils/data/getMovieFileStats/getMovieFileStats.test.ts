import fs from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getMovieFileStats } from './getMovieFileStats';

describe('getMovieFileStats', () => {
  let testFilePath: string;

  beforeEach(() => {
    // Create a unique test file path
    testFilePath = path.join(tmpdir(), `test-movies-${crypto.randomUUID()}.txt`);
  });

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(testFilePath);
    } catch {
      // File might not exist, ignore error
    }
  });

  it('should calculate correct statistics for valid movie file', async () => {
    const movieData = `The Matrix: 1999 | R | Action, Sci-Fi
A computer hacker learns from mysterious rebels about the true nature of his reality.

Inception: 2010 | PG-13 | Action, Drama, Sci-Fi
A thief who steals corporate secrets through dream-sharing technology.`;

    await fs.writeFile(testFilePath, movieData);

    const stats = await getMovieFileStats(testFilePath);

    expect(stats.totalChunks).toBe(2);
    expect(stats.avgChunkSize).toBeGreaterThan(0);
    expect(stats.maxChunkSize).toBeGreaterThan(0);
    expect(stats.minChunkSize).toBeGreaterThan(0);
    expect(stats.totalFileSize).toBeGreaterThan(0);
    expect(stats.maxChunkSize).toBeGreaterThanOrEqual(stats.avgChunkSize);
    expect(stats.minChunkSize).toBeLessThanOrEqual(stats.avgChunkSize);
  });

  it('should handle single movie correctly', async () => {
    const movieData = `The Godfather: 1972 | R | Crime, Drama
The aging patriarch of an organized crime dynasty transfers control.`;

    await fs.writeFile(testFilePath, movieData);

    const stats = await getMovieFileStats(testFilePath);

    expect(stats.totalChunks).toBe(1);
    expect(stats.avgChunkSize).toBe(stats.maxChunkSize);
    expect(stats.avgChunkSize).toBe(stats.minChunkSize);
    expect(stats.totalFileSize).toBe(stats.avgChunkSize);
  });

  it('should handle empty file', async () => {
    await fs.writeFile(testFilePath, '');

    const stats = await getMovieFileStats(testFilePath);

    expect(stats.totalChunks).toBe(0);
    expect(stats.avgChunkSize).toBe(0);
    expect(stats.maxChunkSize).toBe(0);
    expect(stats.minChunkSize).toBe(0);
    expect(stats.totalFileSize).toBe(0);
  });

  it('should handle whitespace-only file', async () => {
    await fs.writeFile(testFilePath, '   \n\n\t  ');

    const stats = await getMovieFileStats(testFilePath);

    expect(stats.totalChunks).toBe(0);
    expect(stats.avgChunkSize).toBe(0);
    expect(stats.maxChunkSize).toBe(0);
    expect(stats.minChunkSize).toBe(0);
    expect(stats.totalFileSize).toBe(0);
  });

  it('should calculate correct statistics for movies of different sizes', async () => {
    const shortDescription = 'Short movie.';
    const longDescription =
      'This is a very long movie description that contains significantly more text than the first movie. '.repeat(
        5,
      );

    const movieData = `Short Movie: 2020 | G | Comedy
${shortDescription}

Long Movie: 2021 | R | Drama
${longDescription}`;

    await fs.writeFile(testFilePath, movieData);

    const stats = await getMovieFileStats(testFilePath);

    expect(stats.totalChunks).toBe(2);
    expect(stats.maxChunkSize).toBeGreaterThan(stats.minChunkSize);
    expect(stats.avgChunkSize).toBeGreaterThan(stats.minChunkSize);
    expect(stats.avgChunkSize).toBeLessThan(stats.maxChunkSize);
    expect(stats.totalFileSize).toBe(stats.maxChunkSize + stats.minChunkSize);
  });

  it('should handle large file with many movies', async () => {
    const movieEntries = Array.from(
      { length: 10 },
      (_, i) => `Movie ${i + 1}: ${2000 + i} | PG | Genre\nDescription for movie ${i + 1}.`,
    ).join('\n\n');

    await fs.writeFile(testFilePath, movieEntries);

    const stats = await getMovieFileStats(testFilePath);

    expect(stats.totalChunks).toBe(10);
    expect(stats.avgChunkSize).toBeGreaterThan(0);
    expect(stats.maxChunkSize).toBeGreaterThanOrEqual(stats.avgChunkSize);
    expect(stats.minChunkSize).toBeLessThanOrEqual(stats.avgChunkSize);
    expect(stats.totalFileSize).toBeGreaterThan(0);
  });

  it('should throw error for non-existent file', async () => {
    const nonExistentPath = '/path/that/does/not/exist.txt';

    await expect(getMovieFileStats(nonExistentPath)).rejects.toThrow();
  });

  it('should calculate average correctly', async () => {
    // Create movies with known sizes for exact calculation verification
    const movie1 = 'A: 2020 | G | Drama\nExactly fifty characters in this description.'; // 50 chars after title line
    const movie2 =
      'B: 2021 | PG | Comedy\nThis description has exactly one hundred characters to test the average calculation properly.'; // 100 chars after title line

    const movieData = `${movie1}\n\n${movie2}`;
    await fs.writeFile(testFilePath, movieData);

    const stats = await getMovieFileStats(testFilePath);

    expect(stats.totalChunks).toBe(2);
    expect(stats.minChunkSize).toBeLessThan(stats.maxChunkSize);
    expect(stats.totalFileSize).toBe(stats.minChunkSize + stats.maxChunkSize);
    expect(stats.avgChunkSize).toBe(Math.round((stats.minChunkSize + stats.maxChunkSize) / 2));
  });

  it('should handle movies with invalid format (skipped by splitMovieDocument)', async () => {
    const movieData = `Valid Movie: 2020 | R | Action
This is a valid movie entry.

Invalid Entry Without Year
This should be skipped by splitMovieDocument.

Another Valid: 2019 | PG | Comedy
Another valid entry.`;

    await fs.writeFile(testFilePath, movieData);

    const stats = await getMovieFileStats(testFilePath);

    // Should only count valid movies that splitMovieDocument processes
    expect(stats.totalChunks).toBe(2);
    expect(stats.avgChunkSize).toBeGreaterThan(0);
    expect(stats.totalFileSize).toBeGreaterThan(0);
  });
});

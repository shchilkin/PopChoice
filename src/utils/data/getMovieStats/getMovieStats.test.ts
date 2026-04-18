import { unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { getMovieStats } from './getMovieStats';

describe('getMovieStats', () => {
  const tempFiles: string[] = [];

  // Helper function to create temporary test files
  const createTestMovieFile = async (content: string): Promise<string> => {
    const tempFile = join(tmpdir(), `test-movies-${crypto.randomUUID()}-${Math.random()}.txt`);
    await writeFile(tempFile, content, 'utf-8');
    tempFiles.push(tempFile);
    return tempFile;
  };

  // Clean up temporary files after each test
  afterEach(async () => {
    await Promise.all(
      tempFiles.map(async (file) => {
        try {
          await unlink(file);
        } catch {
          // Ignore errors if file doesn't exist
        }
      }),
    );
    tempFiles.length = 0;
  });

  it('should count movies correctly with valid movie data', async () => {
    const movieData = `The Matrix: 1999 | R | 2h 16m | 8.7 rating
A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.

Inception: 2010 | PG-13 | 2h 28m | 8.8 rating
A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.

Interstellar: 2014 | PG-13 | 2h 49m | 8.6 rating
A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.`;

    const testFile = await createTestMovieFile(movieData);
    const result = getMovieStats(testFile);

    expect(result.movieCount).toBe(3);
    expect(result.maxChunkSize).toBeGreaterThan(0);
    expect(typeof result.maxChunkSize).toBe('number');
  });

  it('should handle empty file correctly', async () => {
    const testFile = await createTestMovieFile('');
    const result = getMovieStats(testFile);

    expect(result.movieCount).toBe(0);
    expect(result.maxChunkSize).toBe(0);
  });

  it('should handle file with only whitespace', async () => {
    const testFile = await createTestMovieFile('   \n\n  \t  \n\n   ');
    const result = getMovieStats(testFile);

    expect(result.movieCount).toBe(0);
    expect(result.maxChunkSize).toBe(0);
  });

  it('should ignore invalid movie entries (missing year pattern)', async () => {
    const movieData = `The Matrix | R | 2h 16m | 8.7 rating
A computer hacker learns from mysterious rebels.

Inception: 2010 | PG-13 | 2h 28m | 8.8 rating
A thief who steals corporate secrets through dream-sharing.

This is not a movie entry
Some random text that doesn't match the pattern.

Interstellar: 2014 | PG-13 | 2h 49m | 8.6 rating
A team of explorers travel through a wormhole.`;

    const testFile = await createTestMovieFile(movieData);
    const result = getMovieStats(testFile);

    // Should only count entries that match the pattern (Inception and Interstellar)
    expect(result.movieCount).toBe(2);
    expect(result.maxChunkSize).toBeGreaterThan(0);
  });

  it('should calculate maxChunkSize correctly', async () => {
    const shortMovie = `Short: 2020 | G | 1h | 7.0 rating
Short description.`;

    const longMovie = `Very Long Movie Title That Goes On: 2023 | R | 3h | 8.5 rating
This is a very long movie description that should be significantly longer than the short one above. It contains many more characters and should represent the maximum chunk size when we analyze this file. This description continues to add more content to ensure it's definitely the largest chunk in our test data set.`;

    const movieData = `${shortMovie}

${longMovie}`;

    const testFile = await createTestMovieFile(movieData);
    const result = getMovieStats(testFile);

    expect(result.movieCount).toBe(2);
    expect(result.maxChunkSize).toBe(longMovie.length);
  });

  it('should handle movies with edge case years', async () => {
    const movieData = `Early Movie: 1900 | NR | 1h | 6.0 rating
Very old movie.

Recent Movie: 2024 | PG | 2h | 7.5 rating
Very recent movie.

Future Movie: 2099 | R | 2h 30m | 9.0 rating
Futuristic sci-fi movie.`;

    const testFile = await createTestMovieFile(movieData);
    const result = getMovieStats(testFile);

    expect(result.movieCount).toBe(3);
    expect(result.maxChunkSize).toBeGreaterThan(0);
  });

  it('should handle single movie entry', async () => {
    const movieData = `The Matrix: 1999 | R | 2h 16m | 8.7 rating
A computer hacker learns from mysterious rebels about the true nature of his reality.`;

    const testFile = await createTestMovieFile(movieData);
    const result = getMovieStats(testFile);

    expect(result.movieCount).toBe(1);
    expect(result.maxChunkSize).toBe(movieData.length);
  });

  it('should handle movies with special characters in title', async () => {
    const movieData = `Spider-Man: Into the Spider-Verse: 2018 | PG | 1h 57m | 8.4 rating
Teen Miles Morales becomes the Spider-Man of his universe.

The Lord of the Rings: The Fellowship of the Ring: 2001 | PG-13 | 3h 8m | 8.8 rating
A meek Hobbit from the Shire sets out on an epic quest.`;

    const testFile = await createTestMovieFile(movieData);
    const result = getMovieStats(testFile);

    expect(result.movieCount).toBe(2);
    expect(result.maxChunkSize).toBeGreaterThan(0);
  });

  it('should handle mixed valid and invalid entries', async () => {
    const movieData = `The Matrix: 1999 | R | 2h 16m | 8.7 rating
Valid movie entry.

Random text without proper format
This should be ignored.

Inception: 2010 | PG-13 | 2h 28m | 8.8 rating
Another valid movie entry.

Another random line
Not a movie.

123: 2020 | R | 1h | 5.0 rating
This starts with numbers, should now be counted.

Valid Movie: 2023 | PG | 2h | 8.0 rating
This should be counted.`;

    const testFile = await createTestMovieFile(movieData);
    const result = getMovieStats(testFile);

    // Should count: The Matrix, Inception, 123, Valid Movie (4 total)
    // Should ignore: Random text, Another random line
    expect(result.movieCount).toBe(4);
    expect(result.maxChunkSize).toBeGreaterThan(0);
  });

  it('should throw error for non-existent file', async () => {
    const nonExistentFile = join(tmpdir(), 'non-existent-file-12345.txt');

    expect(() => {
      getMovieStats(nonExistentFile);
    }).toThrow();
  });

  it('should handle movies with multiple lines in description', async () => {
    const movieData = `The Matrix: 1999 | R | 2h 16m | 8.7 rating
A computer hacker learns from mysterious rebels about the true nature of his reality.
This movie has multiple lines in its description.
And even more content here.

Inception: 2010 | PG-13 | 2h 28m | 8.8 rating
Single line description.`;

    const testFile = await createTestMovieFile(movieData);
    const result = getMovieStats(testFile);

    expect(result.movieCount).toBe(2);
    expect(result.maxChunkSize).toBeGreaterThan(0);

    // The Matrix chunk should be longer due to multiple lines
    const matrixChunkSize = movieData.split('\n\n')[0].length;
    expect(result.maxChunkSize).toBe(matrixChunkSize);
  });
});

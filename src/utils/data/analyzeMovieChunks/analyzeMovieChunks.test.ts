import { unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { analyzeMovieChunks } from './analyzeMovieChunks';

import type { MovieChunk } from '@/utils/types';

describe('analyzeMovieChunks', () => {
  let testFilePath: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create a unique test file path
    testFilePath = join(tmpdir(), `test-movies-${Date.now()}.txt`);

    // Spy on console methods to capture output
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up test file
    try {
      unlinkSync(testFilePath);
    } catch {
      // File might not exist, ignore error
    }

    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should analyze movie chunks and return sorted results', () => {
    const movieData = `The Matrix: 1999 | A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.

Inception: 2010 | A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O. This is a much longer description that should result in a larger chunk size.

Pulp Fiction: 1994 | The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.`;

    writeFileSync(testFilePath, movieData);

    const result = analyzeMovieChunks(testFilePath);

    // Should return 3 movies
    expect(result).toHaveLength(3);

    // Should be sorted by chunk size (largest first)
    expect(result[0].chunkSize).toBeGreaterThanOrEqual(result[1].chunkSize);
    expect(result[1].chunkSize).toBeGreaterThanOrEqual(result[2].chunkSize);

    // Check that Inception (longest description) is first
    expect(result[0].name).toBe('Inception');
    expect(result[0].chunkSize).toBeGreaterThan(200); // Should be the largest

    // Verify all required properties exist
    result.forEach((movie: MovieChunk) => {
      expect(movie).toHaveProperty('name');
      expect(movie).toHaveProperty('chunkSize');
      expect(movie).toHaveProperty('lineCount');
      expect(movie).toHaveProperty('chunkNumber');
      expect(movie).toHaveProperty('content');
      expect(typeof movie.name).toBe('string');
      expect(typeof movie.chunkSize).toBe('number');
      expect(typeof movie.lineCount).toBe('number');
      expect(typeof movie.chunkNumber).toBe('number');
      expect(typeof movie.content).toBe('string');
    });
  });

  it('should handle empty file correctly', () => {
    writeFileSync(testFilePath, '');

    const result = analyzeMovieChunks(testFilePath);

    expect(result).toHaveLength(0);
    expect(consoleLogSpy).toHaveBeenCalledWith('Total movies found: 0');
  });

  it('should handle file with only whitespace', () => {
    writeFileSync(testFilePath, '   \n\n\t  \n   ');

    const result = analyzeMovieChunks(testFilePath);

    expect(result).toHaveLength(0);
    expect(consoleLogSpy).toHaveBeenCalledWith('Total movies found: 0');
  });

  it('should handle single movie entry', () => {
    const singleMovie =
      'The Godfather: 1972 | The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.';

    writeFileSync(testFilePath, singleMovie);

    const result = analyzeMovieChunks(testFilePath);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('The Godfather');
    expect(result[0].chunkNumber).toBe(1);
    expect(result[0].lineCount).toBe(1);
    expect(result[0].content).toBe(singleMovie);
  });

  it('should display correct console output for top 10 movies', () => {
    // Create data with more than 10 movies to test the top 10 display
    const movieEntries = Array.from({ length: 15 }, (_, i) => {
      const extraLength = i * 10; // Each movie gets progressively longer
      const padding = 'A'.repeat(extraLength);
      return `Movie ${i + 1}: 2020 | This is a description for movie ${i + 1}. ${padding}`;
    });

    const movieData = movieEntries.join('\n\n');
    writeFileSync(testFilePath, movieData);

    const result = analyzeMovieChunks(testFilePath);

    expect(result).toHaveLength(15);

    // Check console output
    expect(consoleLogSpy).toHaveBeenCalledWith('Total movies found: 15');
    expect(consoleLogSpy).toHaveBeenCalledWith('\nTop 10 largest chunks by size (characters):');
    expect(consoleLogSpy).toHaveBeenCalledWith('-'.repeat(80));

    // Should display exactly 10 movies in the top list
    const topMovieCalls = consoleLogSpy.mock.calls.filter((call) =>
      call[0]?.toString().match(/^\s*\d+\.\s+Movie/),
    );
    expect(topMovieCalls).toHaveLength(10);
  });

  it('should display largest chunk details', () => {
    const movieData = `Small Movie: 2020 | Short description.

Large Movie: 2021 | This is a much longer description that should make this the largest chunk in the file. It has multiple sentences and provides detailed information about the movie plot and characters.`;

    writeFileSync(testFilePath, movieData);

    const result = analyzeMovieChunks(testFilePath);

    // Largest movie should be displayed
    expect(consoleLogSpy).toHaveBeenCalledWith('\nLargest chunk:');
    expect(consoleLogSpy).toHaveBeenCalledWith('='.repeat(80));
    expect(consoleLogSpy).toHaveBeenCalledWith('Movie: Large Movie');
    expect(consoleLogSpy).toHaveBeenCalledWith('\nContent:');
    expect(consoleLogSpy).toHaveBeenCalledWith('-'.repeat(40));

    // Check that the largest movie is correct
    expect(result[0].name).toBe('Large Movie');
  });

  it('should handle movies with special characters and complex titles', () => {
    const movieData = `The Lord of the Rings: The Fellowship of the Ring: 2001 | A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring.

Spider-Man: Into the Spider-Verse: 2018 | Teen Miles Morales becomes the Spider-Man of his universe and must join other Spider-People from different dimensions.`;

    writeFileSync(testFilePath, movieData);

    const result = analyzeMovieChunks(testFilePath);

    expect(result).toHaveLength(2);

    // The current parsing logic splits on the first colon, so we expect these names:
    expect(result.some((movie) => movie.name === 'The Lord of the Rings')).toBe(true);
    expect(result.some((movie) => movie.name === 'Spider-Man')).toBe(true);
  });

  it('should handle multi-line movie descriptions', () => {
    const movieData = `Multi-line Movie: 2022 | This movie has a description
that spans multiple lines
and should still be parsed correctly.

Single Line: 2023 | Simple description.`;

    writeFileSync(testFilePath, movieData);

    const result = analyzeMovieChunks(testFilePath);

    expect(result).toHaveLength(2);

    const multiLineMovie = result.find((movie) => movie.name === 'Multi-line Movie');
    expect(multiLineMovie).toBeDefined();
    expect(multiLineMovie!.lineCount).toBe(3); // Title line + 2 description lines
    expect(multiLineMovie!.content).toContain('\n');

    const singleLineMovie = result.find((movie) => movie.name === 'Single Line');
    expect(singleLineMovie).toBeDefined();
    expect(singleLineMovie!.lineCount).toBe(1);
  });

  it('should throw error for non-existent file', () => {
    const nonExistentPath = '/path/that/does/not/exist.txt';

    expect(() => analyzeMovieChunks(nonExistentPath)).toThrow();
  });

  it('should maintain correct chunk numbers', () => {
    const movieData = `First: 2020 | First movie.

Second: 2021 | Second movie.

Third: 2022 | Third movie.`;

    writeFileSync(testFilePath, movieData);

    const result = analyzeMovieChunks(testFilePath);

    // Even though sorted by size, chunk numbers should reflect original order
    expect(result).toHaveLength(3);

    const firstMovie = result.find((movie) => movie.name === 'First');
    const secondMovie = result.find((movie) => movie.name === 'Second');
    const thirdMovie = result.find((movie) => movie.name === 'Third');

    expect(firstMovie!.chunkNumber).toBe(1);
    expect(secondMovie!.chunkNumber).toBe(2);
    expect(thirdMovie!.chunkNumber).toBe(3);
  });

  it('should filter out invalid entries and still process valid ones', () => {
    const movieData = `Valid Movie: 2020 | This is a valid movie entry.

Invalid entry without year pattern
Another invalid line

Another Valid: 2021 | This is also valid.

Just some random text that doesn't match pattern`;

    writeFileSync(testFilePath, movieData);

    const result = analyzeMovieChunks(testFilePath);

    // Should only return the 2 valid movies
    expect(result).toHaveLength(2);
    expect(result.some((movie) => movie.name === 'Valid Movie')).toBe(true);
    expect(result.some((movie) => movie.name === 'Another Valid')).toBe(true);
  });

  it('should handle edge case years correctly', () => {
    const movieData = `Old Movie: 1900 | Very old movie.

Future Movie: 2099 | Movie from the future.

Current Movie: 2024 | Recent movie.`;

    writeFileSync(testFilePath, movieData);

    const result = analyzeMovieChunks(testFilePath);

    expect(result).toHaveLength(3);
    expect(result.some((movie) => movie.name === 'Old Movie')).toBe(true);
    expect(result.some((movie) => movie.name === 'Future Movie')).toBe(true);
    expect(result.some((movie) => movie.name === 'Current Movie')).toBe(true);
  });

  it('should validate chunk size calculations', () => {
    const shortMovie = 'Short: 2020 | Brief.';
    const longMovie =
      'Long Movie Title: 2021 | This is a significantly longer description that should result in a much larger chunk size calculation.';

    const movieData = `${shortMovie}

${longMovie}`;

    writeFileSync(testFilePath, movieData);

    const result = analyzeMovieChunks(testFilePath);

    expect(result).toHaveLength(2);

    const shortMovieResult = result.find((movie) => movie.name === 'Short');
    const longMovieResult = result.find((movie) => movie.name === 'Long Movie Title');

    expect(shortMovieResult!.chunkSize).toBe(shortMovie.length);
    expect(longMovieResult!.chunkSize).toBe(longMovie.length);
    expect(longMovieResult!.chunkSize).toBeGreaterThan(shortMovieResult!.chunkSize);
  });
});

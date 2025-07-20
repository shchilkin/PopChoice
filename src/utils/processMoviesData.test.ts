import fs from 'fs/promises';
import path from 'path';

import { describe, expect, it } from 'vitest';

import {
  ageRatings,
  convertTextToMovieObjects,
  movieSchema,
  processMoviesFile,
} from './processMoviesData';

/* TODO: I am not sure that testing on real data (300+ movies) is a good idea
 Check out other ways */
const testFilePath = path.resolve(__dirname, '../../movies.txt');
const emptyFilePath = path.resolve(__dirname, '../../empty-movies.txt');

describe('processMoviesFile', () => {
  it('should parse and validate movies correctly', async () => {
    const movies = await processMoviesFile(testFilePath);
    expect(Array.isArray(movies)).toBe(true);
    expect(movies.length).toBeGreaterThan(0);
    for (const movie of movies) {
      expect(typeof movie.movieName).toBe('string');
      expect(ageRatings.options).toContain(movie.ageRating);
      expect(typeof movie.duration).toBe('number');
      expect(typeof movie.scoreRating).toBe('number');
      expect(typeof movie.description).toBe('string');
    }
  });

  it('should throw an error for a non-existent file', async () => {
    await expect(processMoviesFile('non-existent-file.txt')).rejects.toThrow('File not found');
  });

  it('should return an empty array for an empty file', async () => {
    // Create an empty file for this test
    await fs.writeFile(emptyFilePath, '');
    const movies = await processMoviesFile(emptyFilePath);
    expect(movies).toEqual([]);
    // Clean up
    await fs.unlink(emptyFilePath);
  });
});

describe('movieSchema duration transformation', () => {
  it('should transform duration from "xh xxm" to total minutes', () => {
    const testData = {
      movieName: 'Test Movie',
      ageRating: 'PG' as const,
      duration: '2h 15m',
      scoreRating: '8.5 rating',
      description: 'A test movie',
    };

    const result = movieSchema.parse(testData);

    expect(result.duration).toBe(135); // 2*60 + 15 = 135 minutes
    expect(result.scoreRating).toBe(8.5);
  });

  it('should handle different duration formats', () => {
    const testCases = [
      { input: '1h 30m', expected: 90 }, // 1*60 + 30
      { input: '2h', expected: 120 }, // 2*60 + 0
      { input: '45m', expected: 45 }, // 0*60 + 45
      { input: '1h 0m', expected: 60 }, // 1*60 + 0
    ];

    testCases.forEach(({ input, expected }) => {
      const testData = {
        movieName: 'Test Movie',
        ageRating: 'PG' as const,
        duration: input,
        scoreRating: '8.0 rating',
        description: 'Test',
      };

      const result = movieSchema.parse(testData);
      expect(result.duration).toBe(expected);
    });
  });

  it('should reject invalid durations', () => {
    const testData = {
      movieName: 'Test Movie',
      ageRating: 'PG' as const,
      duration: 'invalid duration',
      scoreRating: '8.0 rating',
      description: 'Test',
    };

    expect(() => movieSchema.parse(testData)).toThrow();
  });
});

describe('convertTextToMovieObjects', () => {
  it('should convert text entries to movie objects with correct duration', () => {
    const entries = [
      'The Matrix: 1999 | R | 2h 16m | 8.7 rating',
      'A computer hacker discovers reality is a simulation.',
    ];

    const result = convertTextToMovieObjects(entries);

    expect(result).toHaveLength(1);
    expect(result[0].movieName).toBe('The Matrix: 1999');
    expect(result[0].duration).toBe(136); // 2*60 + 16 = 136 minutes
    expect(result[0].scoreRating).toBe(8.7);
  });

  it('should handle multiple movies with different durations', () => {
    const entries = [
      'Short Film: 2020 | G | 30m | 7.0 rating',
      'A short film.',
      'Long Epic: 2019 | PG-13 | 3h 15m | 9.0 rating',
      'A very long epic movie.',
    ];

    const result = convertTextToMovieObjects(entries);

    expect(result).toHaveLength(2);
    expect(result[0].duration).toBe(30); // 30 minutes
    expect(result[1].duration).toBe(195); // 3*60 + 15 = 195 minutes
  });
});

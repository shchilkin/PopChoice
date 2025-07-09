import { describe, it, expect } from 'vitest';
import { processMoviesFile } from './processMoviesData';
import path from 'path';
import fs from 'fs/promises';

const testFilePath = path.resolve(__dirname, '../../movies.txt');
const emptyFilePath = path.resolve(__dirname, '../../empty-movies.txt');

describe('processMoviesFile', () => {
  it('should parse and validate movies correctly', async () => {
    const movies = await processMoviesFile(testFilePath);
    expect(Array.isArray(movies)).toBe(true);
    expect(movies.length).toBeGreaterThan(0);
    for (const movie of movies) {
      expect(typeof movie.movieName).toBe('string');
      expect(['PG', 'PG-13', 'R']).toContain(movie.ageRating);
      expect(typeof movie.duration).toBe('string');
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

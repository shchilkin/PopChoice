import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import { getMovieFileStats, splitMovieDocument } from './movieSplitter';

describe('movieSplitter', () => {
  const createTestMovieFile = async (content: string): Promise<string> => {
    const tempFile = join(tmpdir(), `test-movies-${Date.now()}.txt`);
    await writeFile(tempFile, content, 'utf-8');
    return tempFile;
  };

  const sampleMovieData = `The Matrix: 1999 | Action, Sci-Fi | Keanu Reeves, Laurence Fishburne | A computer hacker learns from mysterious rebels about the true nature of his reality.

Inception: 2010 | Action, Sci-Fi, Thriller | Leonardo DiCaprio, Marion Cotillard | A thief who enters people's dreams and steals their secrets gets the inverse task of planting an idea.

Interstellar: 2014 | Adventure, Drama, Sci-Fi | Matthew McConaughey, Anne Hathaway | A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.`;

  describe('splitMovieDocument', () => {
    it('should split movies correctly', async () => {
      const testFile = await createTestMovieFile(sampleMovieData);

      const chunks = await splitMovieDocument(testFile);

      expect(chunks).toHaveLength(3);
      expect(chunks[0].pageContent).toContain('The Matrix: 1999');
      expect(chunks[1].pageContent).toContain('Inception: 2010');
      expect(chunks[2].pageContent).toContain('Interstellar: 2014');
    });

    it('should include correct metadata for each chunk', async () => {
      const testFile = await createTestMovieFile(sampleMovieData);

      const chunks = await splitMovieDocument(testFile);

      expect(chunks[0].metadata).toMatchObject({
        movieIndex: 1,
        movieName: 'The Matrix',
        source: testFile,
      });

      expect(chunks[1].metadata).toMatchObject({
        movieIndex: 2,
        movieName: 'Inception',
        source: testFile,
      });

      expect(chunks[2].metadata).toMatchObject({
        movieIndex: 3,
        movieName: 'Interstellar',
        source: testFile,
      });
    });

    it('should skip empty chunks', async () => {
      const dataWithEmptyLines = `The Matrix: 1999 | Action, Sci-Fi | Keanu Reeves



Inception: 2010 | Action, Sci-Fi, Thriller | Leonardo DiCaprio


`;

      const testFile = await createTestMovieFile(dataWithEmptyLines);
      const chunks = await splitMovieDocument(testFile);

      expect(chunks).toHaveLength(2);
      expect(chunks[0].pageContent).toContain('The Matrix');
      expect(chunks[1].pageContent).toContain('Inception');
    });

    it('should handle single movie correctly', async () => {
      const singleMovie =
        'The Matrix: 1999 | Action, Sci-Fi | Keanu Reeves, Laurence Fishburne | A computer hacker.';

      const testFile = await createTestMovieFile(singleMovie);
      const chunks = await splitMovieDocument(testFile);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].pageContent).toBe(singleMovie);
      expect(chunks[0].metadata.movieName).toBe('The Matrix');
    });

    it('should validate movie format and skip invalid entries', async () => {
      const mixedData = `The Matrix: 1999 | Action, Sci-Fi | Keanu Reeves

This is not a valid movie entry

Inception: 2010 | Action, Sci-Fi, Thriller | Leonardo DiCaprio`;

      const testFile = await createTestMovieFile(mixedData);
      const chunks = await splitMovieDocument(testFile);

      // Should only include valid movie entries
      expect(chunks).toHaveLength(2);
      expect(chunks[0].metadata.movieName).toBe('The Matrix');
      expect(chunks[1].metadata.movieName).toBe('Inception');
    });
  });

  describe('getMovieChunkStats', () => {
    it('should return correct statistics', async () => {
      const testFile = await createTestMovieFile(sampleMovieData);

      const stats = await getMovieFileStats(testFile);

      expect(stats.totalChunks).toBe(3);
      expect(stats.avgChunkSize).toBeGreaterThan(0);
      expect(stats.maxChunkSize).toBeGreaterThanOrEqual(stats.avgChunkSize);
      expect(stats.minChunkSize).toBeLessThanOrEqual(stats.avgChunkSize);
      expect(stats.chunkSizes).toHaveLength(3);

      // Verify all chunk sizes are positive
      stats.chunkSizes.forEach((size) => {
        expect(size).toBeGreaterThan(0);
      });
    });

    it('should handle empty file correctly', async () => {
      const testFile = await createTestMovieFile('');

      const stats = await getMovieFileStats(testFile);

      expect(stats.totalChunks).toBe(0);
      expect(stats.chunkSizes).toHaveLength(0);
    });
  });
});

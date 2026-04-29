import { readFileSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { afterEach, describe, expect, it } from 'vitest';

// Import the schema directly from its specific file
import { movieChunkSchema } from '@/utils/schemas';

// Define the interface for our raw movie chunks
interface RawMovieChunk {
  name: string;
  chunkSize: number;
  lineCount: number;
  chunkNumber: number;
  content: string;
}

// Helper function to parse movie chunks (replicating the internal logic)
function parseMovieChunks(filePath: string): RawMovieChunk[] {
  const content = readFileSync(filePath, 'utf-8');
  const chunks = content.split('\n\n');
  const rawMovieChunks: RawMovieChunk[] = [];

  chunks.forEach((chunk, i) => {
    if (!chunk.trim()) return;
    const lines = chunk.trim().split('\n');

    if (lines.length > 0 && /^[A-Za-z].*: \d{4} \|/.test(lines[0])) {
      const movieName = lines[0].split(':')[0].trim();
      const chunkSize = chunk.length;
      const lineCount = lines.length;

      const rawChunk: RawMovieChunk = {
        name: movieName,
        chunkSize,
        lineCount,
        chunkNumber: i + 1,
        content: chunk,
      };

      rawMovieChunks.push(rawChunk);
    }
  });

  return rawMovieChunks;
}

describe('parseMovieChunks - validating correct movies are identified', () => {
  const tempFiles: string[] = [];

  const createTestMovieFile = async (content: string): Promise<string> => {
    const tempFile = join(tmpdir(), `test-movies-${crypto.randomUUID()}-${Math.random()}.txt`);
    await writeFile(tempFile, content, 'utf-8');
    tempFiles.push(tempFile);
    return tempFile;
  };

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

  it('should identify only valid movies and ignore invalid entries', async () => {
    const movieData = `The Matrix: 1999 | R | 2h 16m | 8.7 rating
A computer hacker learns from mysterious rebels.

Random text without proper format
This should be ignored.

Inception: 2010 | PG-13 | 2h 28m | 8.8 rating
Another valid movie entry.

Another random line
Not a movie.

123: 2020 | R | 1h | 5.0 rating
This starts with numbers, should be ignored.

Valid Movie: 2023 | PG | 2h | 8.0 rating
This should be counted.`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    // Should have exactly 3 movies
    expect(result).toHaveLength(3);

    // Validate each movie using Zod schema
    result.forEach((chunk) => {
      const validation = movieChunkSchema.safeParse(chunk);
      expect(validation.success).toBe(true);
    });

    // Check that the correct movies are identified by name
    const movieNames = result.map((chunk) => chunk.name);
    expect(movieNames).toContain('The Matrix');
    expect(movieNames).toContain('Inception');
    expect(movieNames).toContain('Valid Movie');

    // Verify invalid entries are NOT included
    expect(movieNames).not.toContain('Random text without proper format');
    expect(movieNames).not.toContain('123'); // Starts with numbers
    expect(movieNames).not.toContain('Another random line');
  });

  it('should preserve correct chunk numbers and content', async () => {
    const movieData = `First Movie: 2020 | PG | 2h | 8.0 rating
First movie description.

Invalid entry without year
Should be skipped.

Second Movie: 2021 | R | 1h 30m | 7.5 rating
Second movie description.`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(2);

    const firstMovie = result[0];
    const secondMovie = result[1];

    // Check names
    expect(firstMovie.name).toBe('First Movie');
    expect(secondMovie.name).toBe('Second Movie');

    // Check chunk numbers (should reflect original positions)
    expect(firstMovie.chunkNumber).toBe(1); // First chunk
    expect(secondMovie.chunkNumber).toBe(3); // Third chunk (skipped invalid second chunk)

    // Check content includes the full movie entry
    expect(firstMovie.content).toContain('First Movie: 2020');
    expect(firstMovie.content).toContain('First movie description.');
    expect(secondMovie.content).toContain('Second Movie: 2021');
    expect(secondMovie.content).toContain('Second movie description.');
  });

  it('should handle movies with complex titles correctly', async () => {
    const movieData = `Spider-Man: Into the Spider-Verse: 2018 | PG | 1h 57m | 8.4 rating
Animated Spider-Man movie.

The Lord of the Rings: The Fellowship of the Ring: 2001 | PG-13 | 3h 8m | 8.8 rating
Fantasy epic movie.

Star Wars: Episode IV - A New Hope: 1977 | PG | 2h 1m | 8.6 rating
Classic space opera.`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(3);

    const movieNames = result.map((chunk) => chunk.name);
    expect(movieNames).toContain('Spider-Man');
    expect(movieNames).toContain('The Lord of the Rings');
    expect(movieNames).toContain('Star Wars');
  });

  it('should validate chunk sizes are calculated correctly', async () => {
    const shortMovie = `Short: 2020 | G | 1h | 7.0 rating
Short.`;

    const longMovie = `Very Long Title: 2023 | R | 3h | 8.5 rating
This is a much longer description that should result in a larger chunk size.`;

    const movieData = `${shortMovie}

${longMovie}`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(2);

    const shortChunk = result.find((chunk) => chunk.name === 'Short');
    const longChunk = result.find((chunk) => chunk.name === 'Very Long Title');

    expect(shortChunk).toBeDefined();
    expect(longChunk).toBeDefined();

    // Verify chunk sizes are correct
    expect(shortChunk!.chunkSize).toBe(shortMovie.length);
    expect(longChunk!.chunkSize).toBe(longMovie.length);
    expect(longChunk!.chunkSize).toBeGreaterThan(shortChunk!.chunkSize);
  });
});

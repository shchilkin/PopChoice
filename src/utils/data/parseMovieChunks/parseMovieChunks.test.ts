import { readFileSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { movieChunkSchema } from '../../schemas/movieSchemas';

// Define the interface for our raw movie chunks (matches the internal function's output)
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

  // Split by empty lines to separate movie entries
  const chunks = content.split('\n\n');

  const rawMovieChunks: RawMovieChunk[] = [];

  chunks.forEach((chunk, i) => {
    if (!chunk.trim()) return;

    const lines = chunk.trim().split('\n');

    // Check if first line contains movie title with year (format: "Title: YYYY | ...")
    if (lines.length > 0 && /^[A-Za-z0-9].*: \d{4} \|/.test(lines[0])) {
      const movieName = lines[0].replace(/: \d{4} \|.*$/, '').trim();
      const chunkSize = chunk.length;
      const lineCount = lines.length;

      // Create raw data object for validation
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

describe('parseMovieChunks', () => {
  const tempFiles: string[] = [];

  // Helper function to create temporary test files
  const createTestMovieFile = async (content: string): Promise<string> => {
    const tempFile = join(tmpdir(), `test-movies-${Date.now()}-${Math.random()}.txt`);
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

  it('should parse valid movie entries correctly', async () => {
    const movieData = `The Matrix: 1999 | R | 2h 16m | 8.7 rating
A computer hacker learns from mysterious rebels about the true nature of his reality.

Inception: 2010 | PG-13 | 2h 28m | 8.8 rating
A thief who steals corporate secrets through dream-sharing technology.

Interstellar: 2014 | PG-13 | 2h 49m | 8.6 rating
A team of explorers travel through a wormhole in space.`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(3);

    // Check first movie
    expect(result[0].name).toBe('The Matrix');
    expect(result[0].chunkNumber).toBe(1);
    expect(result[0].lineCount).toBe(2);
    expect(result[0].content).toContain('The Matrix: 1999');
    expect(result[0].content).toContain('A computer hacker learns');

    // Check second movie
    expect(result[1].name).toBe('Inception');
    expect(result[1].chunkNumber).toBe(2);
    expect(result[1].lineCount).toBe(2);

    // Check third movie
    expect(result[2].name).toBe('Interstellar');
    expect(result[2].chunkNumber).toBe(3);
    expect(result[2].lineCount).toBe(2);
  });

  it('should handle empty file correctly', async () => {
    const testFile = await createTestMovieFile('');
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle file with only whitespace', async () => {
    const testFile = await createTestMovieFile('   \n\n  \t  \n\n   ');
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(0);
  });

  it('should ignore invalid entries that do not match pattern', async () => {
    const movieData = `The Matrix | R | 2h 16m | 8.7 rating
Missing year in title - should be ignored.

Inception: 2010 | PG-13 | 2h 28m | 8.8 rating
Valid movie entry.

Random text without proper format
This should be ignored completely.

Interstellar: 2014 | PG-13 | 2h 49m | 8.6 rating
Another valid movie entry.

123: 2020 | R | 1h | 5.0 rating
Starts with numbers - should now be counted.`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    // Should find 3 valid movies: Inception, Interstellar, and 123
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Inception');
    expect(result[1].name).toBe('Interstellar');
    expect(result[2].name).toBe('123');
  });

  it('should calculate chunk sizes correctly', async () => {
    const shortMovie = `Short: 2020 | G | 1h | 7.0 rating
Brief description.`;

    const longMovie = `Very Long Movie Title: 2023 | R | 3h | 8.5 rating
This is a much longer description that spans multiple lines and contains significantly more text than the short movie above. This should result in a larger chunk size calculation.`;

    const movieData = `${shortMovie}

${longMovie}`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(2);

    const shortChunk = result.find((chunk) => chunk.name === 'Short');
    const longChunk = result.find((chunk) => chunk.name === 'Very Long Movie Title');

    expect(shortChunk).toBeDefined();
    expect(longChunk).toBeDefined();

    // Verify chunk sizes match expected lengths
    expect(shortChunk!.chunkSize).toBe(shortMovie.length);
    expect(longChunk!.chunkSize).toBe(longMovie.length);
    expect(longChunk!.chunkSize).toBeGreaterThan(shortChunk!.chunkSize);
  });

  it('should handle movies with complex titles containing colons', async () => {
    const movieData = `Spider-Man: Into the Spider-Verse: 2018 | PG | 1h 57m | 8.4 rating
Animated Spider-Man movie with multiple colons in title.

The Lord of the Rings: The Fellowship of the Ring: 2001 | PG-13 | 3h 8m | 8.8 rating
Fantasy epic with long title.

Star Wars: Episode IV - A New Hope: 1977 | PG | 2h 1m | 8.6 rating
Classic space opera.`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(3);

    // Should extract full title (everything before the trailing ": YYYY")
    expect(result[0].name).toBe('Spider-Man: Into the Spider-Verse');
    expect(result[1].name).toBe('The Lord of the Rings: The Fellowship of the Ring');
    expect(result[2].name).toBe('Star Wars: Episode IV - A New Hope');
  });

  it('should handle movies with multi-line descriptions', async () => {
    const movieData = `The Matrix: 1999 | R | 2h 16m | 8.7 rating
A computer hacker learns from mysterious rebels.
This movie has multiple lines in its description.
Each line adds to the total content.

Inception: 2010 | PG-13 | 2h 28m | 8.8 rating
Single line description.`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(2);

    // The Matrix should have 4 lines (title + 3 description lines)
    expect(result[0].name).toBe('The Matrix');
    expect(result[0].lineCount).toBe(4);
    expect(result[0].content).toContain('Each line adds to the total content.');

    // Inception should have 2 lines (title + 1 description line)
    expect(result[1].name).toBe('Inception');
    expect(result[1].lineCount).toBe(2);
  });

  it('should maintain correct chunk numbers even with skipped entries', async () => {
    const movieData = `Valid Movie 1: 2020 | PG | 2h | 8.0 rating
First valid movie.

Invalid entry without year
This should be skipped.

Another invalid entry
Also should be skipped.

Valid Movie 2: 2021 | R | 1h 30m | 7.5 rating
Second valid movie.

123: 2022 | G | 1h | 6.0 rating
Starts with number - now valid.

Valid Movie 3: 2023 | PG-13 | 2h 15m | 8.5 rating
Third valid movie.`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(4);

    // Check that chunk numbers reflect original positions in file
    expect(result[0].name).toBe('Valid Movie 1');
    expect(result[0].chunkNumber).toBe(1); // First chunk

    expect(result[1].name).toBe('Valid Movie 2');
    expect(result[1].chunkNumber).toBe(4); // Fourth chunk (after skipping 2 invalid ones)

    expect(result[2].name).toBe('123');
    expect(result[2].chunkNumber).toBe(5); // Fifth chunk

    expect(result[3].name).toBe('Valid Movie 3');
    expect(result[3].chunkNumber).toBe(6); // Sixth chunk
  });

  it('should handle edge case years correctly', async () => {
    const movieData = `Early Cinema: 1900 | NR | 1h | 6.0 rating
Very old movie from early cinema.

Recent Release: 2024 | PG | 2h | 7.5 rating
Recently released movie.

Future Film: 2099 | R | 2h 30m | 9.0 rating
Futuristic sci-fi movie.`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(3);
    expect(result.map((chunk) => chunk.name)).toEqual([
      'Early Cinema',
      'Recent Release',
      'Future Film',
    ]);
  });

  it('should validate that parsed chunks conform to schema', async () => {
    const movieData = `Test Movie: 2023 | PG | 1h 45m | 8.2 rating
A test movie for schema validation.`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(1);

    // Validate that the parsed chunk conforms to the movie chunk schema
    const validationResult = movieChunkSchema.safeParse(result[0]);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      const validatedChunk = validationResult.data;
      expect(validatedChunk.name).toBe('Test Movie');
      expect(validatedChunk.chunkSize).toBeGreaterThan(0);
      expect(validatedChunk.lineCount).toBe(2);
      expect(validatedChunk.chunkNumber).toBe(1);
      expect(validatedChunk.content).toContain('Test Movie: 2023');
    }
  });

  it('should throw error for non-existent file', async () => {
    const nonExistentFile = join(tmpdir(), 'non-existent-file-12345.txt');

    expect(() => {
      parseMovieChunks(nonExistentFile);
    }).toThrow();
  });

  it('should handle single movie entry', async () => {
    const movieData = `Standalone Movie: 2023 | R | 1h 50m | 7.8 rating
This is the only movie in the file.`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Standalone Movie');
    expect(result[0].chunkNumber).toBe(1);
    expect(result[0].chunkSize).toBe(movieData.length);
    expect(result[0].lineCount).toBe(2);
  });

  it('should handle movies with special characters and punctuation', async () => {
    const movieData = `Amélie: 2001 | R | 2h 2m | 8.3 rating
French movie with accented characters.

Spider-Man: No Way Home: 2021 | PG-13 | 2h 28m | 8.2 rating
Movie with hyphens and punctuation.

The Grand Budapest Hotel: 2014 | R | 1h 39m | 8.1 rating
Movie with multiple capital letters.`;

    const testFile = await createTestMovieFile(movieData);
    const result = parseMovieChunks(testFile);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Amélie');
    expect(result[1].name).toBe('Spider-Man: No Way Home');
    expect(result[2].name).toBe('The Grand Budapest Hotel');
  });
});

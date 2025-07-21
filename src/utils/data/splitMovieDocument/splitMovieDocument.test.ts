import fs from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { splitMovieDocument } from './splitMovieDocument';

describe('splitMovieDocument', () => {
  let testFilePath: string;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create a unique test file path
    testFilePath = path.join(tmpdir(), `test-movies-${Date.now()}.txt`);

    // Spy on console.error to capture validation error logs
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(testFilePath);
    } catch {
      // File might not exist, ignore error
    }

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  it('should split valid movie document correctly', async () => {
    const movieData = `The Matrix: 1999 | R | Action, Sci-Fi
A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.

Inception: 2010 | PG-13 | Action, Drama, Sci-Fi
A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(2);

    // First movie
    expect(result[0].pageContent).toContain('The Matrix: 1999');
    expect(result[0].pageContent).toContain('A computer hacker learns');
    expect(result[0].metadata).toEqual({
      movieIndex: 1,
      movieName: 'The Matrix',
      chunkSize: result[0].pageContent.length,
      source: testFilePath,
    });

    // Second movie (index 2 since there are only 2 chunks when split by \n\n)
    expect(result[1].pageContent).toContain('Inception: 2010');
    expect(result[1].pageContent).toContain('A thief who steals');
    expect(result[1].metadata).toEqual({
      movieIndex: 2,
      movieName: 'Inception',
      chunkSize: result[1].pageContent.length,
      source: testFilePath,
    });
  });
  it('should handle single movie document', async () => {
    const movieData = `The Godfather: 1972 | R | Crime, Drama
The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(1);
    expect(result[0].pageContent).toContain('The Godfather: 1972');
    expect(result[0].metadata).toEqual({
      movieIndex: 1,
      movieName: 'The Godfather',
      chunkSize: result[0].pageContent.length,
      source: testFilePath,
    });
  });

  it('should handle empty file', async () => {
    await fs.writeFile(testFilePath, '');

    const result = await splitMovieDocument(testFilePath);

    expect(result).toEqual([]);
  });

  it('should handle file with only whitespace', async () => {
    await fs.writeFile(testFilePath, '   \n\n\t  ');

    const result = await splitMovieDocument(testFilePath);

    expect(result).toEqual([]);
  });

  it('should skip empty chunks between movies', async () => {
    const movieData = `The Matrix: 1999 | R | Action, Sci-Fi
A computer hacker learns about reality.



Inception: 2010 | PG-13 | Action, Drama, Sci-Fi
A thief who steals corporate secrets.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(2);
    expect(result[0].metadata.movieName).toBe('The Matrix');
    expect(result[1].metadata.movieName).toBe('Inception');
  });

  it('should handle movies with complex titles', async () => {
    const movieData = `The Lord of the Rings The Fellowship of the Ring: 2001 | PG-13 | Adventure, Drama, Fantasy
A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring.

Spider-Man Into the Spider-Verse: 2018 | PG | Animation, Action, Adventure
Teen Miles Morales becomes Spider-Man of his reality.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(2);
    expect(result[0].metadata.movieName).toBe('The Lord of the Rings The Fellowship of the Ring');
    expect(result[1].metadata.movieName).toBe('Spider-Man Into the Spider-Verse');
  });

  it('should handle movies with special characters in titles', async () => {
    const movieData = `Amélie: 2001 | R | Comedy, Romance
A shy waitress decides to help those around her find happiness.

The Good, the Bad & the Ugly: 1966 | R | Western
A bounty hunting scam joins two men in an uneasy alliance.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(2);
    expect(result[0].metadata.movieName).toBe('Amélie');
    expect(result[1].metadata.movieName).toBe('The Good, the Bad & the Ugly');
  });

  it('should skip invalid movie entries without proper format', async () => {
    const movieData = `Valid Movie: 2020 | R | Action
This is a valid movie entry.

Invalid Entry Without Year
This should be skipped.

Another Valid Movie: 1995 | PG | Comedy
This is another valid entry.

Not A Movie Title
No year in this line either.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(2);
    expect(result[0].metadata.movieName).toBe('Valid Movie');
    expect(result[1].metadata.movieName).toBe('Another Valid Movie');
  });

  it('should handle different year formats', async () => {
    const movieData = `Classic Movie: 1942 | NR | Drama
A classic film from the 1940s.

Modern Movie: 2023 | PG-13 | Action
A recent blockbuster film.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(2);
    expect(result[0].pageContent).toContain('1942');
    expect(result[1].pageContent).toContain('2023');
  });

  it('should preserve multiline descriptions', async () => {
    const movieData = `Long Movie: 2000 | R | Drama
This is a movie with a very long description.
It spans multiple lines and contains detailed plot information.
The description includes character development and themes.
This should all be preserved in the document content.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(1);
    expect(result[0].pageContent).toContain('This is a movie with a very long description.');
    expect(result[0].pageContent).toContain('It spans multiple lines');
    expect(result[0].pageContent).toContain('This should all be preserved');
  });

  it('should handle large file with many movies', async () => {
    const movieEntries = Array.from(
      { length: 50 },
      (_, i) => `Movie ${i + 1}: ${2000 + i} | PG | Genre\nDescription for movie ${i + 1}.`,
    ).join('\n\n');

    await fs.writeFile(testFilePath, movieEntries);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(50);
    expect(result[0].metadata.movieName).toBe('Movie 1');
    expect(result[49].metadata.movieName).toBe('Movie 50');

    // Check that movieIndex is correctly assigned (consecutive numbering for valid movies)
    expect(result[0].metadata.movieIndex).toBe(1);
    expect(result[1].metadata.movieIndex).toBe(2); // Second chunk gets index 2
  });

  it('should handle file with mixed valid and invalid entries', async () => {
    const movieData = `Valid Movie 1: 2020 | R | Action
First valid movie.

Invalid Entry
No proper format here.

Valid Movie 2: 2019 | PG | Comedy
Second valid movie.

Another Invalid
Still no year format.

Valid Movie 3: 2021 | PG-13 | Drama
Third valid movie.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(3);
    expect(result[0].metadata.movieName).toBe('Valid Movie 1');
    expect(result[1].metadata.movieName).toBe('Valid Movie 2');
    expect(result[2].metadata.movieName).toBe('Valid Movie 3');
  });

  it('should calculate correct chunk sizes', async () => {
    const movieData = `Short: 2020 | G | Comedy
Short description.

Very Long Movie Title With Many Words: 2021 | R | Drama
This is a much longer description that contains significantly more text than the first movie. It includes detailed plot points, character descriptions, and thematic elements that make the chunk size much larger than the previous entry.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(2);
    expect(result[0].metadata.chunkSize).toBeLessThan(result[1].metadata.chunkSize);
    expect(result[0].metadata.chunkSize).toBeGreaterThan(0);
    expect(result[1].metadata.chunkSize).toBeGreaterThan(100);
  });

  it('should handle different line endings (CRLF and LF)', async () => {
    // Since the function splits by \n\n, we need to use \n\n even with CRLF line endings
    const movieDataCRLF = `Movie A: 2020 | R | Action\r\nDescription A\n\nMovie B: 2021 | PG | Comedy\r\nDescription B`;

    await fs.writeFile(testFilePath, movieDataCRLF);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(2);
    expect(result[0].metadata.movieName).toBe('Movie A');
    expect(result[1].metadata.movieName).toBe('Movie B');
  });
  it('should throw error for non-existent file', async () => {
    const nonExistentPath = '/path/that/does/not/exist.txt';

    await expect(splitMovieDocument(nonExistentPath)).rejects.toThrow();
  });

  it('should validate metadata against schema', async () => {
    const movieData = `Test Movie: 2020 | R | Action
Valid movie entry.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(1);

    // Verify metadata structure matches schema
    const metadata = result[0].metadata;
    expect(typeof metadata.movieIndex).toBe('number');
    expect(typeof metadata.movieName).toBe('string');
    expect(typeof metadata.chunkSize).toBe('number');
    expect(typeof metadata.source).toBe('string');

    expect(metadata.movieIndex).toBeGreaterThan(0);
    expect(metadata.movieName.length).toBeGreaterThan(0);
    expect(metadata.chunkSize).toBeGreaterThanOrEqual(0);
    expect(metadata.source.length).toBeGreaterThan(0);
  });

  it('should skip movies starting with numbers (due to regex constraint)', async () => {
    const movieData = `A Space Odyssey 2001: 1968 | G | Sci-Fi
After discovering a mysterious artifact buried beneath the Lunar surface.

Twelve Angry Men: 1957 | NR | Crime, Drama
A jury holdout attempts to prevent a miscarriage of justice.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(2);
    expect(result[0].metadata.movieName).toBe('A Space Odyssey 2001');
    expect(result[1].metadata.movieName).toBe('Twelve Angry Men');
  });

  it('should handle edge case with regex pattern', async () => {
    const movieData = `A: 2020 | R | Action
Single letter title.

Movie Without Genre: 1999 | PG
Missing genre information.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(2);
    expect(result[0].metadata.movieName).toBe('A');
    expect(result[1].metadata.movieName).toBe('Movie Without Genre');
  });

  it('should handle very large movie descriptions', async () => {
    const longDescription = 'This is an extremely long movie description. '.repeat(100);
    const movieData = `Epic Movie: 2020 | R | Epic\n${longDescription}`;

    await fs.writeFile(testFilePath, movieData);

    const result = await splitMovieDocument(testFilePath);

    expect(result).toHaveLength(1);
    expect(result[0].metadata.chunkSize).toBeGreaterThan(1000);
    expect(result[0].pageContent).toContain('This is an extremely long movie description.');
    expect(result[0].pageContent).toContain('Epic Movie: 2020 | R | Epic');
  });
});

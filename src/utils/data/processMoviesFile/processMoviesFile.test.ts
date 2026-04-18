import fs from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { processMoviesFile } from './processMoviesFile';

describe('processMoviesFile', () => {
  let testFilePath: string;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create a unique test file path
    testFilePath = path.join(tmpdir(), `test-movies-${crypto.randomUUID()}.txt`);

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

  it('should process valid movie file correctly', async () => {
    const movieData = `The Matrix | R | 2h 16m | 8.7 rating
A computer hacker learns from mysterious rebels about the true nature of his reality.
Inception | PG-13 | 2h 28m | 8.8 rating
A thief who steals corporate secrets through dream-sharing technology.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      movieName: 'The Matrix',
      ageRating: 'R',
      duration: 136, // 2h 16m converted to minutes
      scoreRating: 8.7,
      description:
        'A computer hacker learns from mysterious rebels about the true nature of his reality.',
    });

    expect(result[1]).toEqual({
      movieName: 'Inception',
      ageRating: 'PG-13',
      duration: 148, // 2h 28m converted to minutes
      scoreRating: 8.8,
      description: 'A thief who steals corporate secrets through dream-sharing technology.',
    });
  });

  it('should handle empty file', async () => {
    await fs.writeFile(testFilePath, '');

    const result = await processMoviesFile(testFilePath);

    expect(result).toEqual([]);
  });

  it('should handle file with only whitespace', async () => {
    await fs.writeFile(testFilePath, '   \n\n\t  ');

    const result = await processMoviesFile(testFilePath);

    expect(result).toEqual([]);
  });

  it('should throw error for non-existent file', async () => {
    const nonExistentPath = '/path/that/does/not/exist.txt';

    await expect(processMoviesFile(nonExistentPath)).rejects.toThrow(
      'File not found: /path/that/does/not/exist.txt',
    );
  });

  it('should throw error for odd number of lines', async () => {
    const movieData = `The Matrix | R | 2h 16m | 8.7 rating
A computer hacker learns from mysterious rebels.
Inception | PG-13 | 2h 28m | 8.8 rating`;
    // Missing description for Inception

    await fs.writeFile(testFilePath, movieData);

    await expect(processMoviesFile(testFilePath)).rejects.toThrow(
      'Invalid file format: Odd number of lines detected. Each movie entry must have a description line.',
    );
  });

  it('should handle single movie entry', async () => {
    const movieData = `The Godfather | R | 2h 55m | 9.2 rating
The aging patriarch of an organized crime dynasty transfers control.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      movieName: 'The Godfather',
      ageRating: 'R',
      duration: 175, // 2h 55m converted to minutes
      scoreRating: 9.2,
      description: 'The aging patriarch of an organized crime dynasty transfers control.',
    });
  });

  it('should handle different line endings (CRLF and LF)', async () => {
    const movieDataCRLF = `Movie A | R | 2h | 8.0 rating\r\nDescription A\r\nMovie B | PG | 1h 30m | 7.5 rating\r\nDescription B`;

    await fs.writeFile(testFilePath, movieDataCRLF);

    const result = await processMoviesFile(testFilePath);

    expect(result).toHaveLength(2);
    expect(result[0].movieName).toBe('Movie A');
    expect(result[1].movieName).toBe('Movie B');
  });

  it('should handle various duration formats', async () => {
    const movieData = `Movie A | G | 1h 30m | 7.5 rating
Description A
Movie B | PG | 2h | 8.0 rating
Description B
Movie C | PG-13 | 90m | 7.8 rating
Description C
Movie D | R | 120 | 8.2 rating
Description D`;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    expect(result).toHaveLength(4);
    expect(result[0].duration).toBe(90); // 1h 30m
    expect(result[1].duration).toBe(120); // 2h
    expect(result[2].duration).toBe(90); // 90m
    expect(result[3].duration).toBe(120); // 120 (plain number)
  });

  it('should handle different age ratings', async () => {
    const movieData = `Movie G | G | 1h 30m | 7.0 rating
Family friendly movie
Movie PG | PG | 1h 45m | 7.5 rating
Some mild content
Movie PG13 | PG-13 | 2h | 8.0 rating
Some intense scenes
Movie R | R | 2h 15m | 8.5 rating
Adult content
Movie NR | NR | 1h 50m | 7.8 rating
Not rated content`;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    expect(result).toHaveLength(5);
    expect(result[0].ageRating).toBe('G');
    expect(result[1].ageRating).toBe('PG');
    expect(result[2].ageRating).toBe('PG-13');
    expect(result[3].ageRating).toBe('R');
    expect(result[4].ageRating).toBe('NR');
  });

  it('should handle international age ratings', async () => {
    const movieData = `Movie A | 12+ | 2h | 8.0 rating
European 12+ rating
Movie B | 15 | 1h 45m | 7.5 rating
UK 15 rating
Movie C | 16+ | 2h 10m | 8.2 rating
European 16+ rating
Movie D | 18+ | 1h 55m | 8.8 rating
European 18+ rating`;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    expect(result).toHaveLength(4);
    expect(result[0].ageRating).toBe('12+');
    expect(result[1].ageRating).toBe('15');
    expect(result[2].ageRating).toBe('16+');
    expect(result[3].ageRating).toBe('18+');
  });

  it('should handle score ratings with and without "rating" suffix', async () => {
    const movieData = `Movie A | R | 2h | 8.7 rating
Description A
Movie B | PG | 1h 30m | 9.1
Description B
Movie C | G | 2h 10m | 7.5 Rating
Description C`;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    expect(result).toHaveLength(3);
    expect(result[0].scoreRating).toBe(8.7);
    expect(result[1].scoreRating).toBe(9.1);
    expect(result[2].scoreRating).toBe(7.5);
  });

  it('should trim whitespace from all fields', async () => {
    const movieData = `  The Matrix  |  R  |  2h 16m  |  8.7 rating  
  A computer hacker learns from mysterious rebels.  `;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      movieName: 'The Matrix',
      ageRating: 'R',
      duration: 136,
      scoreRating: 8.7,
      description: 'A computer hacker learns from mysterious rebels.',
    });
  });

  it('should handle complex movie names', async () => {
    const movieData = `The Lord of the Rings: The Fellowship of the Ring | PG-13 | 2h 58m | 8.8 rating
A meek Hobbit from the Shire and eight companions set out on a journey.
Spider-Man: Into the Spider-Verse | PG | 1h 57m | 8.4 rating
Teen Miles Morales becomes the Spider-Man of his universe.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    expect(result).toHaveLength(2);
    expect(result[0].movieName).toBe('The Lord of the Rings: The Fellowship of the Ring');
    expect(result[1].movieName).toBe('Spider-Man: Into the Spider-Verse');
  });

  it('should return empty array and log errors for invalid data', async () => {
    const movieData = `Invalid Movie | INVALID_RATING | 2h | 8.7 rating
Description for invalid movie
Another Movie | R | invalid_duration | not_a_number
Another description`;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Validation errors:', expect.any(Object));
  });

  it('should handle movies with zero or negative duration', async () => {
    const movieData = `Movie A | R | 0h | 8.7 rating
Movie with zero duration
Movie B | PG | -1h | 7.5 rating
Movie with negative duration`;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should handle invalid score ratings', async () => {
    const movieData = `Movie A | R | 2h | invalid_score
Movie with invalid score
Movie B | PG | 1h 30m | not_a_number_rating
Another invalid score`;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should handle very long descriptions', async () => {
    const longDescription =
      "This is a very long movie description that spans multiple sentences and contains detailed plot information about the characters, their motivations, the setting, and the overall narrative arc of the film. It includes extensive details about the cinematography, the acting performances, and the director's vision for the project.";

    const movieData = `Epic Movie | PG-13 | 3h 20m | 9.0 rating
${longDescription}`;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe(longDescription);
    expect(result[0].duration).toBe(200); // 3h 20m
  });

  it('should handle large file with many movies', async () => {
    const movieEntries = Array.from(
      { length: 100 },
      (_, i) => `Movie ${i + 1} | R | 2h | 8.${i % 10} rating\nDescription for movie ${i + 1}.`,
    ).join('\n');

    await fs.writeFile(testFilePath, movieEntries);

    const result = await processMoviesFile(testFilePath);

    expect(result).toHaveLength(100);
    expect(result[0].movieName).toBe('Movie 1');
    expect(result[99].movieName).toBe('Movie 100');
  });

  it('should handle edge case score ratings', async () => {
    const movieData = `Movie A | R | 2h | 0.0 rating
Movie with zero rating
Movie B | PG | 1h 30m | 10.0 rating
Movie with perfect rating
Movie C | G | 2h 15m | 5.5 rating
Movie with decimal rating`;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    expect(result).toHaveLength(3);
    expect(result[0].scoreRating).toBe(0.0);
    expect(result[1].scoreRating).toBe(10.0);
    expect(result[2].scoreRating).toBe(5.5);
  });

  it('should handle mixed valid and invalid entries', async () => {
    const movieData = `Valid Movie | R | 2h | 8.7 rating
This is a valid movie entry.
Invalid Movie | INVALID_RATING | 2h | 8.0 rating
This movie has invalid rating.
Another Valid | PG | 1h 30m | 7.5 rating
This is another valid entry.`;

    await fs.writeFile(testFilePath, movieData);

    const result = await processMoviesFile(testFilePath);

    // Should return empty array because validation fails for the whole batch
    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should handle unexpected file system errors', async () => {
    // Test with a path that would cause a system error
    const invalidPath = '\0invalid\0path\0';

    await expect(processMoviesFile(invalidPath)).rejects.toThrow();
  });
});

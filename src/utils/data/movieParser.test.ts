import fs from 'fs/promises';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ageRatings,
  cleanMovieName,
  convertTextToMovieObjects,
  extractYearFromTitleLine,
  movieSchema,
  parseDurationToMinutes,
  parseMovieNameAndYear,
  processMoviesFile,
} from './movieParser';

describe('movieParser', () => {
  describe('parseDurationToMinutes', () => {
    it('should parse hours and minutes correctly', () => {
      expect(parseDurationToMinutes('1h 42m')).toBe(102);
      expect(parseDurationToMinutes('2h 30m')).toBe(150);
      expect(parseDurationToMinutes('3h 7m')).toBe(187);
    });

    it('should parse hours only', () => {
      expect(parseDurationToMinutes('2h')).toBe(120);
      expect(parseDurationToMinutes('1h')).toBe(60);
      expect(parseDurationToMinutes('3h')).toBe(180);
    });

    it('should parse minutes only', () => {
      expect(parseDurationToMinutes('90m')).toBe(90);
      expect(parseDurationToMinutes('45m')).toBe(45);
      expect(parseDurationToMinutes('120m')).toBe(120);
    });

    it('should parse plain numbers as minutes', () => {
      expect(parseDurationToMinutes('90')).toBe(90);
      expect(parseDurationToMinutes('120')).toBe(120);
      expect(parseDurationToMinutes('45')).toBe(45);
    });

    it('should handle edge cases', () => {
      expect(parseDurationToMinutes('')).toBe(0);
      expect(parseDurationToMinutes('   ')).toBe(0);
      expect(parseDurationToMinutes('invalid')).toBe(0);
      expect(parseDurationToMinutes('0h 0m')).toBe(0);
    });

    it('should handle null and undefined', () => {
      expect(parseDurationToMinutes(null as unknown as string)).toBe(0);
      expect(parseDurationToMinutes(undefined as unknown as string)).toBe(0);
    });

    it('should handle complex formats with extra spaces', () => {
      expect(parseDurationToMinutes('  1h   42m  ')).toBe(102);
      expect(parseDurationToMinutes('2h30m')).toBe(150); // No spaces
    });
  });

  describe('parseMovieNameAndYear', () => {
    it('should parse movie name with year correctly', () => {
      const result = parseMovieNameAndYear('The Matrix: 1999');
      expect(result).toEqual({ name: 'The Matrix', year: 1999 });
    });

    it('should handle movies without year', () => {
      const result = parseMovieNameAndYear('The Matrix');
      expect(result).toEqual({ name: 'The Matrix', year: 0 });
    });

    it('should handle extra spaces around year', () => {
      const result = parseMovieNameAndYear('The Matrix:   1999   ');
      expect(result).toEqual({ name: 'The Matrix', year: 1999 });
    });

    it('should handle movies with colons in title', () => {
      const result = parseMovieNameAndYear('Star Wars: A New Hope: 1977');
      expect(result).toEqual({ name: 'Star Wars: A New Hope', year: 1977 });
    });
  });

  describe('extractYearFromTitleLine', () => {
    it('should extract year from full title line', () => {
      const titleLine = 'The Matrix: 1999 | R | 2h 16m | 8.7 rating';
      expect(extractYearFromTitleLine(titleLine)).toBe(1999);
    });

    it('should return 0 if no year found', () => {
      const titleLine = 'The Matrix | R | 2h 16m | 8.7 rating';
      expect(extractYearFromTitleLine(titleLine)).toBe(0);
    });

    it('should handle different formats', () => {
      expect(extractYearFromTitleLine('Movie: 2023 | PG | 1h 30m | 7.5 rating')).toBe(2023);
      expect(extractYearFromTitleLine('Movie:2023| PG | 1h 30m | 7.5 rating')).toBe(2023);
    });
  });

  describe('cleanMovieName', () => {
    it('should remove year from movie name', () => {
      expect(cleanMovieName('The Matrix: 1999')).toBe('The Matrix');
      expect(cleanMovieName('Inception: 2010')).toBe('Inception');
    });

    it('should handle names without year', () => {
      expect(cleanMovieName('The Matrix')).toBe('The Matrix');
      expect(cleanMovieName('Inception')).toBe('Inception');
    });

    it('should trim extra spaces', () => {
      expect(cleanMovieName('  The Matrix: 1999  ')).toBe('The Matrix');
      expect(cleanMovieName('The Matrix:   1999   ')).toBe('The Matrix');
    });
  });

  describe('movieSchema', () => {
    it('should validate and transform valid movie data', () => {
      const rawMovie = {
        movieName: 'The Matrix: 1999',
        ageRating: 'R',
        duration: '2h 16m',
        scoreRating: '8.7 rating',
        description: 'A computer programmer discovers reality is a simulation.',
      };

      const result = movieSchema.parse(rawMovie);

      expect(result).toEqual({
        movieName: 'The Matrix: 1999',
        ageRating: 'R',
        duration: 136, // 2h 16m = 136 minutes
        scoreRating: 8.7,
        description: 'A computer programmer discovers reality is a simulation.',
      });
    });

    it('should transform duration string to minutes', () => {
      const rawMovie = {
        movieName: 'Test Movie: 2023',
        ageRating: 'PG',
        duration: '1h 30m',
        scoreRating: '7.5 rating',
        description: 'Test description',
      };

      const result = movieSchema.parse(rawMovie);
      expect(result.duration).toBe(90); // 1h 30m = 90 minutes
    });

    it('should transform score rating to number', () => {
      const rawMovie = {
        movieName: 'Test Movie: 2023',
        ageRating: 'PG',
        duration: '90m',
        scoreRating: '8.5 rating',
        description: 'Test description',
      };

      const result = movieSchema.parse(rawMovie);
      expect(result.scoreRating).toBe(8.5);
    });

    it('should reject invalid age ratings', () => {
      const rawMovie = {
        movieName: 'Test Movie: 2023',
        ageRating: 'INVALID',
        duration: '90m',
        scoreRating: '8.5 rating',
        description: 'Test description',
      };

      expect(() => movieSchema.parse(rawMovie)).toThrow();
    });

    it('should reject invalid duration (zero minutes)', () => {
      const rawMovie = {
        movieName: 'Test Movie: 2023',
        ageRating: 'PG',
        duration: '0m',
        scoreRating: '8.5 rating',
        description: 'Test description',
      };

      expect(() => movieSchema.parse(rawMovie)).toThrow('Duration must be a positive number');
    });

    it('should reject invalid score rating', () => {
      const rawMovie = {
        movieName: 'Test Movie: 2023',
        ageRating: 'PG',
        duration: '90m',
        scoreRating: 'invalid rating',
        description: 'Test description',
      };

      expect(() => movieSchema.parse(rawMovie)).toThrow();
    });
  });

  describe('convertTextToMovieObjects', () => {
    it('should convert valid text lines to movie objects', () => {
      const lines = [
        'The Matrix: 1999 | R | 2h 16m | 8.7 rating',
        'A computer programmer discovers that reality is a simulation.',
        'Inception: 2010 | PG-13 | 2h 28m | 8.8 rating',
        "A thief who enters people's dreams must plant an idea.",
      ];

      const result = convertTextToMovieObjects(lines);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        movieName: 'The Matrix: 1999',
        ageRating: 'R',
        duration: 136, // Converted to minutes
        scoreRating: 8.7,
        description: 'A computer programmer discovers that reality is a simulation.',
      });
      expect(result[1]).toEqual({
        movieName: 'Inception: 2010',
        ageRating: 'PG-13',
        duration: 148, // Converted to minutes
        scoreRating: 8.8,
        description: "A thief who enters people's dreams must plant an idea.",
      });
    });

    it('should return empty array for empty input', () => {
      expect(convertTextToMovieObjects([])).toEqual([]);
    });

    it('should throw error for odd number of lines', () => {
      const lines = [
        'The Matrix: 1999 | R | 2h 16m | 8.7 rating',
        'A description',
        'Incomplete movie line without description',
      ];

      expect(() => convertTextToMovieObjects(lines)).toThrow(
        'Invalid chunk format: Odd number of lines detected',
      );
    });

    it('should filter out empty lines', () => {
      const lines = [
        '',
        'The Matrix: 1999 | R | 2h 16m | 8.7 rating',
        'A computer programmer discovers that reality is a simulation.',
        '',
        '',
      ];

      const result = convertTextToMovieObjects(lines);
      expect(result).toHaveLength(1);
    });

    it('should handle validation errors gracefully', () => {
      const lines = [
        'Invalid Movie | INVALID_RATING | invalid_duration | invalid_score',
        'Some description',
      ];

      const result = convertTextToMovieObjects(lines);
      expect(result).toEqual([]); // Should return empty array on validation failure
    });
  });

  describe('processMoviesFile', () => {
    const testFilePath = path.resolve(process.cwd(), 'test-movies.txt');
    const emptyFilePath = path.resolve(process.cwd(), 'test-empty.txt');

    beforeEach(async () => {
      // Clean up any existing test files
      try {
        await fs.unlink(testFilePath);
        await fs.unlink(emptyFilePath);
      } catch {
        // Files don't exist, that's fine
      }
    });

    afterEach(async () => {
      // Clean up test files
      try {
        await fs.unlink(testFilePath);
        await fs.unlink(emptyFilePath);
      } catch {
        // Files don't exist, that's fine
      }
    });

    it('should process a valid movie file', async () => {
      const testContent = `The Matrix: 1999 | R | 2h 16m | 8.7 rating
A computer programmer discovers that reality is a simulation.
Inception: 2010 | PG-13 | 2h 28m | 8.8 rating
A thief who enters people's dreams must plant an idea.`;

      await fs.writeFile(testFilePath, testContent);

      const result = await processMoviesFile(testFilePath);

      expect(result).toHaveLength(2);
      expect(result[0].movieName).toBe('The Matrix: 1999');
      expect(result[0].duration).toBe(136); // Converted to minutes
      expect(result[1].movieName).toBe('Inception: 2010');
      expect(result[1].duration).toBe(148); // Converted to minutes
    });

    it('should return empty array for empty file', async () => {
      await fs.writeFile(emptyFilePath, '');

      const result = await processMoviesFile(emptyFilePath);
      expect(result).toEqual([]);
    });

    it('should throw error for non-existent file', async () => {
      await expect(processMoviesFile('non-existent-file.txt')).rejects.toThrow('File not found');
    });

    it('should throw error for invalid file format (odd lines)', async () => {
      const invalidContent = `The Matrix: 1999 | R | 2h 16m | 8.7 rating
A description
Incomplete line without description`;

      await fs.writeFile(testFilePath, invalidContent);

      await expect(processMoviesFile(testFilePath)).rejects.toThrow(
        'Invalid file format: Odd number of lines detected',
      );
    });

    it('should handle files with validation errors', async () => {
      const invalidContent = `Invalid Movie | INVALID_RATING | invalid_duration | invalid_score
Some description`;

      await fs.writeFile(testFilePath, invalidContent);

      const result = await processMoviesFile(testFilePath);
      expect(result).toEqual([]); // Should return empty array on validation failure
    });
  });

  describe('ageRatings', () => {
    it('should contain expected age rating options', () => {
      const expectedRatings = ['G', 'PG', 'PG-13', 'R', 'NR', '12+', '15', '16+', '18+'];

      expectedRatings.forEach((rating) => {
        expect(ageRatings.options).toContain(rating);
      });
    });

    it('should validate valid age ratings', () => {
      expect(() => ageRatings.parse('PG-13')).not.toThrow();
      expect(() => ageRatings.parse('R')).not.toThrow();
      expect(() => ageRatings.parse('G')).not.toThrow();
    });

    it('should reject invalid age ratings', () => {
      expect(() => ageRatings.parse('INVALID')).toThrow();
      expect(() => ageRatings.parse('X')).toThrow();
      expect(() => ageRatings.parse('')).toThrow();
    });
  });
});

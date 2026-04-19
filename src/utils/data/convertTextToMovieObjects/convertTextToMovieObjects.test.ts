import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import logger from '@/lib/logger';

import { convertTextToMovieObjects } from './convertTextToMovieObjects';

describe('convertTextToMovieObjects', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should return empty array for empty input', () => {
    const result = convertTextToMovieObjects([]);
    expect(result).toEqual([]);
  });

  it('should convert valid movie entries correctly', () => {
    const lines = [
      'The Matrix | R | 2h 16m | 8.7 rating',
      'A computer hacker learns from mysterious rebels about the true nature of his reality.',
      'Inception | PG-13 | 2h 28m | 8.8 rating',
      'A thief who steals corporate secrets through dream-sharing technology.',
    ];

    const result = convertTextToMovieObjects(lines);

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

  it('should filter out empty lines before processing', () => {
    const lines = [
      'The Matrix | R | 2h 16m | 8.7 rating',
      'A computer hacker learns from mysterious rebels.',
      '', // Empty line should be filtered out
      'Inception | PG-13 | 2h 28m | 8.8 rating',
      'A thief who steals corporate secrets.',
      // Note: Whitespace-only lines are still truthy, so they won't be filtered by filter(Boolean)
    ];

    const result = convertTextToMovieObjects(lines);
    expect(result).toHaveLength(2);
    expect(result[0].movieName).toBe('The Matrix');
    expect(result[1].movieName).toBe('Inception');
  });

  it('should handle whitespace-only lines (they are not filtered by Boolean)', () => {
    const lines = [
      'Movie A | R | 2h | 8.7 rating',
      'Description A',
      '   ', // Whitespace-only line is truthy, so it stays
    ];

    // This should throw because whitespace-only lines are not filtered by filter(Boolean)
    expect(() => convertTextToMovieObjects(lines)).toThrow(
      'Invalid chunk format: Odd number of lines detected. Each movie entry must have a description line.',
    );
  });

  it('should throw error for odd number of valid lines', () => {
    const lines = [
      'The Matrix | R | 2h 16m | 8.7 rating',
      'A computer hacker learns from mysterious rebels.',
      'Inception | PG-13 | 2h 28m | 8.8 rating',
      // Missing description line for Inception
    ];

    expect(() => convertTextToMovieObjects(lines)).toThrow(
      'Invalid chunk format: Odd number of lines detected. Each movie entry must have a description line.',
    );
  });

  it('should handle single movie entry', () => {
    const lines = [
      'The Godfather | R | 2h 55m | 9.2 rating',
      'The aging patriarch of an organized crime dynasty transfers control.',
    ];

    const result = convertTextToMovieObjects(lines);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      movieName: 'The Godfather',
      ageRating: 'R',
      duration: 175, // 2h 55m converted to minutes
      scoreRating: 9.2,
      description: 'The aging patriarch of an organized crime dynasty transfers control.',
    });
  });

  it('should handle different duration formats', () => {
    const lines = [
      'Movie A | G | 1h 30m | 7.5 rating',
      'Description A',
      'Movie B | PG | 2h | 8.0 rating',
      'Description B',
      'Movie C | PG-13 | 90m | 7.8 rating',
      'Description C',
      'Movie D | R | 120 | 8.2 rating',
      'Description D',
    ];

    const result = convertTextToMovieObjects(lines);

    expect(result).toHaveLength(4);
    expect(result[0].duration).toBe(90); // 1h 30m
    expect(result[1].duration).toBe(120); // 2h
    expect(result[2].duration).toBe(90); // 90m
    expect(result[3].duration).toBe(120); // 120 (plain number)
  });

  it('should handle different age ratings', () => {
    const lines = [
      'Movie G | G | 1h 30m | 7.0 rating',
      'Family friendly movie',
      'Movie PG | PG | 1h 45m | 7.5 rating',
      'Some mild content',
      'Movie PG13 | PG-13 | 2h | 8.0 rating',
      'Some intense scenes',
      'Movie R | R | 2h 15m | 8.5 rating',
      'Adult content',
      'Movie NR | NR | 1h 50m | 7.8 rating',
      'Not rated content',
    ];

    const result = convertTextToMovieObjects(lines);

    expect(result).toHaveLength(5);
    expect(result[0].ageRating).toBe('G');
    expect(result[1].ageRating).toBe('PG');
    expect(result[2].ageRating).toBe('PG-13');
    expect(result[3].ageRating).toBe('R');
    expect(result[4].ageRating).toBe('NR');
  });

  it('should handle score ratings with and without "rating" suffix', () => {
    const lines = [
      'Movie A | R | 2h | 8.7 rating',
      'Description A',
      'Movie B | PG | 1h 30m | 9.1',
      'Description B',
      'Movie C | G | 2h 10m | 7.5 Rating',
      'Description C',
    ];

    const result = convertTextToMovieObjects(lines);

    expect(result).toHaveLength(3);
    expect(result[0].scoreRating).toBe(8.7);
    expect(result[1].scoreRating).toBe(9.1);
    expect(result[2].scoreRating).toBe(7.5);
  });

  it('should trim whitespace from all fields', () => {
    const lines = [
      '  The Matrix  |  R  |  2h 16m  |  8.7 rating  ',
      '  A computer hacker learns from mysterious rebels.  ',
    ];

    const result = convertTextToMovieObjects(lines);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      movieName: 'The Matrix',
      ageRating: 'R',
      duration: 136,
      scoreRating: 8.7,
      description: 'A computer hacker learns from mysterious rebels.',
    });
  });

  it('should handle complex movie names with special characters', () => {
    const lines = [
      'The Lord of the Rings: The Fellowship of the Ring | PG-13 | 2h 58m | 8.8 rating',
      'A meek Hobbit from the Shire and eight companions set out on a journey.',
      'Spider-Man: Into the Spider-Verse | PG | 1h 57m | 8.4 rating',
      'Teen Miles Morales becomes the Spider-Man of his universe.',
    ];

    const result = convertTextToMovieObjects(lines);

    expect(result).toHaveLength(2);
    expect(result[0].movieName).toBe('The Lord of the Rings: The Fellowship of the Ring');
    expect(result[1].movieName).toBe('Spider-Man: Into the Spider-Verse');
  });

  it('should return empty array and log errors for invalid data', () => {
    const lines = [
      'Invalid Movie | INVALID_RATING | 2h | 8.7 rating',
      'Description for invalid movie',
      'Another Movie | R | invalid_duration | not_a_number',
      'Another description',
    ];

    const result = convertTextToMovieObjects(lines);

    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Object) }),
      'Validation errors',
    );
  });

  it('should handle movies with zero or negative duration and invalid ratings', () => {
    const lines = [
      'Movie A | R | 0h | 8.7 rating',
      'Movie with zero duration',
      'Movie B | PG | -1h | invalid_score',
      'Movie with negative duration and invalid score',
    ];

    const result = convertTextToMovieObjects(lines);

    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should handle international age ratings', () => {
    const lines = [
      'Movie A | 12+ | 2h | 8.0 rating',
      'European 12+ rating',
      'Movie B | 15 | 1h 45m | 7.5 rating',
      'UK 15 rating',
      'Movie C | 16+ | 2h 10m | 8.2 rating',
      'European 16+ rating',
      'Movie D | 18+ | 1h 55m | 8.8 rating',
      'European 18+ rating',
    ];

    const result = convertTextToMovieObjects(lines);

    expect(result).toHaveLength(4);
    expect(result[0].ageRating).toBe('12+');
    expect(result[1].ageRating).toBe('15');
    expect(result[2].ageRating).toBe('16+');
    expect(result[3].ageRating).toBe('18+');
  });

  it('should handle missing description gracefully', () => {
    const lines = [
      'Movie A | R | 2h | 8.7 rating',
      '', // Empty description
      'Movie B | PG | 1h 30m | 7.5 rating',
      '   ', // Whitespace-only description (will be filtered as empty)
    ];

    // This should throw because after filtering empty lines, we have odd number of lines
    expect(() => convertTextToMovieObjects(lines)).toThrow(
      'Invalid chunk format: Odd number of lines detected. Each movie entry must have a description line.',
    );
  });

  it('should handle very long descriptions', () => {
    const longDescription =
      'This is a very long movie description that spans multiple sentences and contains detailed plot information about the characters, their motivations, the setting, and the overall narrative arc of the film.';

    const lines = ['Epic Movie | PG-13 | 3h 20m | 9.0 rating', longDescription];

    const result = convertTextToMovieObjects(lines);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe(longDescription);
    expect(result[0].duration).toBe(200); // 3h 20m
  });

  it('should handle edge case score ratings', () => {
    const lines = [
      'Movie A | R | 2h | 0.0 rating',
      'Movie with zero rating',
      'Movie B | PG | 1h 30m | 10.0 rating',
      'Movie with perfect rating',
      'Movie C | G | 2h 15m | 5.5 rating',
      'Movie with decimal rating',
    ];

    const result = convertTextToMovieObjects(lines);

    expect(result).toHaveLength(3);
    expect(result[0].scoreRating).toBe(0.0);
    expect(result[1].scoreRating).toBe(10.0);
    expect(result[2].scoreRating).toBe(5.5);
  });
});

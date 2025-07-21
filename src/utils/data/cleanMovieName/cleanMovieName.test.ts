import { describe, expect, it } from 'vitest';

import { cleanMovieName } from './cleanMovieName';

describe('cleanMovieName', () => {
  it('should remove year from movie name with standard format', () => {
    expect(cleanMovieName('The Matrix: 1999')).toBe('The Matrix');
    expect(cleanMovieName('Inception: 2010')).toBe('Inception');
    expect(cleanMovieName('The Godfather: 1972')).toBe('The Godfather');
  });

  it('should handle movie names with extra spaces around the year', () => {
    expect(cleanMovieName('The Matrix:   1999')).toBe('The Matrix');
    expect(cleanMovieName('Inception:   2010   ')).toBe('Inception');
    expect(cleanMovieName('The Godfather:    1972    ')).toBe('The Godfather');
  });

  it('should handle movie names without year', () => {
    expect(cleanMovieName('The Matrix')).toBe('The Matrix');
    expect(cleanMovieName('Inception')).toBe('Inception');
    expect(cleanMovieName('The Godfather')).toBe('The Godfather');
  });

  it('should handle movie names with colons in the title but no year', () => {
    expect(cleanMovieName('The Lord of the Rings: The Fellowship of the Ring')).toBe(
      'The Lord of the Rings: The Fellowship of the Ring',
    );
    expect(cleanMovieName('Star Wars: A New Hope')).toBe('Star Wars: A New Hope');
    expect(cleanMovieName('Spider-Man: Into the Spider-Verse')).toBe(
      'Spider-Man: Into the Spider-Verse',
    );
  });

  it('should handle movie names with colons and year at the end', () => {
    expect(cleanMovieName('The Lord of the Rings: The Fellowship of the Ring: 2001')).toBe(
      'The Lord of the Rings: The Fellowship of the Ring',
    );
    expect(cleanMovieName('Star Wars: A New Hope: 1977')).toBe('Star Wars: A New Hope');
    expect(cleanMovieName('Spider-Man: Into the Spider-Verse: 2018')).toBe(
      'Spider-Man: Into the Spider-Verse',
    );
  });

  it('should trim whitespace from movie names', () => {
    expect(cleanMovieName('  The Matrix: 1999  ')).toBe('The Matrix');
    expect(cleanMovieName('   Inception   ')).toBe('Inception');
    expect(cleanMovieName('\t The Godfather: 1972 \t')).toBe('The Godfather');
  });

  it('should handle empty string', () => {
    expect(cleanMovieName('')).toBe('');
  });

  it('should handle string with only whitespace', () => {
    expect(cleanMovieName('   ')).toBe('');
    expect(cleanMovieName('\t\n  ')).toBe('');
  });

  it('should handle movie names with numbers that are not years', () => {
    expect(cleanMovieName('2001: A Space Odyssey')).toBe('2001: A Space Odyssey');
    expect(cleanMovieName('12 Monkeys')).toBe('12 Monkeys');
    expect(cleanMovieName('300')).toBe('300');
  });

  it('should handle movie names with 4-digit numbers in the middle', () => {
    expect(cleanMovieName('Blade Runner 2049: 2017')).toBe('Blade Runner 2049');
    expect(cleanMovieName('Terminator 2: Judgment Day: 1991')).toBe('Terminator 2: Judgment Day');
  });

  it('should handle edge case years', () => {
    expect(cleanMovieName('Metropolis: 1927')).toBe('Metropolis');
    expect(cleanMovieName('Future Movie: 2099')).toBe('Future Movie');
    expect(cleanMovieName('Old Film: 1900')).toBe('Old Film');
  });

  it('should not remove years from the middle of titles', () => {
    expect(cleanMovieName('The Year 2000 Problem: 1999')).toBe('The Year 2000 Problem');
    expect(cleanMovieName('Back to the Future Part III: 1990')).toBe('Back to the Future Part III');
  });

  it('should handle special characters in movie names', () => {
    expect(cleanMovieName('Amélie: 2001')).toBe('Amélie');
    expect(cleanMovieName('Crouching Tiger, Hidden Dragon: 2000')).toBe(
      'Crouching Tiger, Hidden Dragon',
    );
    expect(cleanMovieName('The Good, the Bad and the Ugly: 1966')).toBe(
      'The Good, the Bad and the Ugly',
    );
  });

  it('should handle movie names with parentheses', () => {
    expect(cleanMovieName("The Shawshank Redemption (Director's Cut): 1994")).toBe(
      "The Shawshank Redemption (Director's Cut)",
    );
    expect(cleanMovieName('Aliens (Special Edition): 1986')).toBe('Aliens (Special Edition)');
  });

  it('should handle very long movie names', () => {
    const longName =
      "The Extraordinary Adventures of Adèle Blanc-Sec: The Mummy's Revenge and the Secret of the Pharaoh's Tomb";
    expect(cleanMovieName(`${longName}: 2010`)).toBe(longName);
  });

  it('should handle movie names with multiple colons and year at end', () => {
    expect(
      cleanMovieName(
        "Pirates of the Caribbean: The Curse of the Black Pearl: Director's Commentary: 2003",
      ),
    ).toBe("Pirates of the Caribbean: The Curse of the Black Pearl: Director's Commentary");
  });
});

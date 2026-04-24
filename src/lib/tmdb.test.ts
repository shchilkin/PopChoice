import { describe, expect, it, vi } from 'vitest';

import {
  GENRE_LABEL_TO_TMDB_ID,
  cosineSimilarity,
  normalizeGenreLabel,
  parseTMDBReleaseYear,
} from './tmdb';

describe('normalizeGenreLabel', () => {
  it('lowercases and strips non-alpha characters', () => {
    expect(normalizeGenreLabel('Sci-Fi')).toBe('scifi');
    expect(normalizeGenreLabel('Action')).toBe('action');
    expect(normalizeGenreLabel('ROM-COM')).toBe('romcom');
  });

  it('returns an empty string for empty input', () => {
    expect(normalizeGenreLabel('')).toBe('');
  });
});

describe('GENRE_LABEL_TO_TMDB_ID', () => {
  it('resolves normalized genre labels', () => {
    expect(GENRE_LABEL_TO_TMDB_ID[normalizeGenreLabel('Action')]).toBe(28);
    expect(GENRE_LABEL_TO_TMDB_ID[normalizeGenreLabel('Sci-Fi')]).toBe(878);
    expect(GENRE_LABEL_TO_TMDB_ID[normalizeGenreLabel('Romance')]).toBe(10749);
  });
});

describe('parseTMDBReleaseYear', () => {
  it('extracts the year from a valid TMDB release_date string', () => {
    expect(parseTMDBReleaseYear('1994-09-23')).toBe(1994);
    expect(parseTMDBReleaseYear('2024-01-01')).toBe(2024);
  });

  it('returns 0 for null', () => {
    expect(parseTMDBReleaseYear(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(parseTMDBReleaseYear(undefined)).toBe(0);
  });

  it('returns 0 for an empty string', () => {
    expect(parseTMDBReleaseYear('')).toBe(0);
  });

  it('returns 0 for a malformed value that produces NaN', () => {
    expect(parseTMDBReleaseYear('abcd-01-01')).toBe(0);
  });
});

describe('cosineSimilarity', () => {
  it('returns 1.0 for identical unit vectors', () => {
    const a = [1, 0, 0];
    expect(cosineSimilarity(a, a)).toBeCloseTo(1);
  });

  it('returns 0.0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns the correct dot product for simple vectors', () => {
    expect(cosineSimilarity([0.6, 0.8], [0.6, 0.8])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0.5, 0.5])).toBeCloseTo(0.5);
  });

  it('returns 0 and calls warn when embedding lengths differ', () => {
    const warn = vi.fn();
    const result = cosineSimilarity([1, 0, 0], [1, 0], warn);
    expect(result).toBe(0);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('3 !== 2'));
  });

  it('silently returns 0 by default when lengths mismatch (no-op warn)', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = cosineSimilarity([1], [1, 2]);
    expect(result).toBe(0);
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('returns 0 for a dot product that is not finite', () => {
    // Force a NaN dot product by using Infinity values
    const result = cosineSimilarity([Infinity], [1]);
    expect(result).toBe(0);
  });
});

import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { getDbClient } from '@/clients/dbClient';

import { GET } from './route';

import type { Movie } from './route';

const mockMovies: Movie[] = [
  { id: 1, name: 'Casablanca', age_rating: 'PG', duration: 102, score_rating: 8.5, year: 1942 },
  {
    id: 2,
    name: 'The Godfather',
    age_rating: 'R',
    duration: 175,
    score_rating: 9.2,
    year: 1972,
  },
  {
    id: 3,
    name: 'The Godfather Part II',
    age_rating: 'R',
    duration: 202,
    score_rating: 9.0,
    year: 1974,
  },
  { id: 4, name: 'Deadpool', age_rating: '16+', duration: 108, score_rating: 8.0, year: 2016 },
  { id: 5, name: 'John Wick', age_rating: '18+', duration: 101, score_rating: 7.4, year: 2014 },
];

const createConfiguredDbMock = (movies: Movie[] = mockMovies) => ({
  isConfigured: vi.fn(() => true),
  from: vi.fn(() => ({
    select: vi.fn(() => Promise.resolve({ data: movies, error: null })),
    insert: vi.fn(),
    delete: vi.fn(),
  })),
  rpc: vi.fn(),
});

vi.mock('@/clients/dbClient', () => ({
  getDbClient: vi.fn(() => createConfiguredDbMock()),
}));

describe('Movies API Route', () => {
  it('returns paginated movies with default parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/movies');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(50);
    expect(data.totalCount).toBe(mockMovies.length);
    expect(data.movies).toHaveLength(mockMovies.length);
  });

  it('returns error for invalid page parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/movies?page=0');
    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it('returns error for invalid pageSize parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/movies?pageSize=101');
    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it('handles custom page and pageSize parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/movies?page=2&pageSize=2');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.page).toBe(2);
    expect(data.pageSize).toBe(2);
    expect(data.movies).toHaveLength(2);
  });

  it('returns mock data when database is not configured', async () => {
    vi.mocked(getDbClient).mockReturnValueOnce({
      isConfigured: vi.fn(() => false),
      from: vi.fn(),
      rpc: vi.fn(),
    });

    const request = new NextRequest('http://localhost:3000/api/movies');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalCount).toBeGreaterThan(0);
    expect(data.movies.length).toBeGreaterThan(0);
  });

  describe('title search', () => {
    it('filters movies by title (case-insensitive, partial match)', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?title=godfather');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.movies).toHaveLength(2);
      data.movies.forEach((movie: Movie) => {
        expect(movie.name.toLowerCase()).toContain('godfather');
      });
    });

    it('returns empty results when no titles match', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?title=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.movies).toHaveLength(0);
      expect(data.totalCount).toBe(0);
    });
  });

  describe('year range filtering', () => {
    it('filters movies by yearFrom', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?yearFrom=2010');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.movies).toHaveLength(2);
      data.movies.forEach((movie: Movie) => {
        expect(movie.year).toBeGreaterThanOrEqual(2010);
      });
    });

    it('filters movies by yearTo', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?yearTo=1974');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.movies).toHaveLength(3);
      data.movies.forEach((movie: Movie) => {
        expect(movie.year).toBeLessThanOrEqual(1974);
      });
    });

    it('filters movies by combined yearFrom and yearTo range', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?yearFrom=1970&yearTo=1980');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.movies).toHaveLength(2);
      data.movies.forEach((movie: Movie) => {
        expect(movie.year).toBeGreaterThanOrEqual(1970);
        expect(movie.year).toBeLessThanOrEqual(1980);
      });
    });
  });

  describe('year parameter validation', () => {
    it('returns 400 for non-numeric yearFrom', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?yearFrom=abc');
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('returns 400 for non-numeric yearTo', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?yearTo=xyz');
      const response = await GET(request);

      expect(response.status).toBe(400);
    });
  });

  it('returns 500 when db select fails', async () => {
    vi.mocked(getDbClient).mockReturnValueOnce({
      isConfigured: vi.fn(() => true),
      from: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: null, error: { message: 'boom' } })),
        insert: vi.fn(),
        delete: vi.fn(),
      })),
      rpc: vi.fn(),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/movies');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});

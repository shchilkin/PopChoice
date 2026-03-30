import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { GET } from './route';

import type { Movie } from './route';

// Mock the supabase client
vi.mock('@/clients/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        range: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({
              data: [
                {
                  id: 1,
                  name: 'Test Movie',
                  age_rating: 'PG',
                  description: 'A test movie',
                  duration: 120,
                  score_rating: 8.5,
                  year: 2023,
                },
              ],
              error: null,
            }),
          ),
        })),
        count: 1,
        head: true,
      })),
    })),
  },
}));

describe('Movies API Route', () => {
  it('should return paginated movies with default parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/movies');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('movies');
    expect(data).toHaveProperty('totalCount');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('pageSize');
    expect(data).toHaveProperty('totalPages');
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(50);
  });

  it('should return error for invalid page parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/movies?page=0');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should return error for invalid pageSize parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/movies?pageSize=101');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should handle custom page and pageSize parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/movies?page=2&pageSize=25');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.page).toBe(2);
    expect(data.pageSize).toBe(25);
  });

  describe('title search', () => {
    it('should filter movies by title (case-insensitive, partial match)', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?title=casablanca');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.movies.length).toBeGreaterThan(0);
      data.movies.forEach((movie: Movie) => {
        expect(movie.name.toLowerCase()).toContain('casablanca');
      });
    });

    it('should filter movies by partial title match', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?title=godfather');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.movies.length).toBeGreaterThan(0);
      data.movies.forEach((movie: Movie) => {
        expect(movie.name.toLowerCase()).toContain('godfather');
      });
    });

    it('should return empty results when no titles match', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/movies?title=xyznonexistentmovie999',
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.movies).toHaveLength(0);
      expect(data.totalCount).toBe(0);
    });
  });

  describe('year range filtering', () => {
    it('should filter movies by yearFrom', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?yearFrom=2000');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.movies.length).toBeGreaterThan(0);
      data.movies.forEach((movie: Movie) => {
        expect(movie.year).toBeGreaterThanOrEqual(2000);
      });
    });

    it('should filter movies by yearTo', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?yearTo=1960');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.movies.length).toBeGreaterThan(0);
      data.movies.forEach((movie: Movie) => {
        expect(movie.year).toBeLessThanOrEqual(1960);
      });
    });

    it('should filter movies by combined yearFrom and yearTo range', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?yearFrom=1970&yearTo=1980');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.movies.length).toBeGreaterThan(0);
      data.movies.forEach((movie: Movie) => {
        expect(movie.year).toBeGreaterThanOrEqual(1970);
        expect(movie.year).toBeLessThanOrEqual(1980);
      });
    });

    it('should return fewer results with year range than without', async () => {
      const allRequest = new NextRequest('http://localhost:3000/api/movies');
      const filteredRequest = new NextRequest(
        'http://localhost:3000/api/movies?yearFrom=1970&yearTo=1980',
      );

      const allResponse = await GET(allRequest);
      const filteredResponse = await GET(filteredRequest);
      const allData = await allResponse.json();
      const filteredData = await filteredResponse.json();

      expect(filteredData.totalCount).toBeLessThan(allData.totalCount);
    });
  });

  describe('year parameter validation', () => {
    it('should return 400 for non-numeric yearFrom', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?yearFrom=abc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('should return 400 for non-numeric yearTo', async () => {
      const request = new NextRequest('http://localhost:3000/api/movies?yearTo=xyz');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });
});

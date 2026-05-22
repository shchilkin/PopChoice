import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { getDbClient } from '@/clients/dbClient';

import { GET } from './route';

// Mock the dbClient module
const mockMovies = [
  {
    id: 1,
    name: 'Test Movie',
    age_rating: 'PG',
    duration: 120,
    score_rating: 8.5,
    year: 2023,
  },
];

vi.mock('@/clients/dbClient', () => ({
  getDbClient: vi.fn(() => ({
    isConfigured: vi.fn(() => true),
    from: vi.fn(() => ({
      select: vi.fn((_columns: string, opts?: { count?: string; head?: boolean }) => {
        // Count-only query: select('*', { count: 'exact', head: true })
        if (opts?.head && opts?.count) {
          return Promise.resolve({ data: null, error: null, count: mockMovies.length });
        }
        // Data query with optional count via window function:
        // select('columns', { count: 'exact' }).range(...).order(...)
        const resolvedCount = opts?.count === 'exact' ? mockMovies.length : undefined;
        return {
          range: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({ data: mockMovies, error: null, count: resolvedCount }),
            ),
          })),
        };
      }),
    })),
  })),
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
    expect(data.totalCount).toBe(mockMovies.length);
    expect(data.totalPages).toBe(Math.ceil(mockMovies.length / 50));
    expect(data.movies).toHaveLength(mockMovies.length);
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

  it('should return error for non-numeric pagination parameters', async () => {
    const invalidPageRequest = new NextRequest('http://localhost:3000/api/movies?page=abc');
    const invalidPageResponse = await GET(invalidPageRequest);
    const invalidPageData = await invalidPageResponse.json();

    expect(invalidPageResponse.status).toBe(400);
    expect(invalidPageData).toHaveProperty('error');

    const invalidPageSizeRequest = new NextRequest('http://localhost:3000/api/movies?pageSize=abc');
    const invalidPageSizeResponse = await GET(invalidPageSizeRequest);
    const invalidPageSizeData = await invalidPageSizeResponse.json();

    expect(invalidPageSizeResponse.status).toBe(400);
    expect(invalidPageSizeData).toHaveProperty('error');
  });

  it('should handle custom page and pageSize parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/movies?page=2&pageSize=25');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.page).toBe(2);
    expect(data.pageSize).toBe(25);
  });

  it('should return mock data when database is not configured', async () => {
    vi.mocked(getDbClient).mockReturnValueOnce({
      isConfigured: vi.fn(() => false),
      from: vi.fn(),
      rpc: vi.fn(),
    });

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
    expect(data.totalCount).toBeGreaterThan(0);
    expect(data.totalPages).toBeGreaterThan(0);
    expect(data.movies.length).toBeGreaterThan(0);
    expect(data.movies.length).toBeLessThanOrEqual(50);
  });

  it('should filter mock movies by title and year when database is not configured', async () => {
    vi.mocked(getDbClient).mockReturnValueOnce({
      isConfigured: vi.fn(() => false),
      from: vi.fn(),
      rpc: vi.fn(),
    });

    const request = new NextRequest(
      'http://localhost:3000/api/movies?query=godfather&yearFrom=1970&yearTo=1975',
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalCount).toBeGreaterThan(0);
    expect(
      data.movies.every((movie: { name: string; year: number }) => {
        return (
          movie.name.toLowerCase().includes('godfather') && movie.year >= 1970 && movie.year <= 1975
        );
      }),
    ).toBe(true);
  });

  it('should return error for invalid year filters', async () => {
    const request = new NextRequest('http://localhost:3000/api/movies?yearFrom=2020&yearTo=1990');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });
});

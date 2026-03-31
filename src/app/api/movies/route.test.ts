import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { GET } from './route';

// Mock the dbClient module
vi.mock('@/clients/dbClient', () => ({
  getDbClient: vi.fn(() => ({
    isConfigured: vi.fn(() => true),
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
});

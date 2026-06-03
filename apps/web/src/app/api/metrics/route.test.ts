import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    connection: vi.fn(),
  };
});

vi.mock('@/lib/jobQueue', () => ({
  CATALOG_MAINTENANCE_QUEUE_NAME: 'catalog-maintenance',
  MORE_PICKS_QUEUE_NAME: 'more-picks',
  MOVIE_SEED_QUEUE_NAME: 'movie-seed',
  RECOMMENDATION_EVAL_QUEUE_NAME: 'recommendation-evals',
  RECOMMENDATION_QUEUE_NAME: 'recommendation',
  catalogMaintenanceQueue: null,
  morePicksQueue: null,
  recommendationEvalQueue: null,
  recommendationQueue: null,
  seedQueue: null,
}));

const { GET } = await import('./route');

function request(headers?: HeadersInit): NextRequest {
  return new NextRequest('http://localhost/api/metrics', { headers });
}

describe('GET /api/metrics', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is available in development without a bearer token', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const response = await GET(request());
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toContain('popchoice_recommendations_total');
    expect(body).toContain('popchoice_queue_depth');
  });

  it('is disabled by default in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const response = await GET(request());

    expect(response.status).toBe(404);
  });

  it('requires the configured bearer token when enabled in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('METRICS_ENABLED', 'true');
    vi.stubEnv('METRICS_BEARER_TOKEN', 'secret-token');

    const rejected = await GET(request({ authorization: 'Bearer wrong-token' }));
    const accepted = await GET(request({ authorization: 'Bearer secret-token' }));

    expect(rejected.status).toBe(401);
    expect(accepted.status).toBe(200);
  });
});

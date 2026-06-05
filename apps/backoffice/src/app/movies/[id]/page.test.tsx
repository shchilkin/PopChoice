import { beforeEach, describe, expect, it, vi } from 'vitest';

import { catalogMovieDetail } from '../../../test/backofficeFixtures';

const mocks = vi.hoisted(() => ({
  BackofficeErrorPage: vi.fn(),
  CatalogMovieDetailPage: vi.fn(),
  ensureBackofficeReady: vi.fn(),
  getCatalogMovieDetail: vi.fn(),
  logBackofficeError: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@pop-choice/shared', () => ({
  getCatalogMovieDetail: mocks.getCatalogMovieDetail,
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
}));

vi.mock('../../../components/backoffice', () => ({
  BackofficeErrorPage: mocks.BackofficeErrorPage,
  CatalogMovieDetailPage: mocks.CatalogMovieDetailPage,
}));

vi.mock('../../../lib/backoffice', () => ({
  ensureBackofficeReady: mocks.ensureBackofficeReady,
  logBackofficeError: mocks.logBackofficeError,
}));

import CatalogMovieDetailRoute from './page';

describe('CatalogMovieDetailRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads movie detail with config-driven stale age and normalized repair status', async () => {
    const detail = catalogMovieDetail();
    mocks.ensureBackofficeReady.mockResolvedValue({ catalogHealthStaleDays: 11 });
    mocks.getCatalogMovieDetail.mockResolvedValue({ detail, status: 'found' });

    const element = await CatalogMovieDetailRoute({
      params: Promise.resolve({ id: '42' }),
      searchParams: Promise.resolve({ repair: ['queued', 'failed'] }),
    });

    expect(mocks.getCatalogMovieDetail).toHaveBeenCalledWith({
      movieId: '42',
      staleAfterDays: 11,
    });
    expect(element.type).toBe(mocks.CatalogMovieDetailPage);
    expect(element.props).toMatchObject({ detail, repairStatus: 'queued' });
  });

  it('renders the backoffice error page when detail loading fails', async () => {
    const error = new Error('database unavailable');
    mocks.ensureBackofficeReady.mockRejectedValue(error);

    const element = await CatalogMovieDetailRoute({
      params: Promise.resolve({ id: 'movie:42' }),
      searchParams: Promise.resolve({}),
    });

    expect(mocks.logBackofficeError).toHaveBeenCalledWith(
      'Failed to render catalog movie detail',
      error,
    );
    expect(element.type).toBe(mocks.BackofficeErrorPage);
    expect(element.props).toMatchObject({
      active: 'health',
      error,
      retryHref: '/movies/movie%3A42',
    });
  });

  it('delegates not-found results to Next navigation', async () => {
    mocks.ensureBackofficeReady.mockResolvedValue({ catalogHealthStaleDays: 7 });
    mocks.getCatalogMovieDetail.mockResolvedValue({ movieId: '404', status: 'not_found' });

    await expect(
      CatalogMovieDetailRoute({
        params: Promise.resolve({ id: '404' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.notFound).toHaveBeenCalled();
  });
});

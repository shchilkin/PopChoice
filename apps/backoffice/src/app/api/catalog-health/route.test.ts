import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ensureBackofficeReady: vi.fn(),
  logBackofficeError: vi.fn(),
  readCatalogHealthLiveData: vi.fn(),
}));

vi.mock('../../../lib/backoffice', () => ({
  ensureBackofficeReady: mocks.ensureBackofficeReady,
  logBackofficeError: mocks.logBackofficeError,
}));

vi.mock('../../../lib/catalogHealthLiveServer', () => ({
  readCatalogHealthLiveData: mocks.readCatalogHealthLiveData,
}));

import { GET } from './route';

describe('catalog health API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureBackofficeReady.mockResolvedValue({
      catalogHealthSampleLimit: 5,
      catalogHealthStaleDays: 180,
      redisUrl: 'redis://example.test',
    });
  });

  it('returns a no-store live catalog health JSON response', async () => {
    const data = {
      auditPage: { actions: [], limit: 10, offset: 0, totalCount: 0 },
      issueMoviePage: null,
      queueSnapshot: { openJobs: 0 },
      report: { generatedAt: '2026-06-03T00:00:00.000Z', issues: [] },
    };
    mocks.readCatalogHealthLiveData.mockResolvedValue(data);

    const response = await GET(new Request('https://backoffice.test/api/catalog-health?issue=x'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual(data);
    expect(mocks.readCatalogHealthLiveData).toHaveBeenCalledWith({
      config: {
        catalogHealthSampleLimit: 5,
        catalogHealthStaleDays: 180,
        redisUrl: 'redis://example.test',
      },
      searchParams: expect.any(URLSearchParams),
    });
  });

  it('returns the public error contract when catalog health loading fails', async () => {
    mocks.readCatalogHealthLiveData.mockRejectedValue(new Error('db down'));

    const response = await GET(new Request('https://backoffice.test/api/catalog-health'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to read catalog health state.',
    });
    expect(mocks.logBackofficeError).toHaveBeenCalledWith(
      'Failed to read live catalog health state',
      expect.any(Error),
    );
  });
});

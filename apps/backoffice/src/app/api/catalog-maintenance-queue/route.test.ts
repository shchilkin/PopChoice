import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ensureBackofficeReady: vi.fn(),
  listCatalogMaintenanceQueueJobs: vi.fn(),
  logBackofficeError: vi.fn(),
  parseCatalogMaintenanceQueueParams: vi.fn(),
}));

vi.mock('../../../catalogMaintenanceQueue', () => ({
  listCatalogMaintenanceQueueJobs: mocks.listCatalogMaintenanceQueueJobs,
}));

vi.mock('../../../lib/backoffice', () => ({
  ensureBackofficeReady: mocks.ensureBackofficeReady,
  logBackofficeError: mocks.logBackofficeError,
  parseCatalogMaintenanceQueueParams: mocks.parseCatalogMaintenanceQueueParams,
}));

import { GET } from './route';

describe('catalog maintenance queue API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureBackofficeReady.mockResolvedValue({ redisUrl: 'redis://example.test' });
    mocks.parseCatalogMaintenanceQueueParams.mockReturnValue({
      limit: 25,
      offset: 0,
      state: 'waiting',
    });
  });

  it('returns a no-store queue page JSON response', async () => {
    const jobPage = {
      available: true,
      counts: {
        active: 0,
        completed: 0,
        delayed: 0,
        failed: 0,
        prioritized: 0,
        waiting: 1,
        waitingChildren: 0,
      },
      jobs: [],
      limit: 25,
      offset: 0,
      openJobs: 1,
      queueName: 'catalog-maintenance',
      state: 'waiting',
      totalCount: 1,
      updatedAt: '2026-06-03T00:00:00.000Z',
    };
    mocks.listCatalogMaintenanceQueueJobs.mockResolvedValue(jobPage);

    const response = await GET(
      new Request('https://backoffice.test/api/catalog-maintenance-queue'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual(jobPage);
    expect(mocks.listCatalogMaintenanceQueueJobs).toHaveBeenCalledWith({
      limit: 25,
      offset: 0,
      redisUrl: 'redis://example.test',
      state: 'waiting',
    });
  });

  it('returns the public error contract when queue loading fails', async () => {
    mocks.listCatalogMaintenanceQueueJobs.mockRejectedValue(new Error('redis down'));

    const response = await GET(
      new Request('https://backoffice.test/api/catalog-maintenance-queue'),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to read catalog maintenance queue.',
    });
    expect(mocks.logBackofficeError).toHaveBeenCalledWith(
      'Failed to read catalog maintenance queue',
      expect.any(Error),
    );
  });
});

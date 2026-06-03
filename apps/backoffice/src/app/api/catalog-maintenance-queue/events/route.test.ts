import { beforeEach, describe, expect, it, vi } from 'vitest';

import { catalogMaintenanceQueueJobPage } from '../../../../test/backofficeFixtures';

const mocks = vi.hoisted(() => ({
  createBackofficeQueueEventStream: vi.fn(),
  createServerSentEventResponse: vi.fn(),
  ensureBackofficeReady: vi.fn(),
  listCatalogMaintenanceQueueJobs: vi.fn(),
  logBackofficeError: vi.fn(),
  parseCatalogMaintenanceQueueParams: vi.fn(),
}));

vi.mock('../../../../catalogMaintenanceQueue', () => ({
  CATALOG_MAINTENANCE_QUEUE_NAME: 'catalog-maintenance',
  listCatalogMaintenanceQueueJobs: mocks.listCatalogMaintenanceQueueJobs,
}));

vi.mock('../../../../lib/backoffice', () => ({
  ensureBackofficeReady: mocks.ensureBackofficeReady,
  logBackofficeError: mocks.logBackofficeError,
  parseCatalogMaintenanceQueueParams: mocks.parseCatalogMaintenanceQueueParams,
}));

vi.mock('../../../../lib/backofficeEventStream', () => ({
  createBackofficeQueueEventStream: mocks.createBackofficeQueueEventStream,
  createServerSentEventResponse: mocks.createServerSentEventResponse,
  getSearchParamsRecord: (params: URLSearchParams) => Object.fromEntries(params.entries()),
}));

import { GET } from './route';

describe('catalog maintenance queue events route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createBackofficeQueueEventStream.mockReturnValue(new ReadableStream<Uint8Array>());
    mocks.createServerSentEventResponse.mockReturnValue(new Response('stream'));
    mocks.ensureBackofficeReady.mockResolvedValue({ redisUrl: undefined });
    mocks.parseCatalogMaintenanceQueueParams.mockReturnValue({
      limit: 25,
      offset: 0,
      state: 'waiting',
    });
  });

  it('opens a snapshot-only stream when Redis is unavailable', async () => {
    const jobPage = catalogMaintenanceQueueJobPage({
      available: false,
      updatedAt: '2026-06-03T00:00:00.000Z',
    });
    mocks.listCatalogMaintenanceQueueJobs.mockResolvedValue(jobPage);

    const response = await GET(
      new Request('https://backoffice.test/api/catalog-maintenance-queue/events'),
    );

    expect(response.status).toBe(200);
    expect(mocks.createBackofficeQueueEventStream).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: 'catalog-maintenance',
        redisUrl: undefined,
        sendSnapshotWhenRedisUnavailable: true,
      }),
    );

    const streamOptions = mocks.createBackofficeQueueEventStream.mock.calls[0]?.[0];
    expect(streamOptions.connectedPayload('snapshot-only')).toEqual({ mode: 'snapshot-only' });
    await expect(
      streamOptions.readSnapshot({ trigger: 'redis-unavailable' }),
    ).resolves.toMatchObject({
      jobPage,
      trigger: 'redis-unavailable',
    });
    expect(mocks.listCatalogMaintenanceQueueJobs).toHaveBeenCalledWith({
      limit: 25,
      offset: 0,
      redisUrl: undefined,
      state: 'waiting',
    });
  });
});

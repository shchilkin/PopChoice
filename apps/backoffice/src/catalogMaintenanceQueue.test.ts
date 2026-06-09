import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetJobCounts, mockRedisConstructor, MockQueue, MockRedis } = vi.hoisted(() => {
  const mockGetJobCounts = vi.fn();
  const mockRedisConstructor = vi.fn();

  function MockQueue(this: { getJobCounts: ReturnType<typeof vi.fn> }) {
    this.getJobCounts = mockGetJobCounts;
  }

  function MockRedis(this: { on: ReturnType<typeof vi.fn> }, ...args: unknown[]) {
    mockRedisConstructor(...args);
    this.on = vi.fn();
  }

  return { mockGetJobCounts, mockRedisConstructor, MockQueue, MockRedis };
});

vi.mock('bullmq', () => ({ Queue: MockQueue }));
vi.mock('ioredis', () => ({ Redis: MockRedis }));
vi.mock('@pop-choice/shared', () => ({
  logger: { error: vi.fn() },
}));

import {
  enqueueCatalogBackfillMovieFromBackoffice,
  enqueueCatalogRepairBatchFromBackoffice,
  getCatalogBackfillMovieJobId,
  getCatalogRepairBatchJobId,
  getCatalogMaintenanceQueueSnapshot,
  listCatalogMaintenanceQueueJobs,
  summarizeCatalogMaintenanceJobPayload,
} from './catalogMaintenanceQueue';

describe('catalog maintenance queue helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sanitizes BullMQ job ids so operator-supplied ids cannot contain colons', () => {
    expect(getCatalogBackfillMovieJobId('tmdb:331')).toBe('backfill-tmdb-331');
    expect(getCatalogRepairBatchJobId('batch:12')).toBe('repair-batch-batch-12');
  });

  it('does not pretend to queue work when Redis is unavailable', async () => {
    await expect(
      enqueueCatalogBackfillMovieFromBackoffice(
        { movieId: 331, reason: 'missing_metadata', language: 'en-US' },
        undefined,
      ),
    ).resolves.toBeNull();
    await expect(
      enqueueCatalogRepairBatchFromBackoffice(
        {
          batchId: 12,
          issueKey: 'missing_poster_url',
          language: 'en-US',
          limit: 250,
          pageSize: 25,
          staleAfterDays: 180,
        },
        undefined,
      ),
    ).resolves.toBeNull();
  });

  it('reports an unavailable queue snapshot when Redis is unavailable', async () => {
    await expect(getCatalogMaintenanceQueueSnapshot(undefined)).resolves.toMatchObject({
      available: false,
      counts: {
        active: 0,
        completed: 0,
        delayed: 0,
        failed: 0,
        prioritized: 0,
        waiting: 0,
        waitingChildren: 0,
      },
      openJobs: 0,
      queueName: 'catalog-maintenance',
    });
  });

  it('reports an unavailable queue job page when Redis is unavailable', async () => {
    await expect(
      listCatalogMaintenanceQueueJobs({
        limit: 25,
        offset: 0,
        redisUrl: undefined,
        state: 'waiting',
      }),
    ).resolves.toMatchObject({
      available: false,
      jobs: [],
      limit: 25,
      offset: 0,
      state: 'waiting',
      totalCount: 0,
    });
  });

  it('summarizes backfill payloads without exposing raw job internals', () => {
    expect(
      summarizeCatalogMaintenanceJobPayload('backfill-movie', {
        movieId: 331,
        reason: 'missing_metadata',
        language: 'en-US',
        repairBatchId: 12,
        repairBatchItemId: 44,
        ignored: { large: true },
      }),
    ).toEqual([
      { label: 'Movie', value: '331' },
      { label: 'Reason', value: 'missing_metadata' },
      { label: 'Language', value: 'en-US' },
      { label: 'Batch', value: '12' },
      { label: 'Item', value: '44' },
    ]);
  });

  it('summarizes repair batch orchestration payloads without exposing raw job internals', () => {
    expect(
      summarizeCatalogMaintenanceJobPayload('enqueue-catalog-repair-batch', {
        batchId: 12,
        issueKey: 'missing_poster_url',
        language: 'en-US',
        limit: 250,
        pageSize: 25,
        ignored: { large: true },
      }),
    ).toEqual([
      { label: 'Batch', value: '12' },
      { label: 'Issue', value: 'missing_poster_url' },
      { label: 'Limit', value: '250' },
      { label: 'Page size', value: '25' },
      { label: 'Language', value: 'en-US' },
    ]);
  });

  it('reports an unavailable queue snapshot when Redis count reads fail', async () => {
    mockGetJobCounts.mockRejectedValueOnce(new Error('redis unavailable'));

    await expect(
      getCatalogMaintenanceQueueSnapshot('redis://user:p%40ss@localhost:6379/2'),
    ).resolves.toMatchObject({
      available: false,
      counts: {
        active: 0,
        completed: 0,
        delayed: 0,
        failed: 0,
        prioritized: 0,
        waiting: 0,
        waitingChildren: 0,
      },
      openJobs: 0,
      queueName: 'catalog-maintenance',
    });
    expect(mockRedisConstructor).toHaveBeenCalledWith({
      db: 2,
      host: 'localhost',
      maxRetriesPerRequest: null,
      password: 'p@ss',
      port: 6379,
      username: 'user',
    });
  });
});

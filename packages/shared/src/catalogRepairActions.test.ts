import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeDatabase, initDatabase } from './db.js';
import {
  catalogRepairCompletionStatusForResolution,
  createCatalogRepairBatch,
  createCatalogRepairBatchItem,
  ensureCatalogRepairActionSchema,
  getCatalogRepairBatchDetail,
  getCatalogRepairBatchItem,
  listCatalogRepairAuditPage,
  listCatalogRepairBatchPage,
  refreshCatalogRepairBatchCounts,
  updateCatalogRepairBatchItemEnqueueResult,
  updateCatalogRepairBatchOrchestrationResult,
  updateCatalogRepairBatchItemStatus,
} from './catalogRepairActions.js';

vi.mock('pg', () => {
  const mPool = {
    query: vi.fn(),
    end: vi.fn(),
  };
  return {
    default: {
      Pool: vi.fn(function () {
        return mPool;
      }),
    },
  };
});

describe('catalog repair audit pages', () => {
  let poolMock: any;

  beforeEach(() => {
    initDatabase('postgres://user:pass@localhost:5432/db');
    poolMock = new pg.Pool();
  });

  afterEach(async () => {
    await closeDatabase();
    vi.clearAllMocks();
  });

  it('lists bounded audit rows with total count and offset', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ count: 123 }] }).mockResolvedValueOnce({
      rows: [
        {
          id: '42',
          action: 'bulk_enqueue_backfill',
          actor: 'operator',
          issue_key: 'missing_poster_url',
          target_type: 'catalog_issue',
          target_id: 'missing_poster_url',
          note: null,
          previous_state: { issueKey: 'missing_poster_url' },
          result: { queued: 25 },
          repair_batch_id: '7',
          repair_batch_item_id: null,
          created_at: '2026-05-28 09:00:00+00',
        },
      ],
    });

    const page = await listCatalogRepairAuditPage({ limit: 500, offset: 100_001 });

    expect(page).toMatchObject({
      totalCount: 123,
      limit: 100,
      offset: 100_000,
      audit: [
        {
          id: '42',
          action: 'bulk_enqueue_backfill',
          actor: 'operator',
          issueKey: 'missing_poster_url',
          targetType: 'catalog_issue',
          targetId: 'missing_poster_url',
          result: { queued: 25 },
          repairBatchId: '7',
          repairBatchItemId: null,
        },
      ],
    });
    expect(poolMock.query.mock.calls[1][1]).toEqual([100, 100_000]);
  });

  it('ensures durable repair batch schema alongside audit schema', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [] });

    await ensureCatalogRepairActionSchema();

    const sql = poolMock.query.mock.calls[0][0];
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS catalog_repair_batches');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS catalog_repair_batch_items');
    expect(sql).toContain('repair_batch_id bigint REFERENCES catalog_repair_batches');
    expect(sql).toContain("'enqueue_failed'");
    expect(sql).toContain("'completed_resolved'");
    expect(sql).toContain("'completed_unresolved'");
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS catalog_repair_batch_items_status_check');
    expect(sql).toContain('idx_catalog_repair_batch_items_job_id');
  });

  it('creates batch and item rows, then records enqueue status', async () => {
    poolMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: '7',
            action: 'bulk_enqueue_backfill',
            actor: 'operator',
            issue_key: 'missing_poster_url',
            target_type: 'catalog_issue',
            target_id: 'missing_poster_url',
            status: 'enqueueing',
            requested_limit: 25,
            total_candidates: 351,
            attempted_count: 2,
            queued_count: 0,
            deduped_count: 0,
            unavailable_count: 0,
            failed_count: 0,
            completed_count: 0,
            skipped_count: 0,
            note: null,
            previous_state: { issueKey: 'missing_poster_url' },
            result: {},
            created_at: '2026-05-28 09:00:00+00',
            updated_at: '2026-05-28 09:00:00+00',
            completed_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '11',
            batch_id: '7',
            movie_id: '334',
            issue_key: 'missing_poster_url',
            status: 'pending',
            queue_name: null,
            job_name: null,
            job_id: null,
            language: 'en-US',
            reason: 'missing_metadata',
            error_message: null,
            movie_snapshot: { id: '334' },
            result: {},
            created_at: '2026-05-28 09:00:01+00',
            updated_at: '2026-05-28 09:00:01+00',
            completed_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '11',
            batch_id: '7',
            movie_id: '334',
            issue_key: 'missing_poster_url',
            status: 'queued',
            queue_name: 'catalog-maintenance',
            job_name: 'backfill-movie',
            job_id: 'backfill-334',
            language: 'en-US',
            reason: 'missing_metadata',
            error_message: null,
            movie_snapshot: { id: '334' },
            result: { status: 'queued' },
            created_at: '2026-05-28 09:00:01+00',
            updated_at: '2026-05-28 09:00:02+00',
            completed_at: null,
          },
        ],
      });

    const batch = await createCatalogRepairBatch({
      action: 'bulk_enqueue_backfill',
      actor: 'operator',
      issueKey: 'missing_poster_url',
      targetType: 'catalog_issue',
      targetId: 'missing_poster_url',
      requestedLimit: 25,
      totalCandidates: 351,
      attemptedCount: 2,
      previousState: { issueKey: 'missing_poster_url' },
    });
    const item = await createCatalogRepairBatchItem({
      batchId: batch.id,
      movieId: '334',
      issueKey: 'missing_poster_url',
      movieSnapshot: { id: '334' },
      reason: 'missing_metadata',
      language: 'en-US',
    });
    const updated = await updateCatalogRepairBatchItemEnqueueResult({
      itemId: item.id,
      status: 'queued',
      queueName: 'catalog-maintenance',
      jobName: 'backfill-movie',
      jobId: 'backfill-334',
      language: 'en-US',
      result: { status: 'queued' },
    });

    expect(batch).toMatchObject({ id: '7', status: 'enqueueing', attemptedCount: 2 });
    expect(item).toMatchObject({ id: '11', batchId: '7', status: 'pending' });
    expect(updated).toMatchObject({ id: '11', status: 'queued', jobId: 'backfill-334' });
    expect(poolMock.query.mock.calls[0][1]).toEqual([
      'bulk_enqueue_backfill',
      'operator',
      'missing_poster_url',
      'catalog_issue',
      'missing_poster_url',
      25,
      351,
      2,
      null,
      JSON.stringify({ issueKey: 'missing_poster_url' }),
    ]);
    expect(poolMock.query.mock.calls[2][0]).toContain("WHEN $2 IN ('queued', 'deduped') THEN NULL");
    expect(poolMock.query.mock.calls[2][1][7]).toBe(JSON.stringify({ status: 'queued' }));
  });

  it('loads a durable repair batch item by id', async () => {
    poolMock.query.mockResolvedValueOnce({
      rows: [
        {
          id: '11',
          batch_id: '7',
          movie_id: '334',
          issue_key: 'missing_poster_url',
          status: 'failed',
          queue_name: 'catalog-maintenance',
          job_name: 'backfill-movie',
          job_id: 'backfill-334',
          language: 'en-US',
          reason: 'missing_metadata',
          error_message: 'worker failed',
          movie_snapshot: { id: '334' },
          result: { status: 'failed' },
          created_at: '2026-05-28 09:00:01+00',
          updated_at: '2026-05-28 09:00:02+00',
          completed_at: '2026-05-28 09:00:03+00',
        },
      ],
    });

    const item = await getCatalogRepairBatchItem('11');

    expect(item).toMatchObject({
      id: '11',
      batchId: '7',
      errorMessage: 'worker failed',
      status: 'failed',
    });
    expect(poolMock.query.mock.calls[0][1]).toEqual(['11']);
  });

  it('refreshes batch counts from durable item statuses', async () => {
    poolMock.query.mockResolvedValueOnce({
      rows: [
        {
          id: '7',
          action: 'bulk_enqueue_backfill',
          actor: 'operator',
          issue_key: 'missing_poster_url',
          target_type: 'catalog_issue',
          target_id: 'missing_poster_url',
          status: 'partial',
          requested_limit: 25,
          total_candidates: 351,
          attempted_count: 2,
          queued_count: 1,
          deduped_count: 0,
          unavailable_count: 0,
          failed_count: 1,
          completed_count: 0,
          skipped_count: 0,
          note: null,
          previous_state: {},
          result: { queued: 1, failed: 1 },
          created_at: '2026-05-28 09:00:00+00',
          updated_at: '2026-05-28 09:00:02+00',
          completed_at: null,
        },
      ],
    });

    const batch = await refreshCatalogRepairBatchCounts('7');

    expect(batch).toMatchObject({
      id: '7',
      status: 'partial',
      queuedCount: 1,
      failedCount: 1,
    });
    expect(poolMock.query.mock.calls[0][1]).toEqual(['7']);
    expect(String(poolMock.query.mock.calls[0][0])).toContain(
      "status IN ('completed', 'completed_resolved')",
    );
    expect(String(poolMock.query.mock.calls[0][0])).toContain("status = 'completed_unresolved'");
    expect(String(poolMock.query.mock.calls[0][0])).toContain("'completedUnresolved'");
    expect(String(poolMock.query.mock.calls[0][0])).toContain(
      'WHEN completed_count = attempted_count THEN',
    );
  });

  it('records repair batch orchestration result without item rows', async () => {
    poolMock.query.mockResolvedValueOnce({
      rows: [
        {
          id: '7',
          action: 'bulk_enqueue_backfill',
          actor: 'operator',
          issue_key: 'missing_poster_url',
          target_type: 'catalog_issue',
          target_id: 'missing_poster_url',
          status: 'unavailable',
          requested_limit: 250,
          total_candidates: 351,
          attempted_count: 0,
          queued_count: 0,
          deduped_count: 0,
          unavailable_count: 0,
          failed_count: 0,
          completed_count: 0,
          skipped_count: 0,
          note: null,
          previous_state: {},
          result: { status: 'queue_unavailable' },
          created_at: '2026-05-28 09:00:00+00',
          updated_at: '2026-05-28 09:02:00+00',
          completed_at: '2026-05-28 09:02:00+00',
        },
      ],
    });

    const batch = await updateCatalogRepairBatchOrchestrationResult({
      batchId: '7',
      status: 'unavailable',
      result: { status: 'queue_unavailable' },
    });

    expect(batch).toMatchObject({
      id: '7',
      requestedLimit: 250,
      result: { status: 'queue_unavailable' },
      status: 'unavailable',
    });
    expect(poolMock.query.mock.calls[0][1]).toEqual([
      '7',
      'unavailable',
      JSON.stringify({ status: 'queue_unavailable' }),
    ]);
    expect(String(poolMock.query.mock.calls[0][0])).toContain(
      "WHEN $2 IN ('failed', 'unavailable')",
    );
  });

  it('filters repair batch pages by status and needs-review sort', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ count: 1 }] }).mockResolvedValueOnce({
      rows: [
        {
          id: '7',
          action: 'bulk_enqueue_backfill',
          actor: 'operator',
          issue_key: 'missing_poster_url',
          target_type: 'catalog_issue',
          target_id: 'missing_poster_url',
          status: 'partial',
          requested_limit: 25,
          total_candidates: 351,
          attempted_count: 25,
          queued_count: 20,
          deduped_count: 0,
          unavailable_count: 1,
          failed_count: 4,
          completed_count: 0,
          skipped_count: 0,
          note: null,
          previous_state: {},
          result: {},
          created_at: '2026-05-28 09:00:00+00',
          updated_at: '2026-05-28 09:02:00+00',
          completed_at: null,
        },
      ],
    });

    const page = await listCatalogRepairBatchPage({
      limit: 10,
      offset: 20,
      sort: 'needs_review',
      status: 'partial',
    });

    expect(page).toMatchObject({ totalCount: 1, limit: 10, offset: 20 });
    expect(String(poolMock.query.mock.calls[0][0])).toContain('WHERE status = $1');
    expect(String(poolMock.query.mock.calls[1][0])).toContain('failed_count');
    expect(String(poolMock.query.mock.calls[1][0])).toContain('LIMIT $2');
    expect(poolMock.query.mock.calls[1][1]).toEqual(['partial', 10, 20]);
  });

  it('filters repair batch detail items for needs-review triage', async () => {
    poolMock.query.mockResolvedValueOnce({
      rows: [
        {
          id: '7',
          action: 'bulk_enqueue_backfill',
          actor: 'operator',
          issue_key: 'missing_poster_url',
          target_type: 'catalog_issue',
          target_id: 'missing_poster_url',
          status: 'partial',
          requested_limit: 25,
          total_candidates: 351,
          attempted_count: 25,
          queued_count: 20,
          deduped_count: 0,
          unavailable_count: 1,
          failed_count: 4,
          completed_count: 0,
          skipped_count: 0,
          note: null,
          previous_state: {},
          result: {},
          created_at: '2026-05-28 09:00:00+00',
          updated_at: '2026-05-28 09:02:00+00',
          completed_at: null,
        },
      ],
    });
    poolMock.query.mockResolvedValueOnce({ rows: [{ count: 1 }] }).mockResolvedValueOnce({
      rows: [
        {
          id: '11',
          batch_id: '7',
          movie_id: '334',
          issue_key: 'missing_poster_url',
          status: 'completed_unresolved',
          queue_name: 'catalog-maintenance',
          job_name: 'backfill-movie',
          job_id: 'backfill-334',
          language: 'en-US',
          reason: 'missing_metadata',
          error_message: null,
          movie_snapshot: { id: '334', name: 'Movie' },
          result: { issueResolved: false },
          created_at: '2026-05-28 09:00:01+00',
          updated_at: '2026-05-28 09:03:00+00',
          completed_at: '2026-05-28 09:03:00+00',
        },
      ],
    });

    const detail = await getCatalogRepairBatchDetail('7', {
      limit: 50,
      offset: 0,
      sort: 'needs_review',
      status: 'needs_review',
    });

    expect(detail?.items.items[0]).toMatchObject({
      id: '11',
      status: 'completed_unresolved',
    });
    expect(String(poolMock.query.mock.calls[1][0])).toContain(
      "status IN ('failed', 'enqueue_failed', 'unavailable', 'completed_unresolved')",
    );
    expect(String(poolMock.query.mock.calls[2][0])).toContain('ORDER BY');
    expect(poolMock.query.mock.calls[2][1]).toEqual(['7', 50, 0]);
  });

  it('records resolved and unresolved terminal item statuses', async () => {
    poolMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: '11',
            batch_id: '7',
            movie_id: '334',
            issue_key: 'missing_poster_url',
            status: 'completed_resolved',
            queue_name: 'catalog-maintenance',
            job_name: 'backfill-movie',
            job_id: 'backfill-334',
            language: 'en-US',
            reason: 'missing_metadata',
            error_message: null,
            movie_snapshot: { id: '334' },
            result: { issueResolved: true },
            created_at: '2026-05-28 09:00:01+00',
            updated_at: '2026-05-28 09:00:02+00',
            completed_at: '2026-05-28 09:00:02+00',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '12',
            batch_id: '7',
            movie_id: '335',
            issue_key: 'missing_localized_name',
            status: 'completed_unresolved',
            queue_name: 'catalog-maintenance',
            job_name: 'backfill-movie',
            job_id: 'backfill-335',
            language: 'en-US',
            reason: 'missing_metadata',
            error_message: null,
            movie_snapshot: { id: '335' },
            result: { issueResolved: false },
            created_at: '2026-05-28 09:00:01+00',
            updated_at: '2026-05-28 09:00:02+00',
            completed_at: '2026-05-28 09:00:02+00',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '13',
            batch_id: '7',
            movie_id: '336',
            issue_key: 'missing_tmdb_id',
            status: 'failed',
            queue_name: 'catalog-maintenance',
            job_name: 'backfill-movie',
            job_id: 'backfill-336',
            language: 'en-US',
            reason: 'missing_tmdb_id',
            error_message: 'TMDB unavailable',
            movie_snapshot: { id: '336' },
            result: { reason: 'worker_failed' },
            created_at: '2026-05-28 09:00:01+00',
            updated_at: '2026-05-28 09:00:02+00',
            completed_at: '2026-05-28 09:00:02+00',
          },
        ],
      });

    const resolved = await updateCatalogRepairBatchItemStatus({
      itemId: '11',
      status: catalogRepairCompletionStatusForResolution(true),
      result: { issueResolved: true },
    });
    const unresolved = await updateCatalogRepairBatchItemStatus({
      itemId: '12',
      status: catalogRepairCompletionStatusForResolution(false),
      result: { issueResolved: false },
    });
    const failed = await updateCatalogRepairBatchItemStatus({
      itemId: '13',
      status: 'failed',
      errorMessage: 'TMDB unavailable',
      result: { reason: 'worker_failed' },
    });

    expect(resolved).toMatchObject({ id: '11', status: 'completed_resolved' });
    expect(unresolved).toMatchObject({ id: '12', status: 'completed_unresolved' });
    expect(failed).toMatchObject({ id: '13', status: 'failed', errorMessage: 'TMDB unavailable' });
    expect(poolMock.query.mock.calls[0][1][1]).toBe('completed_resolved');
    expect(poolMock.query.mock.calls[1][1][1]).toBe('completed_unresolved');
    expect(poolMock.query.mock.calls[2][1][1]).toBe('failed');
    expect(String(poolMock.query.mock.calls[0][0])).toContain("'completed_resolved'");
    expect(String(poolMock.query.mock.calls[0][0])).toContain("'completed_unresolved'");
    expect(String(poolMock.query.mock.calls[0][0])).toContain("'failed'");
  });
});

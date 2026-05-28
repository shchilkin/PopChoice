import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeDatabase, initDatabase } from './db.js';
import { listCatalogRepairAuditPage } from './catalogRepairActions.js';

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
        },
      ],
    });
    expect(poolMock.query.mock.calls[1][1]).toEqual([100, 100_000]);
  });
});

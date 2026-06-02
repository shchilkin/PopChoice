import { describe, expect, it } from 'vitest';

import { catalogRepairMessage, REPAIRABLE_CATALOG_ISSUE_KEYS } from './catalogRepairActions';
import { getBackfillReasonForIssue, getBulkRepairStatus } from './catalogRepairActionHelpers';

describe('catalog repair actions', () => {
  it('keeps every known automatic repair issue registered as repairable', () => {
    expect([...REPAIRABLE_CATALOG_ISSUE_KEYS].sort()).toEqual([
      'missing_age_rating',
      'missing_cast_metadata',
      'missing_director_metadata',
      'missing_genre_metadata',
      'missing_keyword_metadata',
      'missing_localized_name',
      'missing_poster_url',
      'missing_runtime',
      'missing_tmdb_id',
      'missing_tmdb_matched_at',
      'stale_tmdb_metadata',
    ]);
  });

  it('maps repair result statuses to operator-facing messages', () => {
    expect(catalogRepairMessage('orchestration_queued')).toContain('orchestration accepted');
    expect(catalogRepairMessage('queued')).toContain('backfill job queued');
    expect(catalogRepairMessage('empty')).toContain('No affected movies');
    expect(catalogRepairMessage('partial')).toContain('partially queued');
    expect(catalogRepairMessage('failed')).toContain('failed to enqueue');
    expect(catalogRepairMessage('unavailable')).toContain('queue is unavailable');
  });

  it('maps catalog issues to the right backfill intent', () => {
    expect(getBackfillReasonForIssue('missing_tmdb_id')).toBe('missing_tmdb_id');
    expect(getBackfillReasonForIssue('stale_tmdb_metadata')).toBe('manual_refresh');
    expect(getBackfillReasonForIssue('missing_poster_url')).toBe('missing_metadata');
  });

  it('classifies bulk repair outcomes from counters', () => {
    const base = {
      attempted: 10,
      deduped: 0,
      failed: 0,
      queued: 0,
      unavailable: 0,
    };

    expect(getBulkRepairStatus({ ...base, attempted: 0 })).toBe('empty');
    expect(getBulkRepairStatus({ ...base, queued: 4 })).toBe('queued');
    expect(getBulkRepairStatus({ ...base, deduped: 4 })).toBe('queued');
    expect(getBulkRepairStatus({ ...base, failed: 1, queued: 4 })).toBe('partial');
    expect(getBulkRepairStatus({ ...base, failed: 1 })).toBe('failed');
    expect(getBulkRepairStatus({ ...base, unavailable: 10 })).toBe('unavailable');
  });
});

import { describe, expect, it } from 'vitest';

import { catalogRepairMessage, REPAIRABLE_CATALOG_ISSUE_KEYS } from './catalogRepairActions';

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
});

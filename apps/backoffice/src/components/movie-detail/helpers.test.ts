import { describe, expect, it } from 'vitest';

import {
  duplicatePeerCount,
  normalizeRepairFlashStatus,
  repairableHealthFlags,
  repairFlashMessage,
  repairFlashTone,
  splitHealthFlags,
} from './helpers';

import type { CatalogMovieDetailHealthFlag } from '@pop-choice/shared';

const flags: CatalogMovieDetailHealthFlag[] = [
  { isActive: true, key: 'missing_poster_url', label: 'Missing poster' },
  { isActive: true, key: 'duplicate_tmdb_id', label: 'Duplicate TMDB' },
  { isActive: false, key: 'missing_runtime', label: 'Missing runtime' },
];

describe('movie detail helpers', () => {
  it('normalizes legacy and current repair flash statuses', () => {
    expect(normalizeRepairFlashStatus('bulk-queued')).toBe('queued');
    expect(normalizeRepairFlashStatus('bulk-orchestration-queued')).toBe('orchestration_queued');
    expect(normalizeRepairFlashStatus('bulk-partial')).toBe('partial');
    expect(normalizeRepairFlashStatus('failed')).toBe('failed');
    expect(normalizeRepairFlashStatus('unknown')).toBeNull();
  });

  it('formats repair flash message and tone from the normalized status', () => {
    expect(repairFlashMessage('bulk-orchestration-queued')).toContain('orchestration accepted');
    expect(repairFlashTone('queued')).toBe('accepted');
    expect(repairFlashTone('failed')).toBe('warn');
    expect(repairFlashMessage('unknown')).toBeNull();
  });

  it('splits active/resolved health flags and keeps only repairable active flags', () => {
    expect(splitHealthFlags(flags).activeFlags).toHaveLength(2);
    expect(splitHealthFlags(flags).resolvedFlags).toHaveLength(1);
    expect(repairableHealthFlags(flags).map((flag) => flag.key)).toEqual(['missing_poster_url']);
  });

  it('counts duplicate peers across both duplicate dimensions', () => {
    expect(duplicatePeerCount({ normalizedTitleYearPeers: [1, 2], tmdbIdPeers: [3] })).toBe(3);
  });
});

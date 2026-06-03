import { describe, expect, it } from 'vitest';

import {
  getCandidateSource,
  getLocalCandidateSource,
  summarizeCandidateSources,
} from './candidateSources';

describe('candidate source helpers', () => {
  it('classifies seeded local rows without TMDB match source as curated', () => {
    expect(getLocalCandidateSource(null)).toBe('curated');
    expect(getCandidateSource({ id: 42 })).toBe('curated');
  });

  it('classifies TMDB-backed local cache rows separately from direct TMDB candidates', () => {
    expect(getLocalCandidateSource('tmdb_discovery')).toBe('local-cache');
    expect(getCandidateSource({ id: 42, tmdbMatchSource: 'backfill_auto' })).toBe('local-cache');
    expect(getCandidateSource({ id: -77, fromTMDB: true })).toBe('tmdb-discover');
  });

  it('summarizes mixed source distributions', () => {
    expect(
      summarizeCandidateSources([
        { id: 1 },
        { id: 2, tmdbMatchSource: 'tmdb_discovery' },
        { id: -3, fromTMDB: true },
        { id: 4, source: 'memory' },
      ]),
    ).toEqual({
      curated: 1,
      'local-cache': 1,
      memory: 1,
      'tmdb-discover': 1,
    });
  });
});

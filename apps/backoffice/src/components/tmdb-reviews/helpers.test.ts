import { describe, expect, it } from 'vitest';

import {
  buildReviewPageHref,
  canApplyCandidate,
  candidateConfidenceGap,
  getCandidateWarning,
  isCurrentCandidate,
} from './helpers';

describe('tmdb review helpers', () => {
  it('builds stable review queue links from filters', () => {
    expect(
      buildReviewPageHref({
        filters: { reason: 'runtime_mismatch', sort: 'oldest', status: 'open' },
        page: 2,
        pageSize: 50,
      }),
    ).toBe('/tmdb-reviews?status=open&reason=runtime_mismatch&sort=oldest&page=2&pageSize=50');
  });

  it('calculates confidence gap only when the top two candidates have scores', () => {
    expect(
      candidateConfidenceGap([{ confidence: 0.91 } as never, { confidence: 0.72 } as never]),
    ).toBeCloseTo(0.19);
    expect(candidateConfidenceGap([{ confidence: 0.91 } as never])).toBeNull();
    expect(
      candidateConfidenceGap([{ confidence: 0.91 } as never, { confidence: null } as never]),
    ).toBeNull();
  });

  it('warns for candidates that need operator review', () => {
    expect(
      getCandidateWarning({
        candidate: { confidence: 1, id: null, releaseYear: 2024 },
        review: { movieYear: 2024 },
      }),
    ).toContain('no TMDB id');
    expect(
      getCandidateWarning({
        candidate: { confidence: 0.5, id: 1, releaseYear: 2024 },
        review: { movieYear: 2024 },
      }),
    ).toContain('Low confidence');
    expect(
      getCandidateWarning({
        candidate: { confidence: 0.9, id: 1, releaseYear: 2023 },
        review: { movieYear: 2024 },
      }),
    ).toContain('Release year differs');
    expect(
      getCandidateWarning({
        candidate: { confidence: 0.9, id: 1, releaseYear: 2024 },
        review: { movieYear: 2024 },
      }),
    ).toBeNull();
  });

  it('guards apply actions by review state and current TMDB identity', () => {
    expect(canApplyCandidate({ candidate: { id: 42 }, review: { status: 'open' } })).toBe(true);
    expect(canApplyCandidate({ candidate: { id: 42 }, review: { status: 'deferred' } })).toBe(true);
    expect(canApplyCandidate({ candidate: { id: 42 }, review: { status: 'resolved' } })).toBe(
      false,
    );
    expect(canApplyCandidate({ candidate: { id: null }, review: { status: 'open' } })).toBe(false);

    expect(
      isCurrentCandidate({
        candidate: { id: 42 },
        review: { currentMovie: { tmdb_id: 42 } as never },
      }),
    ).toBe(true);
  });
});

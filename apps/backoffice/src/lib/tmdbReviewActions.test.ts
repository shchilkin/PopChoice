import { describe, expect, it } from 'vitest';

import { assertCandidateIdForAction, parseAction, parseCandidateId } from './tmdbReviewActions';

describe('tmdb review action helpers', () => {
  it('parses supported action names and candidate ids', () => {
    expect(parseAction('apply_candidate')).toBe('apply_candidate');
    expect(parseAction('reject')).toBe('reject');
    expect(parseCandidateId('42')).toBe(42);
    expect(parseCandidateId('')).toBeUndefined();
    expect(parseCandidateId(null)).toBeUndefined();
  });

  it('requires candidate id only when applying a TMDB candidate', () => {
    expect(() => assertCandidateIdForAction('reject', undefined)).not.toThrow();
    expect(() => assertCandidateIdForAction('apply_candidate', 42)).not.toThrow();
    expect(() => assertCandidateIdForAction('apply_candidate', undefined)).toThrow(
      'Candidate id is required',
    );
  });

  it('rejects invalid candidate ids', () => {
    expect(() => parseCandidateId('abc')).toThrow('Candidate id must be numeric');
    expect(() => parseCandidateId('-1')).toThrow('Candidate id must be numeric');
    expect(() => parseCandidateId('0')).toThrow('positive safe integer');
  });
});

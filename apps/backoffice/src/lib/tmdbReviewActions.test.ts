import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  applyTMDBMatchReviewAction: vi.fn(),
  ensureBackofficeReady: vi.fn(),
  loggerInfo: vi.fn(),
  listTMDBMatchReviewPage: vi.fn(),
  parseOperatorActor: vi.fn(),
}));

vi.mock('@pop-choice/shared', () => ({
  applyTMDBMatchReviewAction: mocks.applyTMDBMatchReviewAction,
  logger: { info: mocks.loggerInfo },
  listTMDBMatchReviewPage: mocks.listTMDBMatchReviewPage,
}));

vi.mock('./backofficeRuntime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./backofficeRuntime')>();
  return {
    ...actual,
    ensureBackofficeReady: mocks.ensureBackofficeReady,
    parseOperatorActor: mocks.parseOperatorActor,
  };
});

import {
  applyTMDBReviewFormAction,
  assertCandidateIdForAction,
  getNextOpenReviewPath,
  isNextReviewRequested,
  openReviewQueuePath,
  parseAction,
  parseCandidateId,
  reviewDetailPath,
} from './tmdbReviewActions';

describe('tmdb review action helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureBackofficeReady.mockResolvedValue(undefined);
    mocks.parseOperatorActor.mockReturnValue('operator@example.test');
  });

  it('parses supported action names and candidate ids', () => {
    expect(parseAction('apply_candidate')).toBe('apply_candidate');
    expect(parseAction('reject')).toBe('reject');
    expect(parseCandidateId('42')).toBe(42);
    expect(parseCandidateId('')).toBeUndefined();
    expect(parseCandidateId(null)).toBeUndefined();
    expect(isNextReviewRequested('1')).toBe(true);
    expect(isNextReviewRequested('true')).toBe(true);
    expect(isNextReviewRequested(null)).toBe(false);
    expect(reviewDetailPath('review:42')).toBe('/tmdb-reviews/review%3A42');
    expect(openReviewQueuePath()).toContain('status=open');
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

  it('returns the next open review path while skipping the current review', async () => {
    mocks.listTMDBMatchReviewPage.mockResolvedValue({
      limit: 2,
      offset: 0,
      reviews: [{ id: 'review-1' }, { id: 'review-2' }],
      totalCount: 2,
    });

    await expect(getNextOpenReviewPath('review-1')).resolves.toBe('/tmdb-reviews/review-2');
    expect(mocks.listTMDBMatchReviewPage).toHaveBeenCalledWith({
      limit: 2,
      offset: 0,
      reason: 'all',
      sort: 'highest_risk',
      status: 'open',
    });
  });

  it('applies review actions and returns a next-review redirect when requested', async () => {
    const updatedReview = { id: 'review-1', status: 'resolved' };
    mocks.applyTMDBMatchReviewAction.mockResolvedValue(updatedReview);
    mocks.listTMDBMatchReviewPage.mockResolvedValue({
      limit: 2,
      offset: 0,
      reviews: [{ id: 'review-2' }],
      totalCount: 1,
    });
    const formData = new FormData();
    formData.set('action', 'apply_candidate');
    formData.set('candidate_id', '42');
    formData.set('next_review', '1');
    formData.set('note', 'Looks right');

    const result = await applyTMDBReviewFormAction('review-1', formData, new Headers());

    expect(result).toEqual({
      action: 'apply_candidate',
      redirectTo: '/tmdb-reviews/review-2',
      review: updatedReview,
    });
    expect(mocks.applyTMDBMatchReviewAction).toHaveBeenCalledWith({
      action: 'apply_candidate',
      actor: 'operator@example.test',
      candidateId: 42,
      note: 'Looks right',
      reviewId: 'review-1',
    });
    expect(mocks.loggerInfo).toHaveBeenCalledWith('Backoffice operator action', {
      action: 'apply_candidate',
      actor: 'operator@example.test',
      durationMs: expect.any(Number),
      resultStatus: 'resolved',
      reviewId: 'review-1',
      targetId: 'review-1',
      targetType: 'tmdb_match_review',
    });
  });
});

import { describe, expect, it } from 'vitest';

import { tmdbMatchReview } from '../../test/backofficeFixtures';

import {
  buildCandidateCardViewModel,
  buildCandidateSummaryViewModel,
  buildReviewPaginationViewModel,
  buildStatusActionViewModel,
} from './viewModels';

const filters = { reason: 'all', sort: 'highest_risk', status: 'open' } as const;

describe('tmdb review view models', () => {
  it('builds pagination summaries and disabled link states', () => {
    expect(
      buildReviewPaginationViewModel({ filters, page: 1, pageSize: 25, totalCount: 0 }),
    ).toMatchObject({
      currentPage: 1,
      nextHref: null,
      previousHref: null,
      summary: 'No reviews',
      totalPages: 1,
    });

    expect(
      buildReviewPaginationViewModel({ filters, page: 2, pageSize: 25, totalCount: 60 }),
    ).toMatchObject({
      nextHref: '/tmdb-reviews?status=open&reason=all&sort=highest_risk&page=3&pageSize=25',
      previousHref: '/tmdb-reviews?status=open&reason=all&sort=highest_risk&page=1&pageSize=25',
      summary: 'Showing 26-50 of 60 reviews',
      totalPages: 3,
    });

    expect(
      buildReviewPaginationViewModel({ filters, page: 5, pageSize: 25, totalCount: 60 }).summary,
    ).toBe('Page 5 is past 60 matching reviews');
  });

  it('summarizes candidates using order-preserving best and confidence gap', () => {
    const review = tmdbMatchReview();

    expect(buildCandidateSummaryViewModel([])).toMatchObject({
      emptyText: 'No candidates captured',
      headline: null,
    });
    expect(buildCandidateSummaryViewModel(review.candidates)).toMatchObject({
      confidenceLabel: '62%',
      headline: 'Heat (1994)',
      meta: '2 candidate(s), gap 3%',
    });
  });

  it('builds candidate card state, facts, and apply controls', () => {
    const review = tmdbMatchReview();
    const view = buildCandidateCardViewModel({
      candidate: review.candidates[0]!,
      index: 0,
      review,
    });

    expect(view.className).toBe('candidate best');
    expect(view.flags.map((flag) => flag.label)).toEqual(['Best candidate', 'Needs check']);
    expect(view.facts).toContainEqual({ label: 'TMDB', value: '42' });
    expect(view.applyCandidateId).toBe('42');
    expect(view.actionHref).toBe('/tmdb-reviews/review-1/actions');

    expect(
      buildCandidateCardViewModel({
        candidate: { ...review.candidates[0]!, id: null },
        index: 0,
        review,
      }).applyCandidateId,
    ).toBeNull();
    expect(
      buildCandidateCardViewModel({
        candidate: review.candidates[0]!,
        index: 0,
        review: { ...review, status: 'resolved' },
      }).applyCandidateId,
    ).toBeNull();
  });

  it('builds status action disabled states and next action availability', () => {
    const review = tmdbMatchReview();

    expect(buildStatusActionViewModel({ action: 'reject', review })).toMatchObject({
      buttonClass: 'danger',
      disabled: false,
      includeNextAction: true,
    });
    expect(
      buildStatusActionViewModel({ action: 'reject', review: { ...review, status: 'ignored' } })
        .disabled,
    ).toBe(true);
    expect(
      buildStatusActionViewModel({ action: 'defer', review: { ...review, status: 'deferred' } })
        .disabled,
    ).toBe(true);
    expect(
      buildStatusActionViewModel({ action: 'reopen', review: { ...review, status: 'open' } }),
    ).toMatchObject({ disabled: true, includeNextAction: false });
    expect(
      buildStatusActionViewModel({ action: 'defer', review: { ...review, status: 'resolved' } })
        .disabled,
    ).toBe(true);
  });
});

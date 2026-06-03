import type { TMDBMatchReview } from '@pop-choice/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ReviewDetailPage } from './detail';

function review(overrides: Partial<TMDBMatchReview> = {}): TMDBMatchReview {
  return {
    candidates: [
      {
        confidence: 0.62,
        id: 42,
        originalTitle: 'Heat',
        raw: { id: 42, title: 'Heat' },
        releaseYear: 1994,
        title: 'Heat',
      },
      {
        confidence: 0.59,
        id: 43,
        originalTitle: 'Heat',
        raw: { id: 43, title: 'Heat' },
        releaseYear: 1995,
        title: 'Heat',
      },
    ],
    createdAt: '2026-06-02T12:00:00.000Z',
    currentMovie: {
      age_rating: 'R',
      duration: 170,
      id: '7',
      localized_name: null,
      name: 'Heat',
      poster_url: null,
      tmdb_id: 41,
      tmdb_match_confidence: 0.51,
      tmdb_match_source: 'candidate',
      tmdb_matched_at: '2026-06-01T12:00:00.000Z',
      year: 1995,
    },
    id: 'review-1',
    movieId: '7',
    movieName: 'Heat',
    movieYear: 1995,
    notes: 'Runtime differs from current TMDB match.',
    reason: 'runtime_mismatch',
    status: 'open',
    updatedAt: '2026-06-02T12:00:00.000Z',
    ...overrides,
  };
}

describe('TMDB review detail page', () => {
  it('renders risk summary, next-review navigation, and pending-capable action forms', () => {
    const html = renderToStaticMarkup(<ReviewDetailPage review={review()} audit={[]} />);

    expect(html).toContain('Next open');
    expect(html).toContain('High review risk');
    expect(html).toContain('Current catalog TMDB id is 41');
    expect(html.match(/name="next_review"/g)).toHaveLength(4);
    expect(html).toContain('Apply candidate');
    expect(html).toContain('Apply + next');
  });
});

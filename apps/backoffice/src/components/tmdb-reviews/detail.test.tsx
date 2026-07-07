import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { tmdbMatchReview } from '../../test/backofficeFixtures';

import { ReviewDetailPage } from './detail';

describe('TMDB review detail page', () => {
  it('renders risk summary, next-review navigation, and pending-capable action forms', () => {
    const html = renderToStaticMarkup(<ReviewDetailPage review={tmdbMatchReview()} audit={[]} />);

    expect(html).toContain('Next open');
    expect(html).toContain('High review risk');
    expect(html).toContain('Current catalog TMDB id is 41');
    expect(html.match(/name="next_review"/g)).toHaveLength(4);
    expect(html).toContain('Apply candidate');
    expect(html).toContain('Apply + next');
  });
});

import type { CatalogHealthIssue, CatalogMovieSample } from '@pop-choice/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CatalogIssuePanel, buildCatalogIssuePageHref, catalogIssueHint } from './issuePanel';

const sampleMovie: CatalogMovieSample = {
  age_rating: 'NR',
  duration: 0,
  id: '331',
  localized_name: null,
  name: 'Mock Movie',
  poster_url: null,
  tmdb_id: null,
  tmdb_matched_at: null,
  year: 2026,
};

function issue(overrides: Partial<CatalogHealthIssue> = {}): CatalogHealthIssue {
  return {
    count: 42,
    key: 'missing_poster_url',
    label: 'Missing poster_url',
    samples: [sampleMovie],
    ...overrides,
  };
}

describe('catalog health issue panel presentation', () => {
  it('returns issue hints and safe affected-row page links', () => {
    expect(catalogIssueHint('missing_genre_metadata')).toContain('discovery');
    expect(catalogIssueHint('unknown_gap')).toBe('Review affected catalog records.');
    expect(
      buildCatalogIssuePageHref({
        issueKey: 'missing poster/url',
        page: 2,
        pageSize: 50,
      }),
    ).toBe(
      '/?issue=missing+poster%2Furl&issuePage=2&issuePageSize=50#issue-missing%20poster%2Furl',
    );
  });

  it('renders bounded repair actions for repairable issue groups', () => {
    const html = renderToStaticMarkup(
      <CatalogIssuePanel issue={issue({ count: 1200 })} issuePage={null} />,
    );

    expect(html).toContain('Repairable');
    expect(html).toContain('Queue next 25');
    expect(html).toContain('Queue first 1000');
    expect(html).toContain('Browse all 1200 rows');
    expect(html).toContain('data-repair-row');
    expect(html).toContain('Queue backfill');
  });

  it('shows active page pagination instead of sample-only footer', () => {
    const html = renderToStaticMarkup(
      <CatalogIssuePanel
        issue={issue({ count: 100 })}
        issuePage={{
          issueKey: 'missing_poster_url',
          label: 'Missing poster_url',
          limit: 25,
          movies: [sampleMovie],
          offset: 25,
          totalCount: 100,
        }}
      />,
    );

    expect(html).toContain('Browsing rows');
    expect(html).toContain('Showing 26-50 of 100 affected movies');
    expect(html).not.toContain('Browse all 100 rows');
  });

  it('does not show repair controls for healthy issues', () => {
    const html = renderToStaticMarkup(
      <CatalogIssuePanel issue={issue({ count: 0, samples: [] })} issuePage={null} />,
    );

    expect(html).toContain('Healthy');
    expect(html).toContain('No affected movies.');
    expect(html).not.toContain('Queue next');
  });
});

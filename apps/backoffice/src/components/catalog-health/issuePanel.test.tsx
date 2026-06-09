import type { CatalogHealthIssue } from '@pop-choice/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { catalogHealthIssue, catalogMovieSample } from '../../test/backofficeFixtures';
import { CatalogIssuePanel, buildCatalogIssuePageHref, catalogIssueHint } from './issuePanel';

const sampleMovie = catalogMovieSample({
  age_rating: 'NR',
  duration: 0,
  id: '331',
  name: 'Mock Movie',
  year: 2026,
});

function issue(overrides: Partial<CatalogHealthIssue> = {}): CatalogHealthIssue {
  return catalogHealthIssue({ samples: [sampleMovie], ...overrides });
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
      '/catalog-health?issue=missing+poster%2Furl&issuePage=2&issuePageSize=50#issue-missing%20poster%2Furl',
    );
  });

  it('renders bounded repair actions for repairable issue groups', () => {
    const html = renderToStaticMarkup(
      <CatalogIssuePanel issue={issue({ count: 1200 })} issuePage={null} />,
    );

    expect(html).toContain('Repairable');
    expect(html).toContain('class="issue-panel-actions"');
    expect(html).toContain('class="bulk-repair-actions has-background-batch"');
    expect(html).toContain('Queue next 25');
    expect(html).toContain('Queues 25 paced jobs now. Verify the lane before batching.');
    expect(html).toContain('Background batch');
    expect(html).toContain('First 1000');
    expect(html).toContain('Start batch for first 1000');
    expect(html).toContain('Workers add jobs in chunks.');
    expect(html).toContain('Inspect all 1200 affected rows');
    expect(html).not.toContain('Browse rows');
    expect(html).toContain('data-repair-row');
    expect(html).toContain('Queue backfill');
  });

  it('stretches a single bulk repair action across the action cluster', () => {
    const html = renderToStaticMarkup(
      <CatalogIssuePanel issue={issue({ count: 7 })} issuePage={null} />,
    );

    expect(html).toContain('class="bulk-repair-actions single"');
    expect(html).toContain('Queue next 7');
    expect(html).toContain('Queues 7 paced jobs now. Verify the lane before batching.');
    expect(html).not.toContain('Background batch');
    expect(html).not.toContain('Queue all');
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

    expect(html).toContain('Showing 26-50 of 100 affected movies');
    expect(html).not.toContain('Browse rows');
    expect(html).not.toContain('Inspect all 100 affected rows');
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

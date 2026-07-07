import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { catalogHealthIssue, catalogMovieSample } from '../../test/backofficeFixtures';

import { CatalogHealthPage } from './index';

import type { CatalogHealthLiveData } from '../../lib/catalogHealthLive';
import type { CatalogHealthReport } from '@pop-choice/shared';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const generatedAt = '2026-06-08T10:00:00.000Z';

function report(overrides: Partial<CatalogHealthReport> = {}): CatalogHealthReport {
  return {
    duplicateNormalizedTitleYears: { groups: [], totalGroups: 0 },
    duplicateTmdbIds: { groups: [], totalGroups: 0 },
    generatedAt,
    issues: [
      catalogHealthIssue({ count: 0, key: 'missing_runtime', label: 'Missing runtime' }),
      catalogHealthIssue({ count: 7, key: 'missing_poster_url', label: 'Missing poster_url' }),
      catalogHealthIssue({ count: 2, key: 'missing_tmdb_id', label: 'Missing tmdb_id' }),
      catalogHealthIssue({ count: 9, key: 'missing_vote_count', label: 'Missing vote_count' }),
    ],
    staleAfterDays: 180,
    totalMovies: 354,
    ...overrides,
  };
}

function liveData(catalogReport: CatalogHealthReport): CatalogHealthLiveData {
  return {
    auditPage: {
      limit: 25,
      offset: 0,
      totalCount: 0,
    },
    issueMoviePage: {
      issueKey: 'missing_poster_url',
      limit: 25,
      offset: 0,
      totalCount: 0,
    },
    queueSnapshot: {
      available: true,
      counts: {
        active: 0,
        completed: 0,
        delayed: 0,
        failed: 0,
        prioritized: 0,
        waiting: 0,
        waitingChildren: 0,
      },
      openJobs: 0,
      queueName: 'catalog-maintenance',
      updatedAt: generatedAt,
    },
    report: {
      activeIssues: catalogReport.issues.filter((issue) => issue.count > 0).length,
      duplicateGroups:
        catalogReport.duplicateTmdbIds.totalGroups +
        catalogReport.duplicateNormalizedTitleYears.totalGroups,
      generatedAt,
      issueCounts: Object.fromEntries(
        catalogReport.issues.map((issue) => [issue.key, issue.count]),
      ),
      staleAfterDays: catalogReport.staleAfterDays,
      totalMovies: catalogReport.totalMovies,
    },
  };
}

describe('catalog health page action sections', () => {
  it('renders only actionable issue panels in workflow order', () => {
    const catalogReport = report();
    const html = renderToStaticMarkup(
      <CatalogHealthPage
        auditPage={{ audit: [], limit: 25, offset: 0, totalCount: 0 }}
        initialLiveData={liveData(catalogReport)}
        issueMoviePage={null}
        repairStatus={null}
        report={catalogReport}
      />,
    );

    expect(html).not.toContain('No affected movies.');
    expect(html).not.toContain('Missing vote_count');
    expect(html).toContain('No affected rows');
    expect(html).toContain('aria-label="Missing runtime: clear"');
    expect(html).toContain('Missing runtime');
    expect(html.match(/class="panel issue-panel/g)?.length).toBe(2);
    expect(html.indexOf('Missing tmdb_id')).toBeLessThan(html.indexOf('Missing poster_url'));
    expect(html).toContain('Queue next 2');
    expect(html).toContain('Queue next 7');
  });

  it('shows one clear state when no catalog checks need action', () => {
    const catalogReport = report({
      issues: [
        catalogHealthIssue({ count: 0, key: 'missing_runtime', label: 'Missing runtime' }),
        catalogHealthIssue({ count: 0, key: 'missing_poster_url', label: 'Missing poster_url' }),
      ],
    });
    const html = renderToStaticMarkup(
      <CatalogHealthPage
        auditPage={{ audit: [], limit: 25, offset: 0, totalCount: 0 }}
        initialLiveData={liveData(catalogReport)}
        issueMoviePage={null}
        repairStatus={null}
        report={catalogReport}
      />,
    );

    expect(html).toContain('Catalog checks are clear');
    expect(html).toContain('No catalog data issues need operator action.');
    expect(html).toContain('No affected rows');
    expect(html).toContain('Missing runtime');
    expect(html).not.toContain('Queue next');
  });
});

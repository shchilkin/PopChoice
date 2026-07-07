import { describe, expect, it } from 'vitest';

import { catalogHealthIssue, catalogMovieSample } from '../../test/backofficeFixtures';

import {
  buildCatalogActionSectionsViewModel,
  buildCatalogIssuePanelViewModel,
  buildCatalogWorkQueueViewModel,
  buildDuplicateReportViewModel,
  buildRepairFlashViewModel,
  catalogIssueHint,
} from './viewModels';

describe('catalog health view models', () => {
  it('builds repair flash messages by action status', () => {
    expect(buildRepairFlashViewModel('queued')).toMatchObject({ tone: 'neutral' });
    expect(buildRepairFlashViewModel('bulk-partial')).toMatchObject({ tone: 'warn' });
    expect(buildRepairFlashViewModel('unknown')).toBeNull();
  });

  it('builds healthy, repairable, and paged issue panel state', () => {
    expect(catalogIssueHint('missing_poster_url')).toContain('Poster coverage');
    expect(
      buildCatalogIssuePanelViewModel({
        issue: catalogHealthIssue({ count: 0 }),
        issuePage: null,
      }),
    ).toMatchObject({
      countState: 'healthy',
      pillLabel: 'Healthy',
      showHealthyEmpty: true,
    });

    const issue = catalogHealthIssue({
      count: 140,
      key: 'missing_poster_url',
      samples: [catalogMovieSample({ id: '1' })],
    });
    const view = buildCatalogIssuePanelViewModel({
      issue,
      issuePage: {
        issueKey: 'missing_poster_url',
        label: 'Missing poster_url',
        limit: 25,
        movies: [catalogMovieSample({ id: '2' })],
        offset: 25,
        totalCount: 140,
      },
    });

    expect(view.countState).toBe('repairable');
    expect(view.rows).toEqual([catalogMovieSample({ id: '2' })]);
    expect(view.bulkActions.map((action) => action.action)).toEqual([
      'bulk_enqueue_backfill',
      'bulk_enqueue_backfill_async',
    ]);
    expect(view.bulkActions[0]).toMatchObject({
      helperText: 'Queues 25 paced jobs now. Verify the lane before batching.',
      intent: 'chunk',
      label: 'Queue next 25',
      scopeLabel: '25 now',
    });
    expect(view.bulkActions[1]).toMatchObject({
      helperText:
        'Creates one durable batch for all 140 affected rows. Workers add jobs in chunks.',
      intent: 'background',
      label: 'Start batch for all 140',
      scopeLabel: 'All 140',
    });
    expect(view.footerBrowseHref).toBeNull();

    const overview = buildCatalogIssuePanelViewModel({
      issue,
      issuePage: null,
    });
    expect(overview.footerBrowseHref).toBe(
      '/catalog-health?issue=missing_poster_url&issuePage=1&issuePageSize=25#issue-missing_poster_url',
    );
  });

  it('builds duplicate report state', () => {
    expect(buildDuplicateReportViewModel({ groups: [], totalGroups: 0 })).toMatchObject({
      pillLabel: 'Healthy',
      state: 'healthy',
    });
    expect(
      buildDuplicateReportViewModel({
        groups: [
          {
            count: 2,
            identityKey: 'tmdb:42',
            movies: [catalogMovieSample({ id: '1' }), catalogMovieSample({ id: '2' })],
          },
        ],
        totalGroups: 1,
      }),
    ).toMatchObject({
      panelClassName: 'panel duplicate-panel needs-work',
      pillLabel: 'Review',
      state: 'warning',
    });
  });

  it('prioritizes catalog work as an operator queue', () => {
    const view = buildCatalogWorkQueueViewModel({
      duplicateNormalizedTitleYears: { groups: [], totalGroups: 0 },
      duplicateTmdbIds: { groups: [], totalGroups: 1 },
      generatedAt: '2026-06-08T10:00:00.000Z',
      issues: [
        catalogHealthIssue({ count: 199, key: 'missing_poster_url', label: 'Missing poster_url' }),
        catalogHealthIssue({ count: 36, key: 'missing_tmdb_id', label: 'Missing tmdb_id' }),
        catalogHealthIssue({ count: 80, key: 'missing_vote_count', label: 'Missing vote_count' }),
        catalogHealthIssue({ count: 0, key: 'missing_runtime', label: 'Missing runtime' }),
      ],
      staleAfterDays: 180,
      totalMovies: 354,
    });

    expect(view.summary).toContain('Start with identity gaps');
    expect(view.items.map((item) => item.issueKey)).toEqual([
      'missing_tmdb_id',
      'missing_poster_url',
      'duplicate_tmdb_ids',
    ]);
    expect(view.items[0]).toMatchObject({
      actionLabel: 'Open repair queue',
      priorityLabel: 'Start here',
    });
    expect(view.items[1]?.detail).toContain('identity gaps ahead');
  });

  it('filters healthy panels and orders action sections by workflow priority', () => {
    const view = buildCatalogActionSectionsViewModel({
      duplicateNormalizedTitleYears: { groups: [], totalGroups: 0 },
      duplicateTmdbIds: { groups: [], totalGroups: 1 },
      generatedAt: '2026-06-08T10:00:00.000Z',
      issues: [
        catalogHealthIssue({ count: 7, key: 'missing_poster_url', label: 'Missing poster_url' }),
        catalogHealthIssue({ count: 0, key: 'missing_runtime', label: 'Missing runtime' }),
        catalogHealthIssue({ count: 2, key: 'missing_tmdb_id', label: 'Missing tmdb_id' }),
        catalogHealthIssue({
          count: 4,
          key: 'stale_tmdb_metadata',
          label: 'Stale TMDB metadata',
        }),
        catalogHealthIssue({ count: 9, key: 'missing_vote_count', label: 'Missing vote_count' }),
      ],
      staleAfterDays: 180,
      totalMovies: 354,
    });

    expect(view.issues.map((issue) => issue.key)).toEqual([
      'missing_tmdb_id',
      'stale_tmdb_metadata',
      'missing_poster_url',
    ]);
    expect(view.healthyChecks.map((issue) => issue.key)).toEqual(['missing_runtime']);
    expect(view.duplicateTmdbIdsVisible).toBe(true);
    expect(view.duplicateNormalizedTitleYearsVisible).toBe(false);
    expect(view.hasOpenWork).toBe(true);
  });
});

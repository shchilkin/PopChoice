import { describe, expect, it } from 'vitest';

import { catalogHealthIssue, catalogMovieSample } from '../../test/backofficeFixtures';
import {
  buildCatalogIssuePanelViewModel,
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
    expect(view.browseAction).toMatchObject({ label: 'Browsing rows' });
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
});

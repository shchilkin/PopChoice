import type { CatalogHealthIssue, CatalogHealthReport } from '@pop-choice/shared';

import {
  DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
  REPAIRABLE_CATALOG_ISSUE_KEYS,
} from '../../lib/backoffice';
import { buildCatalogIssuePageHref } from '../shared/hrefs';
import { catalogIssueHint } from './issueHints';

export interface CatalogWorkQueueItemViewModel {
  actionHref: string;
  actionLabel: string;
  count: number;
  detail: string;
  issueKey: string;
  label: string;
  lane: 'repair' | 'review';
  priorityLabel: string;
}

export interface CatalogWorkQueueViewModel {
  items: CatalogWorkQueueItemViewModel[];
  summary: string;
}

export interface CatalogActionSectionsViewModel {
  duplicateNormalizedTitleYearsVisible: boolean;
  duplicateTmdbIdsVisible: boolean;
  hasOpenWork: boolean;
  healthyChecks: CatalogHealthIssue[];
  issues: CatalogHealthIssue[];
}

export function buildCatalogWorkQueueViewModel(
  report: CatalogHealthReport,
): CatalogWorkQueueViewModel {
  const missingTmdbIssue = report.issues.find((issue) => issue.key === 'missing_tmdb_id');
  const activeIssueItems = report.issues
    .filter((issue) => issue.count > 0 && REPAIRABLE_CATALOG_ISSUE_KEYS.has(issue.key))
    .sort(compareCatalogIssuePriority)
    .map((issue, index) =>
      buildCatalogWorkQueueIssueItem(issue, index, missingTmdbIssue?.count ?? 0),
    );

  const duplicateItems: CatalogWorkQueueItemViewModel[] = [
    buildDuplicateWorkQueueItem(
      'duplicate_tmdb_ids',
      'Duplicate TMDB ids',
      report.duplicateTmdbIds.totalGroups,
      '#duplicate-tmdb-ids',
    ),
    buildDuplicateWorkQueueItem(
      'duplicate_title_year',
      'Duplicate title/year groups',
      report.duplicateNormalizedTitleYears.totalGroups,
      '#duplicate-title-year',
    ),
  ].filter((item) => item.count > 0);

  const items = [...activeIssueItems, ...duplicateItems].slice(0, 5);

  return {
    items,
    summary:
      items.length === 0
        ? 'No open catalog work. Keep an eye on live queue and stale metadata windows.'
        : 'Start with identity gaps, then run repairable metadata work, then review duplicates.',
  };
}

export function buildCatalogActionSectionsViewModel(
  report: CatalogHealthReport,
): CatalogActionSectionsViewModel {
  const issues = report.issues
    .filter((issue) => issue.count > 0 && REPAIRABLE_CATALOG_ISSUE_KEYS.has(issue.key))
    .sort(compareCatalogIssuePriority);

  return {
    duplicateNormalizedTitleYearsVisible: report.duplicateNormalizedTitleYears.totalGroups > 0,
    duplicateTmdbIdsVisible: report.duplicateTmdbIds.totalGroups > 0,
    healthyChecks: report.issues
      .filter((issue) => issue.count === 0)
      .sort(compareCatalogIssuePriority),
    hasOpenWork:
      issues.length > 0 ||
      report.duplicateTmdbIds.totalGroups > 0 ||
      report.duplicateNormalizedTitleYears.totalGroups > 0,
    issues,
  };
}

function buildCatalogWorkQueueIssueItem(
  issue: CatalogHealthIssue,
  index: number,
  missingTmdbCount: number,
): CatalogWorkQueueItemViewModel {
  const canRepair = REPAIRABLE_CATALOG_ISSUE_KEYS.has(issue.key);

  return {
    actionHref: buildCatalogIssuePageHref({
      issueKey: issue.key,
      page: 1,
      pageSize: DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
    }),
    actionLabel: canRepair ? 'Open repair queue' : 'Inspect rows',
    count: issue.count,
    detail: catalogWorkQueueDetail(issue.key, missingTmdbCount),
    issueKey: issue.key,
    label: issue.label,
    lane: canRepair ? 'repair' : 'review',
    priorityLabel: index === 0 ? 'Start here' : `Priority ${index + 1}`,
  };
}

function buildDuplicateWorkQueueItem(
  issueKey: string,
  label: string,
  count: number,
  actionHref: string,
): CatalogWorkQueueItemViewModel {
  return {
    actionHref,
    actionLabel: 'Review groups',
    count,
    detail: 'Review identity collisions before any manual merge or automated consolidation.',
    issueKey,
    label,
    lane: 'review',
    priorityLabel: 'Review',
  };
}

function compareCatalogIssuePriority(a: CatalogHealthIssue, b: CatalogHealthIssue): number {
  const priorityDelta = catalogIssuePriority(a.key) - catalogIssuePriority(b.key);
  if (priorityDelta !== 0) return priorityDelta;
  const repairDelta =
    Number(REPAIRABLE_CATALOG_ISSUE_KEYS.has(b.key)) -
    Number(REPAIRABLE_CATALOG_ISSUE_KEYS.has(a.key));
  if (repairDelta !== 0) return repairDelta;
  return b.count - a.count;
}

function catalogIssuePriority(issueKey: string): number {
  return CATALOG_ISSUE_WORKFLOW_PRIORITY[issueKey] ?? 80;
}

function catalogWorkQueueDetail(issueKey: string, missingTmdbCount: number): string {
  if (issueKey === 'missing_tmdb_id') {
    return 'Resolve identity first; poster, runtime, localization, and metadata refreshes depend on it.';
  }
  if (missingTmdbCount > 0 && DOWNSTREAM_TMDB_ISSUES.has(issueKey)) {
    return 'Repair rows that already have TMDB ids, but keep identity gaps ahead of this work.';
  }
  return catalogIssueHint(issueKey);
}

const DOWNSTREAM_TMDB_ISSUES = new Set([
  'missing_poster_url',
  'missing_localized_name',
  'missing_runtime',
  'missing_age_rating',
  'missing_tmdb_matched_at',
  'stale_tmdb_metadata',
  'missing_cast_metadata',
  'missing_director_metadata',
  'missing_genre_metadata',
  'missing_keyword_metadata',
]);

const CATALOG_ISSUE_WORKFLOW_PRIORITY: Record<string, number> = {
  missing_tmdb_id: 0,
  missing_tmdb_matched_at: 10,
  stale_tmdb_metadata: 12,
  missing_poster_url: 20,
  missing_localized_name: 22,
  missing_runtime: 24,
  missing_age_rating: 26,
  missing_cast_metadata: 40,
  missing_director_metadata: 42,
  missing_genre_metadata: 44,
  missing_keyword_metadata: 46,
};

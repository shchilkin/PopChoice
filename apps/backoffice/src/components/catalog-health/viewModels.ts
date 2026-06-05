import type {
  CatalogHealthIssue,
  CatalogHealthIssueMoviePage,
  CatalogHealthReport,
  CatalogMovieSample,
} from '@pop-choice/shared';

import {
  DEFAULT_BULK_REPAIR_LIMIT,
  DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
  MAX_ASYNC_BULK_REPAIR_LIMIT,
  REPAIRABLE_CATALOG_ISSUE_KEYS,
} from '../../lib/backoffice';
import { buildCatalogIssuePageHref } from '../shared/hrefs';

export interface RepairFlashViewModel {
  copy: string;
  tone: 'neutral' | 'warn';
}

export interface CatalogIssuePanelViewModel {
  activePage: CatalogHealthIssueMoviePage | null;
  browseAction: { className: string; href: string; label: string } | null;
  bulkActions: BulkRepairActionViewModel[];
  canRepair: boolean;
  countState: 'healthy' | 'repairable' | 'warning';
  emptyLabel: string;
  footerBrowseHref: string | null;
  hint: string;
  panelClassName: string;
  pillLabel: string;
  rows: CatalogMovieSample[];
  showHealthyEmpty: boolean;
}

export interface BulkRepairActionViewModel {
  action: 'bulk_enqueue_backfill' | 'bulk_enqueue_backfill_async';
  batchLimit: number;
  buttonClassName: string;
  confirmMessage: string;
  label: string;
}

export interface DuplicateReportViewModel {
  groups: CatalogHealthReport['duplicateTmdbIds']['groups'];
  panelClassName: string;
  pillLabel: 'Healthy' | 'Review';
  state: 'healthy' | 'warning';
}

export function catalogIssueHint(issueKey: string): string {
  return CATALOG_ISSUE_HINTS[issueKey] ?? 'Review affected catalog records.';
}

export function buildRepairFlashViewModel(
  repairStatus: string | null,
): RepairFlashViewModel | null {
  return repairStatus ? (REPAIR_FLASH_MESSAGES[repairStatus] ?? null) : null;
}

export function buildCatalogIssuePanelViewModel({
  issue,
  issuePage,
}: {
  issue: CatalogHealthIssue;
  issuePage: CatalogHealthIssueMoviePage | null;
}): CatalogIssuePanelViewModel {
  const canRepair = REPAIRABLE_CATALOG_ISSUE_KEYS.has(issue.key);
  const activePage = issuePage?.issueKey === issue.key ? issuePage : null;
  const countState = getIssueCountState(issue, canRepair);
  const rows = activePage ? activePage.movies : issue.samples;

  return {
    activePage,
    browseAction: buildIssueBrowseAction(issue, activePage),
    bulkActions: canRepair && issue.count > 0 ? buildBulkRepairActions(issue) : [],
    canRepair,
    countState,
    emptyLabel: activePage ? 'No affected movies on this page.' : 'No sample records returned.',
    footerBrowseHref:
      !activePage && issue.count > issue.samples.length
        ? buildCatalogIssuePageHref({
            issueKey: issue.key,
            page: 1,
            pageSize: DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
          })
        : null,
    hint: catalogIssueHint(issue.key),
    panelClassName: [
      'panel issue-panel',
      issue.count > 0 ? 'needs-work' : 'healthy',
      canRepair && issue.count > 0 ? 'repairable' : '',
    ]
      .filter(Boolean)
      .join(' '),
    pillLabel: issue.count === 0 ? 'Healthy' : canRepair ? 'Repairable' : 'Review',
    rows,
    showHealthyEmpty: issue.count === 0,
  };
}

export function buildDuplicateReportViewModel(
  report: CatalogHealthReport['duplicateTmdbIds'],
): DuplicateReportViewModel {
  const state = report.totalGroups > 0 ? 'warning' : 'healthy';

  return {
    groups: report.groups,
    panelClassName: `panel duplicate-panel ${report.totalGroups > 0 ? 'needs-work' : 'healthy'}`,
    pillLabel: report.totalGroups > 0 ? 'Review' : 'Healthy',
    state,
  };
}

function buildIssueBrowseAction(
  issue: CatalogHealthIssue,
  activePage: CatalogHealthIssueMoviePage | null,
): CatalogIssuePanelViewModel['browseAction'] {
  if (issue.count === 0) return null;

  return {
    className: `button small ${activePage ? 'quiet' : ''}`,
    href: buildCatalogIssuePageHref({
      issueKey: issue.key,
      page: 1,
      pageSize: activePage?.limit ?? DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
    }),
    label: activePage ? 'Browsing rows' : 'Browse rows',
  };
}

function buildBulkRepairActions(issue: CatalogHealthIssue): BulkRepairActionViewModel[] {
  const batchLimit = Math.min(issue.count, DEFAULT_BULK_REPAIR_LIMIT);
  const allLimit = Math.min(issue.count, MAX_ASYNC_BULK_REPAIR_LIMIT);
  const actions: BulkRepairActionViewModel[] = [
    {
      action: 'bulk_enqueue_backfill',
      batchLimit,
      buttonClassName: 'button secondary small',
      confirmMessage: `Queue up to ${batchLimit} repair jobs for ${issue.label}? Workers will keep the existing TMDB/OpenAI pacing.`,
      label: `Queue next ${batchLimit}`,
    },
  ];

  if (allLimit > batchLimit) {
    const allLabel =
      issue.count > MAX_ASYNC_BULK_REPAIR_LIMIT
        ? `Queue first ${allLimit}`
        : `Queue all ${allLimit}`;
    actions.push({
      action: 'bulk_enqueue_backfill_async',
      batchLimit: allLimit,
      buttonClassName: 'button quiet small',
      confirmMessage: `${allLabel} repair jobs for ${issue.label}? Backoffice will create a durable batch now, then workers will add repair jobs in chunks.`,
      label: allLabel,
    });
  }

  return actions;
}

function getIssueCountState(
  issue: CatalogHealthIssue,
  canRepair: boolean,
): CatalogIssuePanelViewModel['countState'] {
  if (issue.count === 0) return 'healthy';
  return canRepair ? 'repairable' : 'warning';
}

const CATALOG_ISSUE_HINTS: Record<string, string> = {
  missing_age_rating: 'Age-rating gaps reduce safety and household filtering quality.',
  missing_cast_metadata: 'Cast gaps limit actor-aware recommendation features.',
  missing_director_metadata: 'Director gaps limit creator-aware recommendation features.',
  missing_genre_metadata: 'Genre gaps weaken discovery and future filters.',
  missing_keyword_metadata: 'Keyword gaps reduce nuance for ranking and search.',
  missing_localized_name: 'Localized names improve non-English operator and user views.',
  missing_poster_url: 'Poster coverage affects result cards and catalog browsing.',
  missing_runtime: 'Runtime gaps make fit and pacing recommendations weaker.',
  missing_tmdb_id: 'Identity gaps block richer TMDB refreshes and joins.',
  missing_tmdb_matched_at: 'Matched rows need timestamps for stale-data decisions.',
  stale_tmdb_metadata: 'Refresh candidates through the rate-limited TMDB path.',
};

const REPAIR_FLASH_MESSAGES: Record<string, RepairFlashViewModel> = {
  'bulk-orchestration-queued': {
    copy: 'Catalog repair orchestration accepted. A durable batch was created; workers will add repair items and queue backfill jobs in chunks.',
    tone: 'neutral',
  },
  'bulk-partial': {
    copy: 'Catalog repair batch partially queued. Check the recent repair audit before retrying.',
    tone: 'warn',
  },
  'bulk-queued': {
    copy: 'Catalog repair batch accepted. Issues stay open until workers update the catalog and the next health report clears them.',
    tone: 'neutral',
  },
  deduped: {
    copy: 'Catalog backfill work was already queued. Workers will process the existing job through the rate-limited TMDB path.',
    tone: 'neutral',
  },
  empty: {
    copy: 'No affected movies are currently available to queue.',
    tone: 'warn',
  },
  failed: {
    copy: 'Catalog repair action failed. Check backoffice logs for details.',
    tone: 'warn',
  },
  queued: {
    copy: 'Catalog backfill work accepted. This row is not resolved yet; workers will process it through the existing rate-limited TMDB path.',
    tone: 'neutral',
  },
  unavailable: {
    copy: 'Catalog repair queue is unavailable. Check REDIS_URL and the backoffice logs.',
    tone: 'warn',
  },
};

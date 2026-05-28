import type {
  CatalogHealthIssueMoviePage,
  CatalogHealthReport,
  CatalogRepairActionAuditPage,
} from '@pop-choice/shared';

import type { CatalogMaintenanceQueueSnapshot } from '../catalogMaintenanceQueue';

export const CATALOG_HEALTH_LIVE_QUERY_KEY = ['backoffice', 'catalog-health-live'] as const;

export interface CatalogHealthLiveData {
  auditPage: Pick<CatalogRepairActionAuditPage, 'limit' | 'offset' | 'totalCount'>;
  issueMoviePage: Pick<
    CatalogHealthIssueMoviePage,
    'issueKey' | 'limit' | 'offset' | 'totalCount'
  > | null;
  queueSnapshot: CatalogMaintenanceQueueSnapshot;
  report: {
    activeIssues: number;
    duplicateGroups: number;
    generatedAt: string;
    issueCounts: Record<string, number>;
    totalMovies: number;
  };
}

export function toCatalogHealthLiveData({
  auditPage,
  issueMoviePage,
  queueSnapshot,
  report,
}: {
  auditPage: CatalogRepairActionAuditPage;
  issueMoviePage: CatalogHealthIssueMoviePage | null;
  queueSnapshot: CatalogMaintenanceQueueSnapshot;
  report: CatalogHealthReport;
}): CatalogHealthLiveData {
  return {
    auditPage: {
      limit: auditPage.limit,
      offset: auditPage.offset,
      totalCount: auditPage.totalCount,
    },
    issueMoviePage: issueMoviePage
      ? {
          issueKey: issueMoviePage.issueKey,
          limit: issueMoviePage.limit,
          offset: issueMoviePage.offset,
          totalCount: issueMoviePage.totalCount,
        }
      : null,
    queueSnapshot,
    report: {
      activeIssues: report.issues.filter((issue) => issue.count > 0).length,
      duplicateGroups:
        report.duplicateTmdbIds.totalGroups + report.duplicateNormalizedTitleYears.totalGroups,
      generatedAt: report.generatedAt,
      issueCounts: Object.fromEntries(report.issues.map((issue) => [issue.key, issue.count])),
      totalMovies: report.totalMovies,
    },
  };
}

export function catalogHealthLiveFingerprint(data: CatalogHealthLiveData): string {
  return JSON.stringify({
    auditTotalCount: data.auditPage.totalCount,
    issueMoviePage: data.issueMoviePage,
    queueCounts: data.queueSnapshot.counts,
    queueOpenJobs: data.queueSnapshot.openJobs,
    report: {
      duplicateGroups: data.report.duplicateGroups,
      issueCounts: data.report.issueCounts,
      totalMovies: data.report.totalMovies,
    },
  });
}

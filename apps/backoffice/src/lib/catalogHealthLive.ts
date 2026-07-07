import type { CatalogMaintenanceQueueSnapshot } from '../catalogMaintenanceQueue';
import type {
  CatalogHealthIssueMoviePage,
  CatalogHealthReport,
  CatalogRepairActionAuditPage,
} from '@pop-choice/shared';

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
    staleAfterDays: number;
    totalMovies: number;
  };
}

export interface CatalogHealthSnapshotMessage {
  data: CatalogHealthLiveData;
  queueEvent?: {
    type?: string;
  };
  receivedAt: string;
  trigger: 'connected' | 'queue-event' | 'redis-unavailable';
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
      staleAfterDays: report.staleAfterDays,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasFiniteNumber(value: Record<string, unknown>, key: string): boolean {
  return isFiniteNumber(value[key]);
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every(isFiniteNumber);
}

function isCatalogHealthIssueMoviePage(value: unknown): boolean {
  return (
    value === null ||
    (isRecord(value) &&
      typeof value.issueKey === 'string' &&
      hasFiniteNumber(value, 'limit') &&
      hasFiniteNumber(value, 'offset') &&
      hasFiniteNumber(value, 'totalCount'))
  );
}

function isCatalogRepairAuditPageSummary(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasFiniteNumber(value, 'limit') &&
    hasFiniteNumber(value, 'offset') &&
    hasFiniteNumber(value, 'totalCount')
  );
}

function isCatalogMaintenanceQueueCounts(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return [
    'active',
    'completed',
    'delayed',
    'failed',
    'prioritized',
    'waiting',
    'waitingChildren',
  ].every((key) => hasFiniteNumber(value, key));
}

export function isCatalogHealthLiveData(value: unknown): value is CatalogHealthLiveData {
  if (!isRecord(value)) return false;
  const report = value.report;
  const queueSnapshot = value.queueSnapshot;
  const auditPage = value.auditPage;
  const issueMoviePage = value.issueMoviePage;

  return (
    isRecord(report) &&
    hasFiniteNumber(report, 'activeIssues') &&
    hasFiniteNumber(report, 'duplicateGroups') &&
    typeof report.generatedAt === 'string' &&
    isNumberRecord(report.issueCounts) &&
    hasFiniteNumber(report, 'staleAfterDays') &&
    hasFiniteNumber(report, 'totalMovies') &&
    isRecord(queueSnapshot) &&
    typeof queueSnapshot.available === 'boolean' &&
    isCatalogMaintenanceQueueCounts(queueSnapshot.counts) &&
    hasFiniteNumber(queueSnapshot, 'openJobs') &&
    typeof queueSnapshot.queueName === 'string' &&
    typeof queueSnapshot.updatedAt === 'string' &&
    isCatalogRepairAuditPageSummary(auditPage) &&
    isCatalogHealthIssueMoviePage(issueMoviePage)
  );
}

export function parseCatalogHealthSnapshotMessage(
  value: string,
): CatalogHealthSnapshotMessage | null {
  try {
    const message = JSON.parse(value) as unknown;
    if (!isRecord(message) || !isCatalogHealthLiveData(message.data)) return null;

    const receivedAt = typeof message.receivedAt === 'string' ? message.receivedAt : null;
    const trigger =
      message.trigger === 'connected' ||
      message.trigger === 'queue-event' ||
      message.trigger === 'redis-unavailable'
        ? message.trigger
        : 'queue-event';
    const queueEvent = isRecord(message.queueEvent)
      ? {
          type: typeof message.queueEvent.type === 'string' ? message.queueEvent.type : undefined,
        }
      : undefined;

    return {
      data: message.data,
      queueEvent,
      receivedAt: receivedAt ?? message.data.report.generatedAt,
      trigger,
    };
  } catch {
    return null;
  }
}

import {
  getCatalogHealthReport,
  isCatalogHealthIssueKey,
  listCatalogHealthIssueMoviePage,
  listCatalogRepairAuditPage,
  MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE,
} from '@pop-choice/shared';

import { BackofficeErrorPage, CatalogHealthPage } from '../components/backoffice';
import { getCatalogMaintenanceQueueSnapshot } from '../catalogMaintenanceQueue';
import {
  DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
  DEFAULT_REPAIR_AUDIT_LIMIT,
  ensureBackofficeReady,
  logBackofficeError,
  MAX_CATALOG_ISSUE_PAGE_NUMBER,
  MAX_REPAIR_AUDIT_PAGE_NUMBER,
  parsePositiveIntParam,
} from '../lib/backoffice';
import { toCatalogHealthLiveData } from '../lib/catalogHealthLive';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParamValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  try {
    const config = await ensureBackofficeReady();
    const params = (await searchParams) ?? {};
    const repairStatus = getParamValue(params.repair)?.trim() ?? null;
    const selectedIssueKey = getParamValue(params.issue)?.trim() ?? null;
    const issuePageSize = parsePositiveIntParam(
      getParamValue(params.issuePageSize),
      DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
      { max: MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE },
    );
    const issuePageNumber = parsePositiveIntParam(getParamValue(params.issuePage), 1, {
      max: MAX_CATALOG_ISSUE_PAGE_NUMBER,
    });
    const auditPageSize = parsePositiveIntParam(
      getParamValue(params.auditPageSize),
      DEFAULT_REPAIR_AUDIT_LIMIT,
      { max: 100 },
    );
    const auditPageNumber = parsePositiveIntParam(getParamValue(params.auditPage), 1, {
      max: MAX_REPAIR_AUDIT_PAGE_NUMBER,
    });

    const [report, auditPage, issueMoviePage, queueSnapshot] = await Promise.all([
      getCatalogHealthReport({
        sampleLimit: config.catalogHealthSampleLimit,
        staleAfterDays: config.catalogHealthStaleDays,
      }),
      listCatalogRepairAuditPage({
        limit: auditPageSize,
        offset: (auditPageNumber - 1) * auditPageSize,
      }),
      selectedIssueKey && isCatalogHealthIssueKey(selectedIssueKey)
        ? listCatalogHealthIssueMoviePage({
            issueKey: selectedIssueKey,
            limit: issuePageSize,
            offset: (issuePageNumber - 1) * issuePageSize,
            staleAfterDays: config.catalogHealthStaleDays,
          })
        : Promise.resolve(null),
      getCatalogMaintenanceQueueSnapshot(config.redisUrl),
    ]);

    return (
      <CatalogHealthPage
        report={report}
        auditPage={auditPage}
        initialLiveData={toCatalogHealthLiveData({
          auditPage,
          issueMoviePage,
          queueSnapshot,
          report,
        })}
        issueMoviePage={issueMoviePage}
        bullBoardUrl={config.bullBoardUrl}
        repairStatus={repairStatus}
      />
    );
  } catch (error) {
    logBackofficeError('Failed to render catalog health report', error);
    return <BackofficeErrorPage error={error} />;
  }
}

import {
  getCatalogHealthReport,
  isCatalogHealthIssueKey,
  listCatalogHealthIssueMoviePage,
  listCatalogRepairAuditPage,
  MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE,
} from '@pop-choice/shared';
import type { BackofficeRuntimeConfig } from '@pop-choice/shared';

import { getCatalogMaintenanceQueueSnapshot } from '../catalogMaintenanceQueue';
import {
  DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
  DEFAULT_REPAIR_AUDIT_LIMIT,
  MAX_CATALOG_ISSUE_PAGE_NUMBER,
  MAX_REPAIR_AUDIT_PAGE_NUMBER,
  parsePositiveIntParam,
} from './backoffice';
import { toCatalogHealthLiveData } from './catalogHealthLive';

function getSearchParamValue(params: URLSearchParams, key: string): string | null {
  return params.get(key)?.trim() ?? null;
}

export async function readCatalogHealthLiveData({
  config,
  searchParams,
}: {
  config: BackofficeRuntimeConfig;
  searchParams: URLSearchParams;
}) {
  const selectedIssueKey = getSearchParamValue(searchParams, 'issue');
  const issuePageSize = parsePositiveIntParam(
    getSearchParamValue(searchParams, 'issuePageSize'),
    DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
    { max: MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE },
  );
  const issuePageNumber = parsePositiveIntParam(getSearchParamValue(searchParams, 'issuePage'), 1, {
    max: MAX_CATALOG_ISSUE_PAGE_NUMBER,
  });
  const auditPageSize = parsePositiveIntParam(
    getSearchParamValue(searchParams, 'auditPageSize'),
    DEFAULT_REPAIR_AUDIT_LIMIT,
    { max: 100 },
  );
  const auditPageNumber = parsePositiveIntParam(getSearchParamValue(searchParams, 'auditPage'), 1, {
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

  return toCatalogHealthLiveData({ auditPage, issueMoviePage, queueSnapshot, report });
}

import {
  getCatalogHealthReport,
  isCatalogHealthIssueKey,
  listCatalogHealthIssueMoviePage,
  listCatalogRepairAuditPage,
  MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE,
} from '@pop-choice/shared';
import { NextResponse } from 'next/server';

import { getCatalogMaintenanceQueueSnapshot } from '../../../catalogMaintenanceQueue';
import {
  DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
  DEFAULT_REPAIR_AUDIT_LIMIT,
  ensureBackofficeReady,
  logBackofficeError,
  MAX_CATALOG_ISSUE_PAGE_NUMBER,
  MAX_REPAIR_AUDIT_PAGE_NUMBER,
  parsePositiveIntParam,
} from '../../../lib/backoffice';
import { toCatalogHealthLiveData } from '../../../lib/catalogHealthLive';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const config = await ensureBackofficeReady();
    const params = new URL(request.url).searchParams;
    const selectedIssueKey = params.get('issue')?.trim() ?? null;
    const issuePageSize = parsePositiveIntParam(
      params.get('issuePageSize'),
      DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
      { max: MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE },
    );
    const issuePageNumber = parsePositiveIntParam(params.get('issuePage'), 1, {
      max: MAX_CATALOG_ISSUE_PAGE_NUMBER,
    });
    const auditPageSize = parsePositiveIntParam(
      params.get('auditPageSize'),
      DEFAULT_REPAIR_AUDIT_LIMIT,
      { max: 100 },
    );
    const auditPageNumber = parsePositiveIntParam(params.get('auditPage'), 1, {
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

    return NextResponse.json(
      toCatalogHealthLiveData({ auditPage, issueMoviePage, queueSnapshot, report }),
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    logBackofficeError('Failed to read live catalog health state', error);
    return NextResponse.json({ error: 'Failed to read catalog health state.' }, { status: 500 });
  }
}

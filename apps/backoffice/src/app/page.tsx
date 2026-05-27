import { getCatalogHealthReport, listCatalogRepairAudit } from '@pop-choice/shared';

import { BackofficeErrorPage, CatalogHealthPage } from '../components/backoffice';
import {
  DEFAULT_REPAIR_AUDIT_LIMIT,
  ensureBackofficeReady,
  logBackofficeError,
} from '../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  try {
    const config = await ensureBackofficeReady();
    const params = (await searchParams) ?? {};
    const repairStatus = typeof params.repair === 'string' ? params.repair.trim() : null;
    const [report, audit] = await Promise.all([
      getCatalogHealthReport({
        sampleLimit: config.catalogHealthSampleLimit,
        staleAfterDays: config.catalogHealthStaleDays,
      }),
      listCatalogRepairAudit(DEFAULT_REPAIR_AUDIT_LIMIT),
    ]);

    return <CatalogHealthPage report={report} audit={audit} repairStatus={repairStatus} />;
  } catch (error) {
    logBackofficeError('Failed to render catalog health report', error);
    return <BackofficeErrorPage error={error} />;
  }
}

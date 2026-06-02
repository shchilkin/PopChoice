import { listCatalogRepairBatchPage } from '@pop-choice/shared';

import { BackofficeErrorPage, RepairBatchListPage } from '../../components/backoffice';
import {
  ensureBackofficeReady,
  logBackofficeError,
  parseRepairBatchListParams,
} from '../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RepairBatchesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RepairBatchesPage({ searchParams }: RepairBatchesPageProps) {
  try {
    await ensureBackofficeReady();
    const params = (await searchParams) ?? {};
    const pagination = parseRepairBatchListParams(params);
    const batchPage = await listCatalogRepairBatchPage({
      limit: pagination.limit,
      offset: pagination.offset,
      sort: pagination.sort,
      status: pagination.status,
    });

    return (
      <RepairBatchListPage
        batchPage={batchPage}
        selectedSort={pagination.sort}
        selectedStatus={pagination.status}
      />
    );
  } catch (error) {
    logBackofficeError('Failed to render catalog repair batch history', error);
    return (
      <BackofficeErrorPage active="repair-batches" error={error} retryHref="/repair-batches" />
    );
  }
}

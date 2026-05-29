import { getCatalogRepairBatchDetail } from '@pop-choice/shared';

import {
  BackofficeErrorPage,
  RepairBatchDetailPage,
  RepairBatchNotFoundPage,
} from '../../../components/backoffice';
import {
  ensureBackofficeReady,
  logBackofficeError,
  parseRepairBatchItemParams,
} from '../../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RepairBatchDetailProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RepairBatchDetail({ params, searchParams }: RepairBatchDetailProps) {
  const { id } = await params;

  try {
    await ensureBackofficeReady();
    const query = (await searchParams) ?? {};
    const pagination = parseRepairBatchItemParams(query);
    const detail = await getCatalogRepairBatchDetail(id, {
      limit: pagination.limit,
      offset: pagination.offset,
    });

    if (!detail) {
      return <RepairBatchNotFoundPage batchId={id} />;
    }

    return <RepairBatchDetailPage detail={detail} />;
  } catch (error) {
    logBackofficeError('Failed to render catalog repair batch detail', error);
    return (
      <BackofficeErrorPage
        active="repair-batches"
        error={error}
        retryHref={`/repair-batches/${encodeURIComponent(id)}`}
      />
    );
  }
}

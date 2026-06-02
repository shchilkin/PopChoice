import type {
  CatalogRepairBatch,
  CatalogRepairBatchItem,
  CatalogRepairBatchItemSort,
  CatalogRepairBatchItemStatusFilter,
  CatalogRepairBatchSort,
  CatalogRepairBatchStatusFilter,
} from '@pop-choice/shared';

export function getRepairBatchProgress(batch: CatalogRepairBatch): string {
  const finished =
    batch.completedCount +
    batch.failedCount +
    batch.skippedCount +
    batch.dedupedCount +
    batch.unavailableCount;
  const attempted = Math.max(batch.attemptedCount, 0);
  if (attempted === 0) return 'No items attempted';
  return `${finished}/${attempted} finished`;
}

export const REPAIR_BATCH_ITEM_STATUS_FILTERS: Array<{
  label: string;
  status: CatalogRepairBatchItemStatusFilter;
}> = [
  { label: 'Needs review', status: 'needs_review' },
  { label: 'Failed', status: 'failed' },
  { label: 'In progress', status: 'in_progress' },
  { label: 'Still flagged', status: 'completed_unresolved' },
  { label: 'All', status: 'all' },
];

export const REPAIR_BATCH_ITEM_SORT_FILTERS: Array<{
  label: string;
  sort: CatalogRepairBatchItemSort;
}> = [
  { label: 'Needs review', sort: 'needs_review' },
  { label: 'Newest', sort: 'newest' },
  { label: 'Original order', sort: 'oldest' },
];

export function buildRepairBatchListHref({
  page = 1,
  pageSize,
  sort,
  status,
}: {
  page?: number;
  pageSize: number;
  sort: CatalogRepairBatchSort;
  status: CatalogRepairBatchStatusFilter;
}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (status !== 'all') params.set('status', status);
  if (sort !== 'newest') params.set('sort', sort);
  return `/repair-batches?${params.toString()}`;
}

export function buildRepairBatchItemPageHref({
  batchId,
  page,
  pageSize,
  sort,
  status,
}: {
  batchId: string;
  page: number;
  pageSize: number;
  sort: CatalogRepairBatchItemSort;
  status: CatalogRepairBatchItemStatusFilter;
}) {
  const params = new URLSearchParams();
  params.set('itemPage', String(page));
  params.set('itemPageSize', String(pageSize));
  if (status !== 'needs_review') params.set('itemStatus', status);
  if (sort !== 'needs_review') params.set('itemSort', sort);
  return `/repair-batches/${encodeURIComponent(batchId)}?${params.toString()}`;
}

export function snapshotValue(
  snapshot: Record<string, unknown>,
  key: string,
): string | number | null | undefined {
  const value = snapshot[key];
  if (typeof value === 'string' || typeof value === 'number' || value === null) return value;
  return undefined;
}

export function issueHref(issueKey: string) {
  return `/#issue-${encodeURIComponent(issueKey)}`;
}

export function movieHref(movieId: string) {
  return `/movies/${encodeURIComponent(movieId)}`;
}

export function truncateText(value: string | null | undefined, length = 96): string {
  if (!value) return '-';
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

export function resultValue(result: Record<string, unknown>, key: string): string | number | null {
  const value = result[key];
  return typeof value === 'string' || typeof value === 'number' || value === null ? value : null;
}

export function repairItemPressureLabel(item: Pick<CatalogRepairBatchItem, 'status'>): string {
  if (item.status === 'failed' || item.status === 'enqueue_failed') return 'Retry pressure: high';
  if (item.status === 'unavailable') return 'Retry pressure: Redis';
  if (item.status === 'completed_unresolved') return 'Retry pressure: inspect';
  if (item.status === 'pending' || item.status === 'queued' || item.status === 'processing') {
    return 'Retry pressure: wait';
  }
  return 'Retry pressure: low';
}

export function repairBatchRecoveryHint(batch: CatalogRepairBatch): string {
  if (batch.failedCount > 0 || batch.unavailableCount > 0) {
    return 'Inspect failed/unavailable items first, confirm Redis and worker logs, then retry only affected movies.';
  }
  if (batch.status === 'partial') {
    return 'Partial batch: review accepted, already queued, and unresolved items before adding more work.';
  }
  if (batch.status === 'processing' || batch.status === 'queued' || batch.status === 'enqueueing') {
    return 'Workers still have open work. Wait for queue events before retrying the same issue.';
  }
  const terminalCount =
    batch.completedCount +
    batch.failedCount +
    batch.skippedCount +
    batch.dedupedCount +
    batch.unavailableCount;
  if (terminalCount < batch.attemptedCount) {
    return 'Some items did not reach a resolved terminal state. Filter needs review.';
  }
  return 'No immediate recovery action. Verify the catalog-health issue cleared.';
}

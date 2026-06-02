import type { CatalogRepairBatchStatus, CatalogRepairItemStatus } from '@pop-choice/shared';

export function repairStatusLabel(
  status: CatalogRepairBatchStatus | CatalogRepairItemStatus,
): string {
  const labels: Record<CatalogRepairBatchStatus | CatalogRepairItemStatus, string> = {
    completed: 'Completed, verify',
    completed_resolved: 'Issue cleared',
    completed_unresolved: 'Still flagged',
    deduped: 'Already queued',
    empty: 'Empty',
    enqueue_failed: 'Enqueue failed',
    enqueueing: 'Enqueueing',
    failed: 'Failed',
    partial: 'Partial',
    pending: 'Pending',
    processing: 'Processing',
    queued: 'Accepted',
    skipped: 'Skipped',
    unavailable: 'Unavailable',
  };

  return labels[status];
}

export function RepairStatusBadge({
  status,
}: {
  status: CatalogRepairBatchStatus | CatalogRepairItemStatus;
}) {
  return (
    <span className={`status repair-status repair-${status}`}>{repairStatusLabel(status)}</span>
  );
}

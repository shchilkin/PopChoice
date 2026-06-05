import { catalogRepairMessage } from '../../lib/backoffice';

type CatalogRepairFlashStatus = Parameters<typeof catalogRepairMessage>[0];

const BULK_REPAIR_STATUS_MAP = new Map<string, CatalogRepairFlashStatus>([
  ['bulk-queued', 'queued'],
  ['bulk-orchestration-queued', 'orchestration_queued'],
  ['bulk-partial', 'partial'],
]);

const REPAIR_FLASH_STATUSES = new Set<CatalogRepairFlashStatus>([
  'queued',
  'deduped',
  'unavailable',
  'failed',
  'empty',
  'partial',
  'orchestration_queued',
]);

export function normalizeRepairFlashStatus(
  repairStatus: string | null,
): CatalogRepairFlashStatus | null {
  if (!repairStatus) return null;

  const bulkStatus = BULK_REPAIR_STATUS_MAP.get(repairStatus);
  if (bulkStatus) return bulkStatus;

  return REPAIR_FLASH_STATUSES.has(repairStatus as CatalogRepairFlashStatus)
    ? (repairStatus as CatalogRepairFlashStatus)
    : null;
}

export function repairFlashMessage(repairStatus: string | null): string | null {
  const mappedStatus = normalizeRepairFlashStatus(repairStatus);
  return mappedStatus ? catalogRepairMessage(mappedStatus) : null;
}

export function repairFlashTone(repairStatus: string | null): 'accepted' | 'warn' {
  const mappedStatus = normalizeRepairFlashStatus(repairStatus);
  return mappedStatus === 'queued' ||
    mappedStatus === 'deduped' ||
    mappedStatus === 'orchestration_queued'
    ? 'accepted'
    : 'warn';
}

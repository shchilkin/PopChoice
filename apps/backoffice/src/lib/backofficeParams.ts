import {
  isTMDBMatchReviewReason,
  isTMDBMatchReviewSort,
  isTMDBMatchReviewStatus,
} from '@pop-choice/shared';
import type {
  CatalogRepairBatchItemSort,
  CatalogRepairBatchItemStatusFilter,
  CatalogRepairBatchSort,
  CatalogRepairBatchStatusFilter,
  TMDBMatchReviewReason,
  TMDBMatchReviewSort,
  TMDBMatchReviewStatus,
} from '@pop-choice/shared';

import {
  isCatalogMaintenanceQueueJobState,
  type CatalogMaintenanceQueueJobState,
} from '../catalogMaintenanceQueue';

export const DEFAULT_CATALOG_ISSUE_PAGE_SIZE = 25;
export const MAX_CATALOG_ISSUE_PAGE_NUMBER = 4_001;
export const DEFAULT_REPAIR_AUDIT_LIMIT = 25;
export const MAX_REPAIR_AUDIT_PAGE_NUMBER = 4_001;
export const DEFAULT_REVIEW_PAGE_SIZE = 25;
export const MAX_REVIEW_PAGE_SIZE = 100;
export const DEFAULT_BULK_REPAIR_LIMIT = 25;
export const MAX_BULK_REPAIR_LIMIT = DEFAULT_BULK_REPAIR_LIMIT;
export const MAX_ASYNC_BULK_REPAIR_LIMIT = 1_000;
export const DEFAULT_ASYNC_BULK_REPAIR_CHUNK_SIZE = DEFAULT_BULK_REPAIR_LIMIT;
export const DEFAULT_REPAIR_BATCH_PAGE_SIZE = 25;
export const DEFAULT_REPAIR_BATCH_ITEM_PAGE_SIZE = 100;
export const MAX_REPAIR_BATCH_PAGE_SIZE = 100;
export const MAX_REPAIR_BATCH_PAGE_NUMBER = 4_001;
export const DEFAULT_QUEUE_JOB_PAGE_SIZE = 25;
export const MAX_QUEUE_JOB_PAGE_SIZE = 50;
export const MAX_QUEUE_JOB_PAGE_NUMBER = 4_001;

const REPAIR_BATCH_STATUS_FILTERS = new Set<CatalogRepairBatchStatusFilter>([
  'all',
  'empty',
  'enqueueing',
  'failed',
  'partial',
  'processing',
  'queued',
  'completed',
  'unavailable',
]);

const REPAIR_BATCH_SORTS = new Set<CatalogRepairBatchSort>(['newest', 'updated', 'needs_review']);

const REPAIR_BATCH_ITEM_STATUS_FILTERS = new Set<CatalogRepairBatchItemStatusFilter>([
  'all',
  'completed',
  'completed_resolved',
  'completed_unresolved',
  'deduped',
  'enqueue_failed',
  'failed',
  'in_progress',
  'needs_review',
  'pending',
  'processing',
  'queued',
  'skipped',
  'unavailable',
]);

const REPAIR_BATCH_ITEM_SORTS = new Set<CatalogRepairBatchItemSort>([
  'oldest',
  'newest',
  'needs_review',
]);

export function parseTMDBReviewStatus(value: string | null): TMDBMatchReviewStatus | 'all' {
  if (value === 'all') return 'all';
  return value && isTMDBMatchReviewStatus(value) ? value : 'open';
}

export function parseTMDBReviewReason(value: string | null): TMDBMatchReviewReason | 'all' {
  if (value === 'all') return 'all';
  return value && isTMDBMatchReviewReason(value) ? value : 'all';
}

export function parseTMDBReviewSort(value: string | null): TMDBMatchReviewSort {
  return value && isTMDBMatchReviewSort(value) ? value : 'highest_risk';
}

export function parsePositiveIntParam(
  value: string | null,
  fallback: number,
  { max }: { max: number },
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function parseRepairBatchListParams(params: Record<string, string | string[] | undefined>): {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
  status: CatalogRepairBatchStatusFilter;
  sort: CatalogRepairBatchSort;
} {
  const pageSize = parsePositiveIntParam(
    firstSearchParam(params.pageSize),
    DEFAULT_REPAIR_BATCH_PAGE_SIZE,
    { max: MAX_REPAIR_BATCH_PAGE_SIZE },
  );
  const page = parsePositiveIntParam(firstSearchParam(params.page), 1, {
    max: MAX_REPAIR_BATCH_PAGE_NUMBER,
  });
  const statusValue = firstSearchParam(params.status);
  const sortValue = firstSearchParam(params.sort);
  const status =
    statusValue && REPAIR_BATCH_STATUS_FILTERS.has(statusValue as CatalogRepairBatchStatusFilter)
      ? (statusValue as CatalogRepairBatchStatusFilter)
      : 'all';
  const sort =
    sortValue && REPAIR_BATCH_SORTS.has(sortValue as CatalogRepairBatchSort)
      ? (sortValue as CatalogRepairBatchSort)
      : 'newest';

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    status,
    sort,
  };
}

export function parseRepairBatchItemParams(params: Record<string, string | string[] | undefined>): {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
  status: CatalogRepairBatchItemStatusFilter;
  sort: CatalogRepairBatchItemSort;
} {
  const pageSize = parsePositiveIntParam(
    firstSearchParam(params.itemPageSize),
    DEFAULT_REPAIR_BATCH_ITEM_PAGE_SIZE,
    { max: MAX_REPAIR_BATCH_PAGE_SIZE },
  );
  const page = parsePositiveIntParam(firstSearchParam(params.itemPage), 1, {
    max: MAX_REPAIR_BATCH_PAGE_NUMBER,
  });
  const statusValue = firstSearchParam(params.itemStatus);
  const sortValue = firstSearchParam(params.itemSort);
  const status =
    statusValue &&
    REPAIR_BATCH_ITEM_STATUS_FILTERS.has(statusValue as CatalogRepairBatchItemStatusFilter)
      ? (statusValue as CatalogRepairBatchItemStatusFilter)
      : 'needs_review';
  const sort =
    sortValue && REPAIR_BATCH_ITEM_SORTS.has(sortValue as CatalogRepairBatchItemSort)
      ? (sortValue as CatalogRepairBatchItemSort)
      : 'needs_review';

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    status,
    sort,
  };
}

export function parseCatalogMaintenanceQueueParams(
  params: Record<string, string | string[] | undefined>,
): {
  state: CatalogMaintenanceQueueJobState;
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
} {
  const stateValue = firstSearchParam(params.state);
  const pageSize = parsePositiveIntParam(
    firstSearchParam(params.pageSize),
    DEFAULT_QUEUE_JOB_PAGE_SIZE,
    {
      max: MAX_QUEUE_JOB_PAGE_SIZE,
    },
  );
  const page = parsePositiveIntParam(firstSearchParam(params.page), 1, {
    max: MAX_QUEUE_JOB_PAGE_NUMBER,
  });

  return {
    state: isCatalogMaintenanceQueueJobState(stateValue) ? stateValue : 'waiting',
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

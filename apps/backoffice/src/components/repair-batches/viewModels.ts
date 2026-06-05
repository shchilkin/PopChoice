import type { CatalogRepairBatchItem } from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import {
  issueHref,
  movieHref,
  repairItemPressureLabel,
  resultValue,
  snapshotValue,
  truncateText,
} from './helpers';

const RETRIABLE_ITEM_STATUSES = new Set<CatalogRepairBatchItem['status']>([
  'failed',
  'enqueue_failed',
  'unavailable',
]);

export type RepairBatchItemRowView = {
  action:
    | {
        batchId: string;
        itemId: string;
        returnTo: string;
        type: 'retry';
      }
    | { type: 'inspect' };
  attemptsLabel: string;
  errorLabel: string;
  errorTitle?: string;
  id: string;
  issueHref: string;
  issueKey: string;
  jobIdLabel: string;
  jobNameLabel: string;
  languageLabel: string;
  movieHref: string;
  movieLabel: string;
  movieMeta: string;
  pressureLabel: string;
  queueNameLabel: string;
  reasonLabel: string;
  status: CatalogRepairBatchItem['status'];
  updatedAtLabel: string;
};

export function canRetryRepairBatchItem(item: Pick<CatalogRepairBatchItem, 'status'>): boolean {
  return RETRIABLE_ITEM_STATUSES.has(item.status);
}

export function getRepairBatchItemRowView(item: CatalogRepairBatchItem): RepairBatchItemRowView {
  const attempts =
    resultValue(item.result, 'attemptsMade') ??
    resultValue(item.result, 'attempts') ??
    resultValue(item.result, 'attempt');
  const movieName = snapshotValue(item.movieSnapshot, 'name');
  const movieYear = snapshotValue(item.movieSnapshot, 'year');

  return {
    action: getRepairBatchItemActionView(item),
    attemptsLabel: attempts === null ? 'attempts unknown' : `${attempts} attempts`,
    errorLabel: truncateText(item.errorMessage),
    errorTitle: item.errorMessage ?? undefined,
    id: item.id,
    issueHref: issueHref(item.issueKey),
    issueKey: item.issueKey,
    jobIdLabel: item.jobId ?? '-',
    jobNameLabel: item.jobName ?? 'job unknown',
    languageLabel: item.language ?? '-',
    movieHref: movieHref(item.movieId),
    movieLabel:
      movieName === null || movieName === undefined ? `Movie ${item.movieId}` : String(movieName),
    movieMeta: getRepairBatchItemMovieMeta(item.movieId, movieYear),
    pressureLabel: repairItemPressureLabel(item),
    queueNameLabel: item.queueName ?? 'queue unknown',
    reasonLabel: item.reason ?? '-',
    status: item.status,
    updatedAtLabel: formatBackofficeDateTime(item.updatedAt),
  };
}

function getRepairBatchItemActionView(
  item: CatalogRepairBatchItem,
): RepairBatchItemRowView['action'] {
  if (!canRetryRepairBatchItem(item)) return { type: 'inspect' };

  return {
    batchId: item.batchId,
    itemId: item.id,
    returnTo: `/repair-batches/${encodeURIComponent(item.batchId)}?status=needs_review`,
    type: 'retry',
  };
}

function getRepairBatchItemMovieMeta(
  movieId: string,
  year: string | number | null | undefined,
): string {
  const yearLabel = year === null || year === undefined ? '' : ` · ${year}`;
  return `#${movieId}${yearLabel}`;
}

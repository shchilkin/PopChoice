import {
  createCatalogRepairBatch,
  createCatalogRepairBatchItem,
  getCatalogRepairMovieSnapshot,
  recordCatalogRepairAction,
  refreshCatalogRepairBatchCounts,
  type BackofficeRuntimeConfig,
  updateCatalogRepairBatchItemEnqueueResult,
} from '@pop-choice/shared';

import { enqueueCatalogBackfillMovieFromBackoffice } from '../catalogMaintenanceQueue';

import { backofficeActionError, parseOperatorActor } from './backofficeRuntime';
import {
  getBackfillReasonForIssue,
  parseCatalogIssueKey,
  parseMovieId,
} from './catalogRepairActionHelpers';

import type { CatalogRepairActionResult } from './catalogRepairActions';

export async function performSingleCatalogRepairAction({
  config,
  formData,
  headers,
}: {
  config: BackofficeRuntimeConfig;
  formData: FormData;
  headers: Headers;
}): Promise<CatalogRepairActionResult> {
  const movieId = parseMovieId(formData.get('movie_id'));
  const issueKey = parseCatalogIssueKey(formData.get('issue_key'));
  const snapshot = await getCatalogRepairMovieSnapshot(movieId);

  if (!snapshot) {
    throw backofficeActionError('Movie not found.', 404);
  }

  const actor = parseOperatorActor(headers);
  const note = typeof formData.get('note') === 'string' ? String(formData.get('note')) : undefined;
  const reason = getBackfillReasonForIssue(issueKey);
  const batch = await createCatalogRepairBatch({
    action: 'enqueue_backfill',
    actor,
    issueKey,
    targetType: 'movie',
    targetId: movieId,
    requestedLimit: 1,
    totalCandidates: 1,
    attemptedCount: 1,
    note,
    previousState: { ...snapshot },
  });
  const batchItem = await createCatalogRepairBatchItem({
    batchId: batch.id,
    issueKey,
    language: config.tmdbLanguage,
    movieId,
    movieSnapshot: { ...snapshot },
    reason,
  });
  const job = await enqueueCatalogBackfillMovieFromBackoffice(
    {
      movieId,
      reason,
      language: config.tmdbLanguage,
      repairBatchId: batch.id,
      repairBatchItemId: batchItem.id,
    },
    config.redisUrl,
  );

  await updateCatalogRepairBatchItemEnqueueResult({
    itemId: batchItem.id,
    status: job?.status ?? 'unavailable',
    queueName: job?.queueName ?? 'catalog-maintenance',
    jobName: job?.jobName,
    jobId: job?.jobId,
    language: job?.language ?? config.tmdbLanguage,
    result: job ? { ...job } : { status: 'queue_unavailable', queueName: 'catalog-maintenance' },
  });
  await refreshCatalogRepairBatchCounts(batch.id);
  await recordCatalogRepairAction({
    action: 'enqueue_backfill',
    actor,
    issueKey,
    targetType: 'movie',
    targetId: movieId,
    note,
    previousState: { ...snapshot },
    result: job ? { ...job } : { status: 'queue_unavailable', queueName: 'catalog-maintenance' },
    repairBatchId: batch.id,
    repairBatchItemId: batchItem.id,
  });

  return {
    mode: 'single',
    status: job?.status ?? 'unavailable',
    issueKey,
    movieId,
    job,
  };
}

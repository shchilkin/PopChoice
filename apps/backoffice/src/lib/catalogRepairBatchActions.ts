import {
  createCatalogRepairBatchItem,
  getCatalogRepairBatchItem,
  logger,
  recordCatalogRepairAction,
  refreshCatalogRepairBatchCounts,
  updateCatalogRepairBatchItemEnqueueResult,
  type CatalogRepairBatchItem,
  type CatalogMovieSample,
} from '@pop-choice/shared';

import { enqueueCatalogBackfillMovieFromBackoffice } from '../catalogMaintenanceQueue';
import { logBackofficeAction } from './backofficeActionLog';
import { recordBackofficeRepairEnqueue } from './backofficeMetrics';
import { getBackfillReasonForIssue } from './catalogRepairActionHelpers';
import {
  backofficeActionError,
  ensureBackofficeReady,
  parseOperatorActor,
} from './backofficeRuntime';

export type CatalogBulkRepairSummary = {
  batchId?: string;
  issueKey: string;
  totalCandidates: number;
  attempted: number;
  queued: number;
  deduped: number;
  failed: number;
  unavailable: number;
  limit: number;
  movieIds: string[];
  jobs: Array<{
    movieId: string;
    itemId?: string;
    jobId?: string;
    status: 'queued' | 'deduped' | 'failed' | 'unavailable';
  }>;
};

export type CatalogRepairBatchItemRetryResult = {
  batchId: string;
  issueKey: string;
  item: CatalogRepairBatchItem;
  job: Awaited<ReturnType<typeof enqueueCatalogBackfillMovieFromBackoffice>>;
  status: 'queued' | 'deduped' | 'unavailable' | 'failed';
};

const RETRIABLE_REPAIR_ITEM_STATUSES = new Set(['failed', 'enqueue_failed', 'unavailable']);

export function createCatalogBulkRepairSummary({
  issueKey,
  limit,
  movies,
  totalCandidates,
}: {
  issueKey: string;
  limit: number;
  movies?: CatalogMovieSample[];
  totalCandidates: number;
}): CatalogBulkRepairSummary {
  return {
    issueKey,
    totalCandidates,
    attempted: movies?.length ?? 0,
    queued: 0,
    deduped: 0,
    failed: 0,
    unavailable: 0,
    limit,
    movieIds: movies?.map((movie) => movie.id) ?? [],
    jobs: [],
  };
}

export async function enqueueCatalogRepairBatchItems({
  batchId,
  issueKey,
  language,
  movies,
  redisUrl,
  summary,
}: {
  batchId: string;
  issueKey: string;
  language: string;
  movies: CatalogMovieSample[];
  redisUrl?: string;
  summary: CatalogBulkRepairSummary;
}): Promise<void> {
  const reason = getBackfillReasonForIssue(issueKey);

  for (const movie of movies) {
    let itemId: string | undefined;

    try {
      const item = await createCatalogRepairBatchItem({
        batchId,
        movieId: movie.id,
        issueKey,
        movieSnapshot: { ...movie },
        reason,
        language,
      });
      itemId = item.id;

      const job = await enqueueCatalogBackfillMovieFromBackoffice(
        {
          movieId: movie.id,
          reason,
          language,
          repairBatchId: batchId,
          repairBatchItemId: item.id,
        },
        redisUrl,
      );

      if (!job) {
        await updateCatalogRepairBatchItemEnqueueResult({
          itemId: item.id,
          status: 'unavailable',
          errorMessage: 'REDIS_URL is unavailable or the catalog-maintenance queue is disabled.',
          result: { status: 'queue_unavailable', queueName: 'catalog-maintenance' },
        });
        summary.unavailable += 1;
        summary.jobs.push({ movieId: movie.id, itemId: item.id, status: 'unavailable' });
        continue;
      }

      await updateCatalogRepairBatchItemEnqueueResult({
        itemId: item.id,
        status: job.status,
        queueName: job.queueName,
        jobName: job.jobName,
        jobId: job.jobId,
        language: job.language,
        result: { ...job },
      });
      summary[job.status] += 1;
      summary.jobs.push({
        movieId: movie.id,
        itemId: item.id,
        jobId: job.jobId,
        status: job.status,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (itemId) {
        try {
          await updateCatalogRepairBatchItemEnqueueResult({
            itemId,
            status: 'enqueue_failed',
            errorMessage,
            result: { status: 'enqueue_failed' },
          });
        } catch (persistError) {
          logger.error('Failed to persist catalog repair batch enqueue failure', {
            err: persistError,
            itemId,
            issueKey,
            movieId: movie.id,
            originalError: errorMessage,
          });
        }
      }
      summary.failed += 1;
      summary.jobs.push({ movieId: movie.id, itemId, status: 'failed' });
      logger.error('Failed to enqueue catalog repair job from bulk action', {
        err: error,
        issueKey,
        movieId: movie.id,
      });
    }
  }
}

function parseRepairBatchItemId(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw backofficeActionError('Repair batch item id is required.');
  }

  return value.trim();
}

function parseOptionalRepairBatchId(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export async function retryCatalogRepairBatchItem(
  formData: FormData,
  headers: Headers,
): Promise<CatalogRepairBatchItemRetryResult> {
  const config = await ensureBackofficeReady();
  const startedAt = Date.now();
  if (formData.get('action') !== 'retry_item') {
    throw backofficeActionError('Unsupported repair batch action.');
  }

  const itemId = parseRepairBatchItemId(formData.get('item_id'));
  const expectedBatchId = parseOptionalRepairBatchId(formData.get('batch_id'));
  const item = await getCatalogRepairBatchItem(itemId);

  if (!item) {
    throw backofficeActionError('Repair batch item not found.', 404);
  }

  if (expectedBatchId && expectedBatchId !== item.batchId) {
    throw backofficeActionError('Repair batch item does not belong to this batch.', 409);
  }

  if (!RETRIABLE_REPAIR_ITEM_STATUSES.has(item.status)) {
    throw backofficeActionError(
      'Only failed, enqueue-failed, or unavailable items can be retried.',
    );
  }

  const actor = parseOperatorActor(headers);
  const reason = getBackfillReasonForIssue(item.issueKey);
  const language = item.language ?? config.tmdbLanguage;
  const previousState = { repairBatchItem: item };
  const note = typeof formData.get('note') === 'string' ? String(formData.get('note')) : undefined;

  try {
    const job = await enqueueCatalogBackfillMovieFromBackoffice(
      {
        movieId: item.movieId,
        reason,
        language,
        repairBatchId: item.batchId,
        repairBatchItemId: item.id,
      },
      config.redisUrl,
    );

    const updatedItem = job
      ? await updateCatalogRepairBatchItemEnqueueResult({
          itemId: item.id,
          status: job.status,
          queueName: job.queueName,
          jobName: job.jobName,
          jobId: job.jobId,
          language: job.language,
          result: { ...job, retry: true },
        })
      : await updateCatalogRepairBatchItemEnqueueResult({
          itemId: item.id,
          status: 'unavailable',
          errorMessage: 'REDIS_URL is unavailable or the catalog-maintenance queue is disabled.',
          result: { status: 'queue_unavailable', queueName: 'catalog-maintenance', retry: true },
        });

    await refreshCatalogRepairBatchCounts(item.batchId);
    await recordCatalogRepairAction({
      action: 'enqueue_backfill',
      actor,
      issueKey: item.issueKey,
      targetType: 'movie',
      targetId: item.movieId,
      note,
      previousState,
      result: job
        ? { ...job, retry: true }
        : { status: 'queue_unavailable', queueName: 'catalog-maintenance', retry: true },
      repairBatchId: item.batchId,
      repairBatchItemId: item.id,
    });
    logBackofficeAction({
      action: 'retry_item',
      actor,
      durationMs: Date.now() - startedAt,
      issueKey: item.issueKey,
      repairBatchId: item.batchId,
      repairBatchItemId: item.id,
      resultStatus: job ? job.status : 'unavailable',
      targetId: item.movieId,
      targetType: 'movie',
    });
    recordBackofficeRepairEnqueue({
      mode: 'single',
      status: job ? job.status : 'unavailable',
    });

    return {
      batchId: item.batchId,
      issueKey: item.issueKey,
      item: updatedItem,
      job,
      status: job ? job.status : 'unavailable',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const updatedItem = await updateCatalogRepairBatchItemEnqueueResult({
      itemId: item.id,
      status: 'enqueue_failed',
      errorMessage,
      result: { status: 'enqueue_failed', retry: true },
    });

    await refreshCatalogRepairBatchCounts(item.batchId);
    await recordCatalogRepairAction({
      action: 'enqueue_backfill',
      actor,
      issueKey: item.issueKey,
      targetType: 'movie',
      targetId: item.movieId,
      note,
      previousState,
      result: { status: 'enqueue_failed', errorMessage, retry: true },
      repairBatchId: item.batchId,
      repairBatchItemId: item.id,
    });

    logger.error('Failed to retry catalog repair batch item', {
      err: error,
      itemId: item.id,
      issueKey: item.issueKey,
      movieId: item.movieId,
    });
    logBackofficeAction({
      action: 'retry_item',
      actor,
      durationMs: Date.now() - startedAt,
      issueKey: item.issueKey,
      repairBatchId: item.batchId,
      repairBatchItemId: item.id,
      resultStatus: 'failed',
      targetId: item.movieId,
      targetType: 'movie',
    });
    recordBackofficeRepairEnqueue({ mode: 'single', status: 'failed' });

    return {
      batchId: item.batchId,
      issueKey: item.issueKey,
      item: updatedItem,
      job: null,
      status: 'failed',
    };
  }
}

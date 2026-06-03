import {
  createCatalogRepairBatchItem,
  logger,
  updateCatalogRepairBatchItemEnqueueResult,
  type CatalogMovieSample,
} from '@pop-choice/shared';

import { enqueueCatalogBackfillMovieFromBackoffice } from '../catalogMaintenanceQueue';
import { getBackfillReasonForIssue } from './catalogRepairActionHelpers';

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

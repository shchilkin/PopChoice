import {
  createCatalogRepairBatch,
  createCatalogRepairBatchItem,
  getCatalogRepairMovieSnapshot,
  listCatalogHealthIssueMoviePage,
  logger,
  recordCatalogRepairAction,
  refreshCatalogRepairBatchCounts,
  updateCatalogRepairBatchOrchestrationResult,
  updateCatalogRepairBatchItemEnqueueResult,
} from '@pop-choice/shared';

import {
  enqueueCatalogBackfillMovieFromBackoffice,
  enqueueCatalogRepairBatchFromBackoffice,
} from '../catalogMaintenanceQueue';
import {
  catalogRepairMessage,
  getAsyncBulkRepairPageSize,
  getBackfillReasonForIssue,
  getBulkRepairStatus,
  parseAsyncBulkRepairLimit,
  parseBulkRepairLimit,
  parseCatalogIssueKey,
  parseMovieId,
  REPAIRABLE_CATALOG_ISSUE_KEYS,
  type CatalogRepairActionStatus,
} from './catalogRepairActionHelpers';
import {
  backofficeActionError,
  ensureBackofficeReady,
  parseOperatorActor,
} from './backofficeRuntime';

export { catalogRepairMessage, REPAIRABLE_CATALOG_ISSUE_KEYS };

export type CatalogRepairActionResult =
  | {
      mode: 'single';
      status: 'queued' | 'unavailable';
      issueKey: string;
      movieId: string;
      job: Awaited<ReturnType<typeof enqueueCatalogBackfillMovieFromBackoffice>>;
    }
  | {
      mode: 'bulk';
      status: CatalogRepairActionStatus;
      issueKey: string;
      summary: CatalogBulkRepairSummary;
    };

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

async function performAsyncBulkCatalogRepairAction(
  formData: FormData,
  headers: Headers,
): Promise<CatalogRepairActionResult> {
  const config = await ensureBackofficeReady();
  const issueKey = parseCatalogIssueKey(formData.get('issue_key'));
  const actor = parseOperatorActor(headers);
  const note = typeof formData.get('note') === 'string' ? String(formData.get('note')) : undefined;
  const countPage = await listCatalogHealthIssueMoviePage({
    issueKey,
    limit: 1,
    offset: 0,
    staleAfterDays: config.catalogHealthStaleDays,
  });
  const limit = parseAsyncBulkRepairLimit(formData.get('batch_limit'), countPage.totalCount);
  const requestedLimit = Math.min(limit, countPage.totalCount);
  const summary: CatalogBulkRepairSummary = {
    issueKey,
    totalCandidates: countPage.totalCount,
    attempted: 0,
    queued: 0,
    deduped: 0,
    failed: 0,
    unavailable: 0,
    limit: requestedLimit,
    movieIds: [],
    jobs: [],
  };

  if (requestedLimit === 0) {
    return {
      mode: 'bulk',
      status: 'empty',
      issueKey,
      summary,
    };
  }

  const batch = await createCatalogRepairBatch({
    action: 'bulk_enqueue_backfill',
    actor,
    issueKey,
    targetType: 'catalog_issue',
    targetId: issueKey,
    requestedLimit,
    totalCandidates: countPage.totalCount,
    attemptedCount: 0,
    note,
    previousState: {
      async: true,
      issueKey,
      requestedLimit,
      totalCandidates: countPage.totalCount,
    },
  });
  summary.batchId = batch.id;

  const orchestrationJob = await enqueueCatalogRepairBatchFromBackoffice(
    {
      batchId: batch.id,
      issueKey,
      limit: requestedLimit,
      pageSize: getAsyncBulkRepairPageSize(),
      language: config.tmdbLanguage,
      staleAfterDays: config.catalogHealthStaleDays,
    },
    config.redisUrl,
  );

  if (!orchestrationJob) {
    await updateCatalogRepairBatchOrchestrationResult({
      batchId: batch.id,
      status: 'unavailable',
      result: { status: 'queue_unavailable', queueName: 'catalog-maintenance' },
    });
    await recordCatalogRepairAction({
      action: 'bulk_enqueue_backfill',
      actor,
      issueKey,
      targetType: 'catalog_issue',
      targetId: issueKey,
      note,
      previousState: {
        async: true,
        issueKey,
        requestedLimit,
        totalCandidates: countPage.totalCount,
      },
      result: {
        ...summary,
        status: 'queue_unavailable',
        queueName: 'catalog-maintenance',
      },
      repairBatchId: batch.id,
    });

    return { mode: 'bulk', status: 'unavailable', issueKey, summary };
  }

  await updateCatalogRepairBatchOrchestrationResult({
    batchId: batch.id,
    status: 'enqueueing',
    result: { ...orchestrationJob, async: true, requestedLimit },
  });
  await recordCatalogRepairAction({
    action: 'bulk_enqueue_backfill',
    actor,
    issueKey,
    targetType: 'catalog_issue',
    targetId: issueKey,
    note,
    previousState: {
      async: true,
      issueKey,
      requestedLimit,
      totalCandidates: countPage.totalCount,
    },
    result: {
      ...summary,
      orchestrationJob,
      status: 'orchestration_queued',
    },
    repairBatchId: batch.id,
  });
  summary.jobs.push({
    movieId: 'batch',
    jobId: orchestrationJob.jobId,
    status: orchestrationJob.status,
  });

  return {
    mode: 'bulk',
    status: 'orchestration_queued',
    issueKey,
    summary,
  };
}

async function performBulkCatalogRepairAction(
  formData: FormData,
  headers: Headers,
): Promise<CatalogRepairActionResult> {
  const config = await ensureBackofficeReady();
  const issueKey = parseCatalogIssueKey(formData.get('issue_key'));
  const limit = parseBulkRepairLimit(formData.get('batch_limit'));
  const actor = parseOperatorActor(headers);
  const note = typeof formData.get('note') === 'string' ? String(formData.get('note')) : undefined;
  const page = await listCatalogHealthIssueMoviePage({
    issueKey,
    limit,
    offset: 0,
    staleAfterDays: config.catalogHealthStaleDays,
  });
  const summary: CatalogBulkRepairSummary = {
    issueKey,
    totalCandidates: page.totalCount,
    attempted: page.movies.length,
    queued: 0,
    deduped: 0,
    failed: 0,
    unavailable: 0,
    limit: page.limit,
    movieIds: page.movies.map((movie) => movie.id),
    jobs: [],
  };
  const batch = await createCatalogRepairBatch({
    action: 'bulk_enqueue_backfill',
    actor,
    issueKey,
    targetType: 'catalog_issue',
    targetId: issueKey,
    requestedLimit: page.limit,
    totalCandidates: page.totalCount,
    attemptedCount: page.movies.length,
    note,
    previousState: {
      issueKey,
      totalCandidates: page.totalCount,
      sampledMovieIds: summary.movieIds,
    },
  });
  summary.batchId = batch.id;
  const reason = getBackfillReasonForIssue(issueKey);

  for (const movie of page.movies) {
    const item = await createCatalogRepairBatchItem({
      batchId: batch.id,
      movieId: movie.id,
      issueKey,
      movieSnapshot: { ...movie },
      reason,
      language: config.tmdbLanguage,
    });

    try {
      const job = await enqueueCatalogBackfillMovieFromBackoffice(
        {
          movieId: movie.id,
          reason,
          language: config.tmdbLanguage,
          repairBatchId: batch.id,
          repairBatchItemId: item.id,
        },
        config.redisUrl,
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
      await updateCatalogRepairBatchItemEnqueueResult({
        itemId: item.id,
        status: 'enqueue_failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        result: { status: 'enqueue_failed' },
      });
      summary.failed += 1;
      summary.jobs.push({ movieId: movie.id, itemId: item.id, status: 'failed' });
      logger.error('Failed to enqueue catalog repair job from bulk action', {
        err: error,
        issueKey,
        movieId: movie.id,
      });
    }
  }

  await refreshCatalogRepairBatchCounts(batch.id);
  await recordCatalogRepairAction({
    action: 'bulk_enqueue_backfill',
    actor,
    issueKey,
    targetType: 'catalog_issue',
    targetId: issueKey,
    note,
    previousState: {
      issueKey,
      totalCandidates: page.totalCount,
      sampledMovieIds: summary.movieIds,
    },
    result: { ...summary },
    repairBatchId: batch.id,
  });

  return {
    mode: 'bulk',
    status: getBulkRepairStatus(summary),
    issueKey,
    summary,
  };
}

export async function performCatalogRepairAction(
  formData: FormData,
  headers: Headers,
): Promise<CatalogRepairActionResult> {
  const config = await ensureBackofficeReady();

  if (formData.get('action') === 'bulk_enqueue_backfill') {
    return performBulkCatalogRepairAction(formData, headers);
  }

  if (formData.get('action') === 'bulk_enqueue_backfill_async') {
    return performAsyncBulkCatalogRepairAction(formData, headers);
  }

  if (formData.get('action') !== 'enqueue_backfill') {
    throw backofficeActionError('Unsupported catalog-health action.');
  }

  const movieId = parseMovieId(formData.get('movie_id'));
  const issueKey = parseCatalogIssueKey(formData.get('issue_key'));
  const snapshot = await getCatalogRepairMovieSnapshot(movieId);

  if (!snapshot) {
    throw backofficeActionError('Movie not found.', 404);
  }

  const job = await enqueueCatalogBackfillMovieFromBackoffice(
    {
      movieId,
      reason: getBackfillReasonForIssue(issueKey),
      language: config.tmdbLanguage,
    },
    config.redisUrl,
  );

  await recordCatalogRepairAction({
    action: 'enqueue_backfill',
    actor: parseOperatorActor(headers),
    issueKey,
    targetType: 'movie',
    targetId: movieId,
    note: typeof formData.get('note') === 'string' ? String(formData.get('note')) : undefined,
    previousState: { ...snapshot },
    result: job ? { ...job } : { status: 'queue_unavailable', queueName: 'catalog-maintenance' },
  });

  return {
    mode: 'single',
    status: job ? 'queued' : 'unavailable',
    issueKey,
    movieId,
    job,
  };
}

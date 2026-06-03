import {
  createCatalogRepairBatch,
  listCatalogHealthIssueMoviePage,
  recordCatalogRepairAction,
  refreshCatalogRepairBatchCounts,
  updateCatalogRepairBatchOrchestrationResult,
} from '@pop-choice/shared';

import {
  enqueueCatalogBackfillMovieFromBackoffice,
  enqueueCatalogRepairBatchFromBackoffice,
} from '../catalogMaintenanceQueue';
import {
  catalogRepairMessage,
  getAsyncBulkRepairPageSize,
  getBulkRepairStatus,
  parseAsyncBulkRepairLimit,
  parseBulkRepairLimit,
  parseCatalogIssueKey,
  REPAIRABLE_CATALOG_ISSUE_KEYS,
  type CatalogRepairActionStatus,
} from './catalogRepairActionHelpers';
import {
  createCatalogBulkRepairSummary,
  enqueueCatalogRepairBatchItems,
  type CatalogBulkRepairSummary,
} from './catalogRepairBatchActions';
import {
  backofficeActionError,
  ensureBackofficeReady,
  parseOperatorActor,
} from './backofficeRuntime';
import { logCatalogRepairActionResult } from './catalogRepairActionLog';
import { performSingleCatalogRepairAction } from './catalogSingleRepairAction';

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
  const summary = createCatalogBulkRepairSummary({
    issueKey,
    totalCandidates: countPage.totalCount,
    limit: requestedLimit,
  });

  if (requestedLimit === 0) {
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
        status: 'empty',
      },
      repairBatchId: batch.id,
    });

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
  const summary = createCatalogBulkRepairSummary({
    issueKey,
    totalCandidates: page.totalCount,
    limit: page.limit,
    movies: page.movies,
  });
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
  await enqueueCatalogRepairBatchItems({
    batchId: batch.id,
    issueKey,
    language: config.tmdbLanguage,
    movies: page.movies,
    redisUrl: config.redisUrl,
    summary,
  });

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
  const actor = parseOperatorActor(headers);
  const startedAt = Date.now();
  const requestedAction =
    typeof formData.get('action') === 'string' ? String(formData.get('action')) : 'unknown';

  if (formData.get('action') === 'bulk_enqueue_backfill') {
    const result = await performBulkCatalogRepairAction(formData, headers);
    logCatalogRepairActionResult({
      action: requestedAction,
      actor,
      durationMs: Date.now() - startedAt,
      result,
    });
    return result;
  }

  if (formData.get('action') === 'bulk_enqueue_backfill_async') {
    const result = await performAsyncBulkCatalogRepairAction(formData, headers);
    logCatalogRepairActionResult({
      action: requestedAction,
      actor,
      durationMs: Date.now() - startedAt,
      result,
    });
    return result;
  }

  if (formData.get('action') !== 'enqueue_backfill') {
    throw backofficeActionError('Unsupported catalog-health action.');
  }

  const result = await performSingleCatalogRepairAction({ config, formData, headers });
  logCatalogRepairActionResult({
    action: requestedAction,
    actor,
    durationMs: Date.now() - startedAt,
    result,
  });

  return result;
}

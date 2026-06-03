import type { CatalogRepairActionResult } from './catalogRepairActions';
import { logBackofficeAction } from './backofficeActionLog';
import { recordBackofficeRepairEnqueue } from './backofficeMetrics';

function recordBulkRepairEnqueueMetrics(
  result: Extract<CatalogRepairActionResult, { mode: 'bulk' }>,
) {
  const itemOutcomeCount =
    result.summary.queued +
    result.summary.deduped +
    result.summary.failed +
    result.summary.unavailable;

  if (itemOutcomeCount === 0) {
    if (result.status !== 'empty') {
      recordBackofficeRepairEnqueue({ mode: result.mode, status: result.status });
    }
    return;
  }

  recordBackofficeRepairEnqueue({
    count: result.summary.queued + result.summary.deduped,
    mode: result.mode,
    status: 'queued',
  });
  recordBackofficeRepairEnqueue({
    count: result.summary.failed,
    mode: result.mode,
    status: 'failed',
  });
  recordBackofficeRepairEnqueue({
    count: result.summary.unavailable,
    mode: result.mode,
    status: 'unavailable',
  });
}

export function logCatalogRepairActionResult({
  action,
  actor,
  durationMs,
  result,
}: {
  action: string;
  actor: string;
  durationMs: number;
  result: CatalogRepairActionResult;
}) {
  if (result.mode === 'single') {
    recordBackofficeRepairEnqueue({ mode: result.mode, status: result.status });
    logBackofficeAction({
      action,
      actor,
      durationMs,
      issueKey: result.issueKey,
      mode: result.mode,
      resultStatus: result.status,
      targetId: result.movieId,
      targetType: 'movie',
    });
    return;
  }

  recordBulkRepairEnqueueMetrics(result);
  logBackofficeAction({
    action,
    actor,
    durationMs,
    issueKey: result.issueKey,
    mode: result.mode,
    repairBatchId: result.summary.batchId,
    resultStatus: result.status,
    targetId: result.issueKey,
    targetType: 'catalog_issue',
  });
}

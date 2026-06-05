import { catalogRepairMessage } from './catalogRepairActionHelpers';

import type { CatalogRepairActionStatus } from './catalogRepairActionHelpers';
import type { CatalogRepairActionResult } from './catalogRepairActions';

function isCatalogRepairActionOk(status: CatalogRepairActionStatus): boolean {
  return status === 'queued' || status === 'deduped' || status === 'orchestration_queued';
}

export function getCatalogRepairActionStatusCode(status: CatalogRepairActionStatus): number {
  if (status === 'unavailable') return 503;
  if (status === 'failed') return 500;
  if (status === 'partial') return 207;
  return 200;
}

export function getCatalogRepairRedirectStatus(result: CatalogRepairActionResult): string {
  if (result.status === 'queued') return result.mode === 'bulk' ? 'bulk-queued' : 'queued';
  if (result.status === 'deduped') return 'deduped';
  if (result.status === 'orchestration_queued') return 'bulk-orchestration-queued';
  if (result.status === 'partial') return 'bulk-partial';
  if (result.status === 'empty') return 'empty';
  if (result.status === 'failed') return 'failed';
  return 'unavailable';
}

export function buildCatalogRepairActionBody(result: CatalogRepairActionResult) {
  return {
    ok: isCatalogRepairActionOk(result.status),
    mode: result.mode,
    status: result.status,
    message: catalogRepairMessage(result.status),
    issueKey: result.issueKey,
    ...(result.mode === 'single'
      ? { movieId: result.movieId, job: result.job }
      : { summary: result.summary }),
  };
}

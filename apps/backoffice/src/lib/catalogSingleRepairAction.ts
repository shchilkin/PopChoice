import {
  getCatalogRepairMovieSnapshot,
  recordCatalogRepairAction,
  type BackofficeRuntimeConfig,
} from '@pop-choice/shared';

import { enqueueCatalogBackfillMovieFromBackoffice } from '../catalogMaintenanceQueue';
import {
  getBackfillReasonForIssue,
  parseCatalogIssueKey,
  parseMovieId,
} from './catalogRepairActionHelpers';
import { backofficeActionError, parseOperatorActor } from './backofficeRuntime';
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
    status: job?.status ?? 'unavailable',
    issueKey,
    movieId,
    job,
  };
}

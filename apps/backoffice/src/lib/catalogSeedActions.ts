import { logger } from '@pop-choice/shared';

import { enqueueCuratedMovieSeedFromBackoffice } from '../movieSeedQueue';

import { logBackofficeAction } from './backofficeActionLog';
import { parseOperatorActor } from './backofficeRuntime';

export type CatalogSeedActionStatus = 'failed' | 'triggered' | 'unavailable';

export interface CatalogSeedActionResult {
  message: string;
  status: CatalogSeedActionStatus;
}

export interface CatalogSeedStatus {
  queueConfigured: boolean;
  queueName: string;
}

export type EnqueueCatalogSeedFn = (input: {
  requestedBy: string;
}) => Promise<{ jobId: string; status: 'deduped' | 'queued' } | null>;

export function getCatalogSeedStatus(env: NodeJS.ProcessEnv = process.env): CatalogSeedStatus {
  return {
    queueConfigured: Boolean(env.REDIS_URL?.trim()),
    queueName: 'movie-seed',
  };
}

function describeEnqueueResult(result: { jobId: string; status: 'deduped' | 'queued' }): string {
  if (result.status === 'deduped') {
    return `Movie seed is already queued or running as job ${result.jobId}. Watch the workers logs.`;
  }

  return `Movie seed queued as job ${result.jobId}. Watch the workers logs.`;
}

export async function performCatalogSeedAction({
  actor: actorOverride,
  env = process.env,
  enqueueSeed = ({ requestedBy }) =>
    enqueueCuratedMovieSeedFromBackoffice({ requestedBy }, env.REDIS_URL),
  formData,
  headers,
}: {
  actor?: string;
  env?: NodeJS.ProcessEnv;
  enqueueSeed?: EnqueueCatalogSeedFn;
  formData: FormData;
  headers: Headers;
}): Promise<CatalogSeedActionResult> {
  const startedAt = Date.now();
  const actor = actorOverride ?? parseOperatorActor(headers);
  const action = String(formData.get('action') ?? '');

  let result: CatalogSeedActionResult;

  if (action !== 'trigger_movie_seed') {
    result = { message: 'Unsupported catalog seed action.', status: 'failed' };
  } else if (!env.REDIS_URL?.trim()) {
    result = {
      message: 'REDIS_URL is not configured for backoffice.',
      status: 'unavailable',
    };
  } else {
    const enqueueResult = await enqueueSeed({ requestedBy: actor });
    if (!enqueueResult) {
      logger.error('Movie seed queue is unavailable even though REDIS_URL is configured');
      result = {
        message: 'Movie seed queue is unavailable. Check REDIS_URL and backoffice logs.',
        status: 'failed',
      };
    } else {
      result = {
        message: describeEnqueueResult(enqueueResult),
        status: 'triggered',
      };
    }
  }

  logBackofficeAction({
    action: 'trigger_movie_seed',
    actor,
    durationMs: Date.now() - startedAt,
    resultStatus: result.status,
    targetType: 'catalog_seed',
  });

  return result;
}

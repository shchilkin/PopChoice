import {
  createRecommendationEvalRun,
  failRecommendationEvalRun,
  logger,
  markRecommendationEvalRunQueued,
} from '@pop-choice/shared';

import {
  enqueueRecommendationEvalFromBackoffice,
  type BackofficeRecommendationEvalMode,
} from '../recommendationEvalQueue';
import {
  backofficeActionError,
  ensureBackofficeReady,
  parseOperatorActor,
} from './backofficeRuntime';

import type { RecommendationEvalRunMode } from '@pop-choice/shared';

const LIVE_RECOMMENDATION_EVAL_CONFIRMATION = 'RUN LIVE RECOMMENDATION EVAL';

export function parseRecommendationEvalMode(formData: FormData): BackofficeRecommendationEvalMode {
  const value = formData.get('mode');
  if (value === 'mock' || value === 'real-data') return value;
  if (value !== 'live') {
    throw backofficeActionError('Unsupported recommendation eval mode.');
  }

  const acknowledged = formData.get('acknowledge_live_cost') === 'yes';
  const confirmation =
    typeof formData.get('live_confirmation') === 'string'
      ? String(formData.get('live_confirmation')).trim()
      : '';
  if (!acknowledged || confirmation !== LIVE_RECOMMENDATION_EVAL_CONFIRMATION) {
    throw backofficeActionError(
      `Live recommendation evals require checking the cost acknowledgement and typing "${LIVE_RECOMMENDATION_EVAL_CONFIRMATION}".`,
    );
  }

  return 'live';
}

export type RecommendationEvalActionResult =
  | {
      status: 'queued';
      runId: string;
      jobId: string;
      mode: BackofficeRecommendationEvalMode;
    }
  | {
      status: 'unavailable' | 'failed';
      runId: string;
      mode: BackofficeRecommendationEvalMode;
      errorMessage: string;
    };

function recommendationEvalMessage(status: RecommendationEvalActionResult['status']): string {
  if (status === 'queued') {
    return 'Recommendation eval job queued. Workers will persist results when it finishes.';
  }
  if (status === 'unavailable') {
    return 'Recommendation eval queue is unavailable. Check REDIS_URL and worker status.';
  }
  return 'Recommendation eval failed to enqueue. Check backoffice logs before retrying.';
}

export function getRecommendationEvalActionStatusCode(
  status: RecommendationEvalActionResult['status'],
): number {
  if (status === 'unavailable') return 503;
  if (status === 'failed') return 500;
  return 200;
}

export function buildRecommendationEvalActionBody(result: RecommendationEvalActionResult) {
  return {
    ok: result.status === 'queued',
    message: recommendationEvalMessage(result.status),
    mode: result.mode,
    runId: result.runId,
    status: result.status,
    ...(result.status === 'queued'
      ? { jobId: result.jobId }
      : { errorMessage: result.errorMessage }),
  };
}

export function buildRecommendationEvalFormDataFromJsonBody(
  body: Record<string, unknown>,
): FormData {
  const formData = new FormData();
  if (typeof body.mode === 'string') {
    formData.set('mode', body.mode);
  }
  if (body.acknowledgeLiveCost === true || body.acknowledge_live_cost === 'yes') {
    formData.set('acknowledge_live_cost', 'yes');
  }
  const liveConfirmation =
    typeof body.liveConfirmation === 'string'
      ? body.liveConfirmation
      : typeof body.live_confirmation === 'string'
        ? body.live_confirmation
        : null;
  if (liveConfirmation !== null) {
    formData.set('live_confirmation', liveConfirmation);
  }
  return formData;
}

export async function performRecommendationEvalAction(
  formData: FormData,
  headers: Headers,
): Promise<RecommendationEvalActionResult> {
  const config = await ensureBackofficeReady();
  const mode = parseRecommendationEvalMode(formData);
  const actor = parseOperatorActor(headers);
  const run = await createRecommendationEvalRun({
    actor,
    mode: mode as RecommendationEvalRunMode,
    requestedOptions: {
      providerCalls: mode === 'live' ? 'openai' : 'none',
      liveGuardAcknowledged: mode === 'live',
      trigger: 'backoffice',
    },
    source: 'backoffice',
  });

  try {
    const job = await enqueueRecommendationEvalFromBackoffice(
      {
        mode,
        runId: run.id,
      },
      config.redisUrl,
    );

    if (!job) {
      await failRecommendationEvalRun({
        errorMessage: 'REDIS_URL is unavailable or the recommendation-evals queue is disabled.',
        runId: run.id,
        status: 'enqueue_failed',
      });
      return {
        errorMessage: 'queue unavailable',
        mode,
        runId: run.id,
        status: 'unavailable',
      };
    }

    await markRecommendationEvalRunQueued({
      jobId: job.jobId,
      jobName: job.jobName,
      queueName: job.queueName,
      runId: run.id,
    });

    return {
      jobId: job.jobId,
      mode,
      runId: run.id,
      status: 'queued',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failRecommendationEvalRun({
      errorMessage: message,
      runId: run.id,
      status: 'enqueue_failed',
    });
    logger.error('Failed to enqueue recommendation eval job from backoffice', {
      err: error,
      mode,
      runId: run.id,
    });
    return {
      errorMessage: message,
      mode,
      runId: run.id,
      status: 'failed',
    };
  }
}

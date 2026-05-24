import { Worker } from 'bullmq';

import { processMorePicksRecommendation } from '@/features/recommendation/morePicksJobs';
import {
  MORE_PICKS_JOB_OPTIONS,
  MORE_PICKS_QUEUE_NAME,
  createBullMQConnection,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';
import { recordQueueJobEvent } from '@/lib/metrics';
import { withTraceSpan } from '@/lib/tracing';

import type { MorePicksJobData } from '@/lib/jobQueue';

const MAX_ATTEMPTS = MORE_PICKS_JOB_OPTIONS.attempts;

export function createMorePicksWorker(): Worker<MorePicksJobData> | null {
  const connection = createBullMQConnection();
  if (!connection) {
    logger.warn('REDIS_URL not set. More-picks worker is disabled.');
    return null;
  }

  const worker = new Worker<MorePicksJobData>(
    MORE_PICKS_QUEUE_NAME,
    async (job) => {
      const { recommendationId, slug, locale } = job.data;
      await withTraceSpan(
        'recommendation.more_picks.worker.process',
        {
          carrier: job.data.trace,
          attributes: {
            'messaging.system': 'bullmq',
            'messaging.destination.name': MORE_PICKS_QUEUE_NAME,
            'messaging.operation.name': 'process',
            'job.id': String(job.id ?? 'unknown'),
            'job.name': job.name,
            'recommendation.id': recommendationId,
            'recommendation.slug': slug,
          },
        },
        async () => {
          logger.info({ recommendationId, slug, jobId: job.id }, 'More-picks job started');
          await processMorePicksRecommendation({ recommendationId, slug, locale });
        },
      );
    },
    { connection },
  );

  worker.on('completed', (job) => {
    recordQueueJobEvent({
      queue: MORE_PICKS_QUEUE_NAME,
      job: job.name,
      event: 'completed',
      final: true,
    });
    logger.info({ jobId: job.id, slug: job.data.slug }, 'More-picks job completed successfully');
  });

  worker.on('failed', (job, err) => {
    const attemptsMade = job?.attemptsMade ?? 0;
    recordQueueJobEvent({
      queue: MORE_PICKS_QUEUE_NAME,
      job: job?.name ?? 'unknown',
      event: 'failed',
      final: attemptsMade >= MAX_ATTEMPTS,
    });
    logger.error(
      {
        err,
        jobId: job?.id,
        slug: job?.data?.slug,
        attemptsMade,
        maxAttempts: MAX_ATTEMPTS,
      },
      'More-picks job failed',
    );
  });

  return worker;
}

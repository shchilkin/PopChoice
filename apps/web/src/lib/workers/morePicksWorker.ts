import { Worker } from 'bullmq';
import pg from 'pg';

import { runMorePicksPipeline } from '@/app/api/more-tmdb-picks/pipeline';
import {
  getRecommendationTMDBExcludeIds,
  insertMorePicksMovies,
  updateMorePicksStatus,
} from '@/lib/db/recommendations';
import {
  MORE_PICKS_JOB_OPTIONS,
  MORE_PICKS_QUEUE_NAME,
  createBullMQConnection,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';

import type { MorePicksJobData } from '@/lib/jobQueue';

const { Pool } = pg;

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
      logger.info({ recommendationId, slug, jobId: job.id }, 'More-picks job started');

      await updateMorePicksStatus(recommendationId, 'processing');

      try {
        // Read quiz_data directly from the DB — keeps Redis payload small
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) throw new Error('DATABASE_URL not set');
        const pool = new Pool({ connectionString, allowExitOnIdle: true });
        const res = await pool.query<{ quiz_data: unknown }>(
          'SELECT quiz_data FROM recommendations WHERE id = $1',
          [recommendationId],
        );
        await pool.end();

        const quizData = res.rows[0]?.quiz_data;
        if (!quizData) throw new Error('Quiz data not found for recommendation');

        const excludeIds = await getRecommendationTMDBExcludeIds(recommendationId);
        const movies = await runMorePicksPipeline(quizData, excludeIds, 2, locale);

        await insertMorePicksMovies(recommendationId, movies);
        await updateMorePicksStatus(recommendationId, 'completed');

        logger.info(
          { recommendationId, slug, jobId: job.id, movieCount: movies.length },
          'More-picks job completed',
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err, recommendationId, slug, jobId: job.id }, 'More-picks job failed');
        await updateMorePicksStatus(recommendationId, 'failed', message).catch((dbErr) => {
          logger.error({ err: dbErr, recommendationId }, 'Failed to update more_picks_status');
        });
        throw err;
      }
    },
    { connection },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, slug: job.data.slug }, 'More-picks job completed successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error(
      {
        err,
        jobId: job?.id,
        slug: job?.data?.slug,
        attemptsMade: job?.attemptsMade ?? 0,
        maxAttempts: MAX_ATTEMPTS,
      },
      'More-picks job failed',
    );
  });

  return worker;
}

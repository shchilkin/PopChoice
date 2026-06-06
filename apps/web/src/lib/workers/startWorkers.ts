import logger from '@/lib/logger';
import { initTracing, shutdownTracing } from '@/lib/tracingSetup';

import type { Server } from 'node:http';

initTracing('workers');

async function main() {
  const modules = await loadWorkerModules();
  const runtime = createWorkerRuntime(modules);

  validateCoreWorkers(runtime);
  logMissingWorkers(runtime);
  registerShutdownHandlers(runtime, modules.closeBullMQQueues);
}

async function loadWorkerModules() {
  const [
    { closeBullMQQueues },
    { createCatalogMaintenanceWorker },
    { startWorkerMetricsServer },
    { createMorePicksWorker },
    { createMovieSeedWorker },
    { createRecommendationWorker },
    { createRecommendationEvalWorker },
  ] = await Promise.all([
    import('@/lib/jobQueue'),
    import('./catalogMaintenanceWorker'),
    import('./metricsServer'),
    import('./morePicksWorker'),
    import('./movieSeedWorker'),
    import('./recommendationWorker'),
    import('./recommendationEvalWorker'),
  ]);

  return {
    closeBullMQQueues,
    createCatalogMaintenanceWorker,
    createMorePicksWorker,
    createMovieSeedWorker,
    createRecommendationEvalWorker,
    createRecommendationWorker,
    startWorkerMetricsServer,
  };
}

type WorkerModules = Awaited<ReturnType<typeof loadWorkerModules>>;
type ClosableWorker = {
  close: () => Promise<unknown> | unknown;
};
type WorkerRuntime = {
  catalogMaintenanceWorker: ClosableWorker | null;
  metricsServer: Server | null;
  morePicksWorker: ClosableWorker | null;
  movieSeedWorker: ClosableWorker | null;
  recommendationEvalWorker: ClosableWorker | null;
  recommendationWorker: ClosableWorker | null;
};

function createWorkerRuntime(modules: WorkerModules): WorkerRuntime {
  return {
    catalogMaintenanceWorker: modules.createCatalogMaintenanceWorker(),
    metricsServer: modules.startWorkerMetricsServer(),
    morePicksWorker: modules.createMorePicksWorker(),
    movieSeedWorker: modules.createMovieSeedWorker(),
    recommendationEvalWorker: modules.createRecommendationEvalWorker(),
    recommendationWorker: modules.createRecommendationWorker(),
  };
}

function validateCoreWorkers(runtime: WorkerRuntime) {
  const coreWorkers = [
    runtime.catalogMaintenanceWorker,
    runtime.movieSeedWorker,
    runtime.recommendationWorker,
  ];

  if (coreWorkers.some(Boolean)) {
    return;
  }

  logger.error('No core workers could be started. Exiting.');
  process.exit(1);
}

function logMissingWorkers(runtime: WorkerRuntime) {
  const workerLogs: Array<[ClosableWorker | null, string]> = [
    [
      runtime.catalogMaintenanceWorker,
      'Catalog maintenance worker could not be created — continuing without it.',
    ],
    [runtime.movieSeedWorker, 'Movie seeding worker could not be created — continuing without it.'],
    [
      runtime.recommendationWorker,
      'Recommendation worker could not be created — continuing without it.',
    ],
    [runtime.morePicksWorker, 'More-picks worker could not be created — continuing without it.'],
    [
      runtime.recommendationEvalWorker,
      'Recommendation eval worker could not be created — continuing without it.',
    ],
  ];

  for (const [worker, message] of workerLogs) {
    if (!worker) logger.warn(message);
  }
}

function registerShutdownHandlers(
  runtime: WorkerRuntime,
  closeBullMQQueues: WorkerModules['closeBullMQQueues'],
) {
  const shutdown = async (signal: NodeJS.Signals) => {
    await shutdownWorkers(signal, runtime, closeBullMQQueues);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

async function shutdownWorkers(
  signal: NodeJS.Signals,
  runtime: WorkerRuntime,
  closeBullMQQueues: WorkerModules['closeBullMQQueues'],
) {
  logger.info({ signal }, 'Shutting down workers');
  try {
    await Promise.all([...getWorkerCloseTasks(runtime), closeMetricsServer(runtime.metricsServer)]);
    await closeBullMQQueues();
    await shutdownTracing();
    logger.info('Workers closed gracefully');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error while shutting down workers');
    process.exit(1);
  }
}

function getWorkerCloseTasks(runtime: WorkerRuntime) {
  return [
    runtime.catalogMaintenanceWorker?.close(),
    runtime.movieSeedWorker?.close(),
    runtime.recommendationWorker?.close(),
    runtime.morePicksWorker?.close(),
    runtime.recommendationEvalWorker?.close(),
  ];
}

function closeMetricsServer(metricsServer: Server | null) {
  return new Promise<void>((resolve, reject) => {
    if (!metricsServer) {
      resolve();
      return;
    }

    metricsServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

void main().catch((error) => {
  logger.error({ err: error }, 'Worker bootstrap failed');
  process.exit(1);
});

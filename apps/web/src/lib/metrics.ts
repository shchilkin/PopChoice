import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

import { isOpenAITimeoutError } from '@/lib/openaiTimeout';

import type { Queue } from 'bullmq';

type RecommendationMode = 'legacy_sync' | 'async_worker' | 'async_inline' | 'deterministic_e2e';
type RecommendationStatus = 'success' | 'failure';
type Provider = 'openai' | 'tmdb';
type ProviderOperation =
  | 'catalog_discover'
  | 'catalog_details'
  | 'description'
  | 'embedding'
  | 'movie_discover'
  | 'query_enrichment'
  | 'ranking'
  | 'similarity_embedding';
type ProviderReason = 'error' | 'http_error' | 'invalid_response' | 'rate_limited' | 'timeout';
type QueueEvent = 'completed' | 'failed';
type Dependency = 'postgres' | 'redis';

type QueueMetricSource = {
  name: string;
  queue: Queue | null;
};

type MetricsState = {
  registry: Registry;
  recommendationTotal: Counter<'mode' | 'status'>;
  recommendationDuration: Histogram<'mode' | 'status'>;
  providerErrorsTotal: Counter<'provider' | 'operation' | 'reason'>;
  queueJobsTotal: Counter<'queue' | 'job' | 'event' | 'final'>;
  queueDepth: Gauge<'queue' | 'status'>;
  queueScrapeErrorsTotal: Counter<'queue'>;
  dependencyHealth: Gauge<'dependency'>;
  dependencyHealthFailuresTotal: Counter<'dependency'>;
};

const GLOBAL_METRICS_KEY = Symbol.for('popchoice.metrics');

function createMetricsState(): MetricsState {
  const registry = new Registry();
  registry.setDefaultLabels({ app: 'popchoice' });

  collectDefaultMetrics({
    prefix: 'popchoice_',
    register: registry,
  });

  const recommendationTotal = new Counter({
    name: 'popchoice_recommendations_total',
    help: 'Total completed PopChoice recommendation attempts.',
    labelNames: ['mode', 'status'],
    registers: [registry],
  });

  const recommendationDuration = new Histogram({
    name: 'popchoice_recommendation_duration_seconds',
    help: 'Recommendation processing duration in seconds.',
    labelNames: ['mode', 'status'],
    buckets: [0.5, 1, 2, 5, 10, 20, 30, 60, 90, 120],
    registers: [registry],
  });

  const providerErrorsTotal = new Counter({
    name: 'popchoice_provider_errors_total',
    help: 'Upstream OpenAI and TMDB degradation events observed by the app.',
    labelNames: ['provider', 'operation', 'reason'],
    registers: [registry],
  });

  const queueJobsTotal = new Counter({
    name: 'popchoice_queue_jobs_total',
    help: 'BullMQ worker job completion and failure events.',
    labelNames: ['queue', 'job', 'event', 'final'],
    registers: [registry],
  });

  const queueDepth = new Gauge({
    name: 'popchoice_queue_depth',
    help: 'BullMQ queue job counts by queue and status, collected at scrape time.',
    labelNames: ['queue', 'status'],
    registers: [registry],
  });

  const queueScrapeErrorsTotal = new Counter({
    name: 'popchoice_queue_scrape_errors_total',
    help: 'Failures while collecting BullMQ queue counts for metrics.',
    labelNames: ['queue'],
    registers: [registry],
  });

  const dependencyHealth = new Gauge({
    name: 'popchoice_dependency_health',
    help: 'Dependency health from app health checks. 1 means healthy, 0 means unhealthy.',
    labelNames: ['dependency'],
    registers: [registry],
  });

  const dependencyHealthFailuresTotal = new Counter({
    name: 'popchoice_dependency_health_failures_total',
    help: 'Dependency health check failures observed by the app.',
    labelNames: ['dependency'],
    registers: [registry],
  });

  return {
    registry,
    recommendationTotal,
    recommendationDuration,
    providerErrorsTotal,
    queueJobsTotal,
    queueDepth,
    queueScrapeErrorsTotal,
    dependencyHealth,
    dependencyHealthFailuresTotal,
  };
}

function getMetricsState(): MetricsState {
  const globalWithMetrics = globalThis as typeof globalThis & {
    [GLOBAL_METRICS_KEY]?: MetricsState;
  };

  globalWithMetrics[GLOBAL_METRICS_KEY] ??= createMetricsState();
  return globalWithMetrics[GLOBAL_METRICS_KEY];
}

export function metricsContentType(): string {
  return getMetricsState().registry.contentType;
}

export function areMetricsEnabled(): boolean {
  const configured = process.env.METRICS_ENABLED?.trim().toLowerCase();
  if (configured) return configured === '1' || configured === 'true' || configured === 'yes';

  return process.env.NODE_ENV !== 'production';
}

export function isMetricsRequestAuthorized(authorizationHeader: string | null): boolean {
  const token = process.env.METRICS_BEARER_TOKEN;
  if (!token) return process.env.NODE_ENV !== 'production';

  return authorizationHeader === `Bearer ${token}`;
}

export function recordRecommendationCompletion(input: {
  mode: RecommendationMode;
  status: RecommendationStatus;
  durationMs: number;
}): void {
  const metrics = getMetricsState();
  const labels = { mode: input.mode, status: input.status };
  metrics.recommendationTotal.inc(labels);
  metrics.recommendationDuration.observe(labels, Math.max(0, input.durationMs) / 1000);
}

export function recordOpenAIProviderError(
  operation: Extract<
    ProviderOperation,
    'description' | 'embedding' | 'query_enrichment' | 'ranking' | 'similarity_embedding'
  >,
  error: unknown,
): void {
  recordProviderError({
    provider: 'openai',
    operation,
    reason: isOpenAITimeoutError(error) ? 'timeout' : 'error',
  });
}

export function recordTMDBProviderError(
  operation: Extract<ProviderOperation, 'catalog_discover' | 'catalog_details' | 'movie_discover'>,
  reason: ProviderReason,
): void {
  recordProviderError({
    provider: 'tmdb',
    operation,
    reason,
  });
}

export function recordProviderError(input: {
  provider: Provider;
  operation: ProviderOperation;
  reason: ProviderReason;
}): void {
  getMetricsState().providerErrorsTotal.inc(input);
}

export function recordQueueJobEvent(input: {
  queue: string;
  job: string;
  event: QueueEvent;
  final: boolean;
}): void {
  getMetricsState().queueJobsTotal.inc({
    queue: input.queue,
    job: input.job,
    event: input.event,
    final: input.final ? 'true' : 'false',
  });
}

export function recordDependencyHealth(dependency: Dependency, isHealthy: boolean): void {
  const metrics = getMetricsState();
  metrics.dependencyHealth.set({ dependency }, isHealthy ? 1 : 0);
  if (!isHealthy) metrics.dependencyHealthFailuresTotal.inc({ dependency });
}

export async function collectMetrics(queueSources: QueueMetricSource[] = []): Promise<string> {
  await updateQueueMetrics(queueSources);
  return getMetricsState().registry.metrics();
}

async function updateQueueMetrics(queueSources: QueueMetricSource[]): Promise<void> {
  const metrics = getMetricsState();
  const statuses = ['waiting', 'active', 'delayed', 'completed', 'failed', 'paused'] as const;

  await Promise.all(
    queueSources.map(async ({ name, queue }) => {
      if (!queue) {
        for (const status of statuses) {
          metrics.queueDepth.set({ queue: name, status }, 0);
        }
        return;
      }

      try {
        const counts = await queue.getJobCounts(...statuses);
        for (const status of statuses) {
          metrics.queueDepth.set({ queue: name, status }, counts[status] ?? 0);
        }
      } catch {
        metrics.queueScrapeErrorsTotal.inc({ queue: name });
      }
    }),
  );
}

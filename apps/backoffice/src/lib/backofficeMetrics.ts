type BackofficeMetricLabels = Record<string, string>;

export type BackofficeCounterSnapshot = {
  labels: BackofficeMetricLabels;
  name: string;
  value: number;
};

export type BackofficeRepairEnqueueStatus = 'failed' | 'queued' | 'unavailable';
export type BackofficeSseLifecycleEvent =
  | 'closed'
  | 'connected_live'
  | 'connected_snapshot_only'
  | 'open_error'
  | 'queue_error'
  | 'queue_event'
  | 'redis_error'
  | 'snapshot_error';

const GLOBAL_METRICS_KEY = Symbol.for('popchoice.backofficeMetrics');
const MAX_LABEL_LENGTH = 80;

function getCounterStore(): Map<string, BackofficeCounterSnapshot> {
  const globalWithMetrics = globalThis as typeof globalThis & {
    [GLOBAL_METRICS_KEY]?: Map<string, BackofficeCounterSnapshot>;
  };

  globalWithMetrics[GLOBAL_METRICS_KEY] ??= new Map();
  return globalWithMetrics[GLOBAL_METRICS_KEY];
}

function normalizeLabelValue(value: string): string {
  const compacted = value.trim();
  if (!compacted) return 'unknown';
  return compacted.slice(0, MAX_LABEL_LENGTH);
}

function serializeLabels(labels: BackofficeMetricLabels): string {
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}=${labels[key]}`)
    .join(',');
}

function incrementBackofficeCounter(
  name: string,
  labels: BackofficeMetricLabels,
  amount = 1,
): void {
  if (!Number.isFinite(amount) || amount <= 0) return;

  const normalizedLabels = Object.fromEntries(
    Object.entries(labels).map(([key, value]) => [key, normalizeLabelValue(value)]),
  );
  const store = getCounterStore();
  const key = `${name}{${serializeLabels(normalizedLabels)}}`;
  const existing = store.get(key);

  if (existing) {
    existing.value += amount;
    return;
  }

  store.set(key, { labels: normalizedLabels, name, value: amount });
}

export function normalizeBackofficeRepairEnqueueStatus(
  status: string,
): BackofficeRepairEnqueueStatus {
  if (status === 'queued' || status === 'orchestration_queued') return 'queued';
  if (status === 'unavailable' || status === 'queue_unavailable') return 'unavailable';
  return 'failed';
}

export function recordBackofficeRepairEnqueue(input: {
  count?: number;
  mode: 'bulk' | 'single';
  status: BackofficeRepairEnqueueStatus | string;
}): void {
  incrementBackofficeCounter(
    'backoffice_repair_enqueue_total',
    {
      mode: input.mode,
      status: normalizeBackofficeRepairEnqueueStatus(input.status),
    },
    input.count,
  );
}

export function recordBackofficeSseLifecycle(input: {
  event: BackofficeSseLifecycleEvent;
  queueName: string;
}): void {
  incrementBackofficeCounter('backoffice_sse_lifecycle_total', {
    event: input.event,
    queue: input.queueName,
  });
}

export function readBackofficeCounterSnapshot(): BackofficeCounterSnapshot[] {
  return [...getCounterStore().values()].map((counter) => ({
    labels: { ...counter.labels },
    name: counter.name,
    value: counter.value,
  }));
}

export function resetBackofficeMetricsForTest(): void {
  getCounterStore().clear();
}

import type { CatalogMaintenanceQueueJobPage } from '../catalogMaintenanceQueue';

export interface CatalogMaintenanceQueueSnapshotMessage {
  jobPage: CatalogMaintenanceQueueJobPage;
  queueEvent?: {
    type?: string;
  };
  receivedAt: string;
  trigger: 'connected' | 'queue-event';
}

const QUEUE_STATES = new Set(['active', 'completed', 'delayed', 'failed', 'waiting']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasFiniteNumber(value: Record<string, unknown>, key: string): boolean {
  const item = value[key];
  return typeof item === 'number' && Number.isFinite(item);
}

function isQueueCounts(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return [
    'active',
    'completed',
    'delayed',
    'failed',
    'prioritized',
    'waiting',
    'waitingChildren',
  ].every((key) => hasFiniteNumber(value, key));
}

function isPayloadValue(value: unknown): boolean {
  return isRecord(value) && typeof value.label === 'string' && typeof value.value === 'string';
}

function isQueueJob(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.state === 'string' &&
    QUEUE_STATES.has(value.state) &&
    hasFiniteNumber(value, 'attemptsMade') &&
    (typeof value.attemptsConfigured === 'number' || value.attemptsConfigured === null) &&
    (typeof value.createdAt === 'string' || value.createdAt === null) &&
    (typeof value.processedAt === 'string' || value.processedAt === null) &&
    (typeof value.finishedAt === 'string' || value.finishedAt === null) &&
    (typeof value.failedReason === 'string' || value.failedReason === null) &&
    Array.isArray(value.payload) &&
    value.payload.every(isPayloadValue) &&
    (typeof value.repairBatchId === 'string' || value.repairBatchId === null) &&
    (typeof value.repairBatchItemId === 'string' || value.repairBatchItemId === null) &&
    (typeof value.movieId === 'string' || value.movieId === null)
  );
}

export function isCatalogMaintenanceQueueJobPage(
  value: unknown,
): value is CatalogMaintenanceQueueJobPage {
  return (
    isRecord(value) &&
    typeof value.queueName === 'string' &&
    typeof value.available === 'boolean' &&
    typeof value.state === 'string' &&
    QUEUE_STATES.has(value.state) &&
    Array.isArray(value.jobs) &&
    value.jobs.every(isQueueJob) &&
    isQueueCounts(value.counts) &&
    hasFiniteNumber(value, 'openJobs') &&
    hasFiniteNumber(value, 'totalCount') &&
    hasFiniteNumber(value, 'limit') &&
    hasFiniteNumber(value, 'offset') &&
    typeof value.updatedAt === 'string'
  );
}

export function parseCatalogMaintenanceQueueSnapshotMessage(
  value: string,
): CatalogMaintenanceQueueSnapshotMessage | null {
  try {
    const message = JSON.parse(value) as unknown;
    if (!isRecord(message) || !isCatalogMaintenanceQueueJobPage(message.jobPage)) return null;

    const receivedAt = typeof message.receivedAt === 'string' ? message.receivedAt : null;
    const trigger = message.trigger === 'connected' ? 'connected' : 'queue-event';
    const queueEvent = isRecord(message.queueEvent)
      ? {
          type: typeof message.queueEvent.type === 'string' ? message.queueEvent.type : undefined,
        }
      : undefined;

    return {
      jobPage: message.jobPage,
      queueEvent,
      receivedAt: receivedAt ?? message.jobPage.updatedAt,
      trigger,
    };
  } catch {
    return null;
  }
}

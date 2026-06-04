import type { CatalogMaintenanceQueueJobPage } from '../catalogMaintenanceQueue';

export interface CatalogMaintenanceQueueSnapshotMessage {
  jobPage: CatalogMaintenanceQueueJobPage;
  queueEvent?: {
    type?: string;
  };
  receivedAt: string;
  trigger: 'connected' | 'queue-event' | 'redis-unavailable';
}

export type CatalogMaintenanceQueueStreamMode = 'live' | 'snapshot-only';

const QUEUE_STATES = new Set(['active', 'completed', 'delayed', 'failed', 'waiting']);
const QUEUE_PAGE_STRING_FIELDS = ['queueName', 'updatedAt'] as const;
const QUEUE_PAGE_NUMBER_FIELDS = ['openJobs', 'totalCount', 'limit', 'offset'] as const;
const QUEUE_JOB_STRING_FIELDS = ['id', 'name'] as const;
const QUEUE_JOB_NULLABLE_STRING_FIELDS = [
  'createdAt',
  'processedAt',
  'finishedAt',
  'failedReason',
  'repairBatchId',
  'repairBatchItemId',
  'movieId',
] as const;

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

function hasStringFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.every((field) => typeof value[field] === 'string');
}

function hasFiniteNumberFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.every((field) => hasFiniteNumber(value, field));
}

function hasNullableStringFields(
  value: Record<string, unknown>,
  fields: readonly string[],
): boolean {
  return fields.every((field) => {
    const item = value[field];
    return typeof item === 'string' || item === null;
  });
}

function hasNullableNumberField(value: Record<string, unknown>, key: string): boolean {
  const item = value[key];
  return typeof item === 'number' || item === null;
}

function hasKnownQueueState(value: Record<string, unknown>): boolean {
  return typeof value.state === 'string' && QUEUE_STATES.has(value.state);
}

function hasQueueJobPayload(value: Record<string, unknown>): boolean {
  return Array.isArray(value.payload) && value.payload.every(isPayloadValue);
}

function hasQueueJobs(value: Record<string, unknown>): boolean {
  return Array.isArray(value.jobs) && value.jobs.every(isQueueJob);
}

function isQueueJob(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return [
    hasStringFields(value, QUEUE_JOB_STRING_FIELDS),
    hasKnownQueueState(value),
    hasFiniteNumber(value, 'attemptsMade'),
    hasNullableNumberField(value, 'attemptsConfigured'),
    hasNullableStringFields(value, QUEUE_JOB_NULLABLE_STRING_FIELDS),
    hasQueueJobPayload(value),
  ].every(Boolean);
}

export function isCatalogMaintenanceQueueJobPage(
  value: unknown,
): value is CatalogMaintenanceQueueJobPage {
  if (!isRecord(value)) return false;

  return [
    hasStringFields(value, QUEUE_PAGE_STRING_FIELDS),
    typeof value.available === 'boolean',
    hasKnownQueueState(value),
    hasQueueJobs(value),
    isQueueCounts(value.counts),
    hasFiniteNumberFields(value, QUEUE_PAGE_NUMBER_FIELDS),
  ].every(Boolean);
}

export function parseCatalogMaintenanceQueueSnapshotMessage(
  value: string,
): CatalogMaintenanceQueueSnapshotMessage | null {
  try {
    const message = JSON.parse(value) as unknown;
    if (!isRecord(message) || !isCatalogMaintenanceQueueJobPage(message.jobPage)) return null;

    const receivedAt = typeof message.receivedAt === 'string' ? message.receivedAt : null;
    const trigger =
      message.trigger === 'connected' || message.trigger === 'redis-unavailable'
        ? message.trigger
        : 'queue-event';
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

export function parseCatalogMaintenanceQueueConnectedMode(
  value: string,
): CatalogMaintenanceQueueStreamMode {
  try {
    const message = JSON.parse(value) as unknown;
    return isRecord(message) && message.mode === 'snapshot-only' ? 'snapshot-only' : 'live';
  } catch {
    return 'live';
  }
}

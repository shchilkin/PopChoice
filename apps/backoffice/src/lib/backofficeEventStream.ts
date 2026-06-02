import type { QueueEvents } from 'bullmq';

export const BACKOFFICE_STREAM_HEARTBEAT_INTERVAL_MS = 25_000;
export const BACKOFFICE_STREAM_SNAPSHOT_DEBOUNCE_MS = 350;

export type QueueEventPayload = Record<string, unknown> | string | number | null | undefined;
export type SnapshotQueueEvent = { payload: Record<string, unknown>; type: string };

const QUEUE_EVENT_NAMES = [
  'waiting',
  'active',
  'completed',
  'failed',
  'delayed',
  'stalled',
  'drained',
  'progress',
] as const;

export function encodeServerSentEvent(event: string, payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

export function normalizeQueueEventPayload(payload: QueueEventPayload): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload;
  }
  return { value: payload ?? null };
}

export function withBackofficeStreamMetadata(
  payload: Record<string, unknown>,
  { queueName }: { queueName: string },
): Record<string, unknown> {
  return {
    ...payload,
    queueName,
    receivedAt: new Date().toISOString(),
  };
}

export function createServerSentEventResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    },
  });
}

export function getSearchParamsRecord(
  searchParams: URLSearchParams,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    const existing = params[key];
    if (Array.isArray(existing)) {
      existing.push(value);
    } else if (typeof existing === 'string') {
      params[key] = [existing, value];
    } else {
      params[key] = value;
    }
  }

  return params;
}

export function bindCatalogMaintenanceQueueEvents(
  queueEvents: QueueEvents,
  forward: (type: string) => (payload: QueueEventPayload) => void,
): void {
  for (const eventName of QUEUE_EVENT_NAMES) {
    queueEvents.on(eventName, forward(eventName));
  }
}

import { QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

import { recordBackofficeSseLifecycle } from './backofficeMetrics';
import { redisOptionsFromUrl } from './redisConnection';

const BACKOFFICE_STREAM_HEARTBEAT_INTERVAL_MS = 25_000;
const BACKOFFICE_STREAM_SNAPSHOT_DEBOUNCE_MS = 350;

export type QueueEventPayload = Record<string, unknown> | string | number | null | undefined;
export type SnapshotQueueEvent = { payload: Record<string, unknown>; type: string };
export type BackofficeStreamSnapshotTrigger = 'connected' | 'queue-event' | 'redis-unavailable';
export type BackofficeStreamSend = (event: string, payload: Record<string, unknown>) => void;
export type BackofficeStreamScheduleSnapshot = (
  trigger: BackofficeStreamSnapshotTrigger,
  queueEvent?: SnapshotQueueEvent,
) => void;

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
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
      'X-Accel-Buffering': 'no',
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
): () => void {
  const listeners = QUEUE_EVENT_NAMES.map((eventName) => {
    const listener = forward(eventName);
    queueEvents.on(eventName, listener);
    return { eventName, listener };
  });

  return () => {
    for (const { eventName, listener } of listeners) {
      queueEvents.off(eventName, listener);
    }
  };
}

export interface BackofficeQueueEventStreamOptions {
  connectedPayload?: (mode: 'live' | 'snapshot-only') => Record<string, unknown>;
  errorEvent: string;
  logError: (message: string, error: unknown) => void;
  logOpenErrorMessage: string;
  logQueueErrorMessage: string;
  logRedisErrorMessage: string;
  logSnapshotErrorMessage: string;
  onQueueEvent?: (event: {
    payload: Record<string, unknown>;
    scheduleSnapshot: BackofficeStreamScheduleSnapshot;
    send: BackofficeStreamSend;
    type: string;
  }) => void;
  queueName: string;
  readSnapshot: (context: {
    queueEvent?: SnapshotQueueEvent;
    trigger: BackofficeStreamSnapshotTrigger;
  }) => Promise<Record<string, unknown>>;
  redisUrl?: string | null;
  request: Request;
  sendSnapshotWhenRedisUnavailable?: boolean;
  streamOpenErrorMessage: string;
  streamQueueErrorMessage: string;
  streamRedisErrorMessage: string;
  streamSnapshotErrorMessage: string;
  suppressDuplicateRedisErrors?: boolean;
}

export function createBackofficeQueueEventStream({
  connectedPayload = (mode) => (mode === 'snapshot-only' ? { mode } : {}),
  errorEvent,
  logError,
  logOpenErrorMessage,
  logQueueErrorMessage,
  logRedisErrorMessage,
  logSnapshotErrorMessage,
  onQueueEvent,
  queueName,
  readSnapshot,
  redisUrl,
  request,
  sendSnapshotWhenRedisUnavailable = false,
  streamOpenErrorMessage,
  streamQueueErrorMessage,
  streamRedisErrorMessage,
  streamSnapshotErrorMessage,
  suppressDuplicateRedisErrors = false,
}: BackofficeQueueEventStreamOptions): ReadableStream<Uint8Array> {
  let cleanupStream: (() => Promise<void>) | null = null;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let hasEmittedRedisError = false;
      let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
      let snapshotInFlight = false;
      let pendingSnapshot: {
        queueEvent?: SnapshotQueueEvent;
        trigger: BackofficeStreamSnapshotTrigger;
      } | null = null;
      const connection = redisUrl
        ? new Redis(redisOptionsFromUrl(redisUrl, { maxRetriesPerRequest: null }))
        : null;
      const queueEvents = connection ? new QueueEvents(queueName, { connection }) : null;
      let cleanupQueueEventListeners: (() => void) | null = null;

      const send: BackofficeStreamSend = (event, payload) => {
        if (closed) return;
        controller.enqueue(
          encodeServerSentEvent(event, withBackofficeStreamMetadata(payload, { queueName })),
        );
      };

      const sendSnapshot = async (
        trigger: BackofficeStreamSnapshotTrigger,
        queueEvent?: SnapshotQueueEvent,
      ) => {
        if (closed) return;
        if (snapshotInFlight) {
          pendingSnapshot = { queueEvent, trigger };
          return;
        }

        snapshotInFlight = true;
        try {
          send('snapshot', await readSnapshot({ queueEvent, trigger }));
        } catch (error) {
          recordBackofficeSseLifecycle({ event: 'snapshot_error', queueName });
          logError(logSnapshotErrorMessage, error);
          send(errorEvent, { message: streamSnapshotErrorMessage });
        } finally {
          snapshotInFlight = false;
          if (pendingSnapshot) {
            const nextSnapshot = pendingSnapshot;
            pendingSnapshot = null;
            void sendSnapshot(nextSnapshot.trigger, nextSnapshot.queueEvent);
          }
        }
      };

      const scheduleSnapshot: BackofficeStreamScheduleSnapshot = (trigger, queueEvent) => {
        if (snapshotTimer !== null) {
          clearTimeout(snapshotTimer);
        }
        snapshotTimer = setTimeout(
          () => {
            snapshotTimer = null;
            void sendSnapshot(trigger, queueEvent);
          },
          trigger === 'queue-event' ? BACKOFFICE_STREAM_SNAPSHOT_DEBOUNCE_MS : 0,
        );
      };

      const heartbeat = setInterval(() => {
        send('heartbeat', {});
      }, BACKOFFICE_STREAM_HEARTBEAT_INTERVAL_MS);

      const cleanup = async () => {
        if (closed) return;
        closed = true;
        recordBackofficeSseLifecycle({ event: 'closed', queueName });
        cleanupStream = null;
        if (snapshotTimer !== null) {
          clearTimeout(snapshotTimer);
        }
        clearInterval(heartbeat);
        cleanupQueueEventListeners?.();
        queueEvents?.removeAllListeners();
        connection?.removeAllListeners();
        await queueEvents?.close().catch(() => undefined);
        await connection?.quit().catch(() => undefined);
        try {
          controller.close();
        } catch {
          // The client can close the stream before cleanup finishes.
        }
      };
      cleanupStream = cleanup;

      if (request.signal.aborted) {
        void cleanup();
        return;
      }

      request.signal.addEventListener(
        'abort',
        () => {
          void cleanup();
        },
        { once: true },
      );

      if (!connection || !queueEvents) {
        recordBackofficeSseLifecycle({ event: 'connected_snapshot_only', queueName });
        send('connected', connectedPayload('snapshot-only'));
        if (sendSnapshotWhenRedisUnavailable) {
          scheduleSnapshot('redis-unavailable');
        }
        return;
      }

      const forward = (type: string) => (rawPayload: QueueEventPayload) => {
        const payload = normalizeQueueEventPayload(rawPayload);
        recordBackofficeSseLifecycle({ event: 'queue_event', queueName });
        if (onQueueEvent) {
          onQueueEvent({ payload, scheduleSnapshot, send, type });
          return;
        }
        if (type !== 'progress') {
          scheduleSnapshot('queue-event', { payload, type });
        }
      };

      connection.on('error', (error) => {
        if (suppressDuplicateRedisErrors && hasEmittedRedisError) return;
        hasEmittedRedisError = true;
        recordBackofficeSseLifecycle({ event: 'redis_error', queueName });
        logError(logRedisErrorMessage, error);
        send(errorEvent, { message: streamRedisErrorMessage });
      });
      connection.on('ready', () => {
        hasEmittedRedisError = false;
      });

      cleanupQueueEventListeners = bindCatalogMaintenanceQueueEvents(queueEvents, forward);
      queueEvents.on('error', (error) => {
        recordBackofficeSseLifecycle({ event: 'queue_error', queueName });
        logError(logQueueErrorMessage, error);
        send(errorEvent, { message: streamQueueErrorMessage });
      });

      try {
        await queueEvents.waitUntilReady();
        recordBackofficeSseLifecycle({ event: 'connected_live', queueName });
        send('connected', connectedPayload('live'));
        scheduleSnapshot('connected');
      } catch (error) {
        recordBackofficeSseLifecycle({ event: 'open_error', queueName });
        logError(logOpenErrorMessage, error);
        send(errorEvent, { message: streamOpenErrorMessage });
        await cleanup();
      }
    },
    cancel() {
      void cleanupStream?.();
    },
  });
}

import { QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

import { CATALOG_MAINTENANCE_QUEUE_NAME } from '../../../../catalogMaintenanceQueue';
import { ensureBackofficeReady, logBackofficeError } from '../../../../lib/backoffice';
import { readCatalogHealthLiveData } from '../../../../lib/catalogHealthLiveServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const HEARTBEAT_INTERVAL_MS = 25_000;
const SNAPSHOT_DEBOUNCE_MS = 350;

type QueueEventPayload = Record<string, unknown> | string | number | null | undefined;
type SnapshotTrigger = 'connected' | 'queue-event' | 'redis-unavailable';
type SnapshotQueueEvent = { payload: Record<string, unknown>; type: string };
type PendingSnapshot = {
  queueEvent?: SnapshotQueueEvent;
  trigger: SnapshotTrigger;
};

function encodeServerSentEvent(event: string, payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function normalizePayload(payload: QueueEventPayload): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload;
  }
  return { value: payload ?? null };
}

export async function GET(request: Request) {
  try {
    const config = await ensureBackofficeReady();
    const requestUrl = new URL(request.url);

    let cleanupStream: (() => Promise<void>) | null = null;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
        let snapshotInFlight = false;
        let pendingSnapshot: PendingSnapshot | null = null;
        const connection = config.redisUrl
          ? new Redis(config.redisUrl, { maxRetriesPerRequest: null })
          : null;
        const queueEvents = connection
          ? new QueueEvents(CATALOG_MAINTENANCE_QUEUE_NAME, { connection })
          : null;

        const send = (event: string, payload: Record<string, unknown>) => {
          if (closed) return;
          controller.enqueue(
            encodeServerSentEvent(event, {
              ...payload,
              queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
              receivedAt: new Date().toISOString(),
            }),
          );
        };

        const sendSnapshot = async (trigger: SnapshotTrigger, queueEvent?: SnapshotQueueEvent) => {
          if (closed) return;
          if (snapshotInFlight) {
            pendingSnapshot = { queueEvent, trigger };
            return;
          }

          snapshotInFlight = true;
          try {
            const data = await readCatalogHealthLiveData({
              config,
              searchParams: requestUrl.searchParams,
            });
            send('snapshot', {
              data,
              queueEvent,
              trigger,
            });
          } catch (error) {
            logBackofficeError('Failed to stream live catalog health snapshot', error);
            send('stream-error', { message: 'Failed to read live catalog health snapshot.' });
          } finally {
            snapshotInFlight = false;
            if (pendingSnapshot) {
              const nextSnapshot = pendingSnapshot;
              pendingSnapshot = null;
              void sendSnapshot(nextSnapshot.trigger, nextSnapshot.queueEvent);
            }
          }
        };

        const scheduleSnapshot = (trigger: SnapshotTrigger, queueEvent?: SnapshotQueueEvent) => {
          if (snapshotTimer !== null) {
            clearTimeout(snapshotTimer);
          }
          snapshotTimer = setTimeout(
            () => {
              snapshotTimer = null;
              void sendSnapshot(trigger, queueEvent);
            },
            trigger === 'queue-event' ? SNAPSHOT_DEBOUNCE_MS : 0,
          );
        };

        const cleanup = async () => {
          if (closed) return;
          closed = true;
          cleanupStream = null;
          if (snapshotTimer !== null) {
            clearTimeout(snapshotTimer);
          }
          clearInterval(heartbeat);
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

        const heartbeat = setInterval(() => {
          send('heartbeat', {});
        }, HEARTBEAT_INTERVAL_MS);

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
          send('connected', { mode: 'snapshot-only' });
          scheduleSnapshot('redis-unavailable');
          return;
        }

        const forward = (type: string) => (payload: QueueEventPayload) => {
          if (type === 'progress') return;
          scheduleSnapshot('queue-event', { type, payload: normalizePayload(payload) });
        };

        let hasEmittedRedisError = false;
        connection.on('error', (error) => {
          if (hasEmittedRedisError) return;
          hasEmittedRedisError = true;
          logBackofficeError('Backoffice catalog health stream Redis error', error);
          send('stream-error', { message: 'Redis connection error.' });
        });
        connection.on('ready', () => {
          hasEmittedRedisError = false;
        });

        queueEvents.on('waiting', forward('waiting'));
        queueEvents.on('active', forward('active'));
        queueEvents.on('completed', forward('completed'));
        queueEvents.on('failed', forward('failed'));
        queueEvents.on('delayed', forward('delayed'));
        queueEvents.on('stalled', forward('stalled'));
        queueEvents.on('drained', forward('drained'));
        queueEvents.on('progress', forward('progress'));
        queueEvents.on('error', (error) => {
          logBackofficeError('Backoffice catalog health stream queue error', error);
          send('stream-error', { message: 'Queue events stream error.' });
        });

        try {
          await queueEvents.waitUntilReady();
          send('connected', { mode: 'live' });
          scheduleSnapshot('connected');
        } catch (error) {
          logBackofficeError('Failed to open catalog health live stream', error);
          send('stream-error', { message: 'Failed to open catalog health live stream.' });
          await cleanup();
        }
      },
      cancel() {
        void cleanupStream?.();
      },
    });

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
      },
    });
  } catch (error) {
    logBackofficeError('Failed to start catalog health live stream', error);
    return new Response('Failed to start catalog health live stream.', { status: 500 });
  }
}

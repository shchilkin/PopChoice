import { QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

import { CATALOG_MAINTENANCE_QUEUE_NAME } from '../../../../catalogMaintenanceQueue';
import { ensureBackofficeReady, logBackofficeError } from '../../../../lib/backoffice';
import {
  BACKOFFICE_STREAM_HEARTBEAT_INTERVAL_MS,
  BACKOFFICE_STREAM_SNAPSHOT_DEBOUNCE_MS,
  bindCatalogMaintenanceQueueEvents,
  createServerSentEventResponse,
  encodeServerSentEvent,
  normalizeQueueEventPayload,
  withBackofficeStreamMetadata,
  type QueueEventPayload,
  type SnapshotQueueEvent,
} from '../../../../lib/backofficeEventStream';
import { readCatalogHealthLiveData } from '../../../../lib/catalogHealthLiveServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type SnapshotTrigger = 'connected' | 'queue-event' | 'redis-unavailable';
type PendingSnapshot = {
  queueEvent?: SnapshotQueueEvent;
  trigger: SnapshotTrigger;
};

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
            encodeServerSentEvent(
              event,
              withBackofficeStreamMetadata(payload, {
                queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
              }),
            ),
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
            trigger === 'queue-event' ? BACKOFFICE_STREAM_SNAPSHOT_DEBOUNCE_MS : 0,
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
        }, BACKOFFICE_STREAM_HEARTBEAT_INTERVAL_MS);

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
          scheduleSnapshot('queue-event', { type, payload: normalizeQueueEventPayload(payload) });
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

        bindCatalogMaintenanceQueueEvents(queueEvents, forward);
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

    return createServerSentEventResponse(stream);
  } catch (error) {
    logBackofficeError('Failed to start catalog health live stream', error);
    return new Response('Failed to start catalog health live stream.', { status: 500 });
  }
}

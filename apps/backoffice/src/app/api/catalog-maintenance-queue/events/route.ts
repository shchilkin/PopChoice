import { QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

import {
  CATALOG_MAINTENANCE_QUEUE_NAME,
  listCatalogMaintenanceQueueJobs,
} from '../../../../catalogMaintenanceQueue';
import {
  ensureBackofficeReady,
  logBackofficeError,
  parseCatalogMaintenanceQueueParams,
} from '../../../../lib/backoffice';
import {
  BACKOFFICE_STREAM_HEARTBEAT_INTERVAL_MS,
  BACKOFFICE_STREAM_SNAPSHOT_DEBOUNCE_MS,
  bindCatalogMaintenanceQueueEvents,
  createServerSentEventResponse,
  encodeServerSentEvent,
  getSearchParamsRecord,
  normalizeQueueEventPayload,
  withBackofficeStreamMetadata,
  type QueueEventPayload,
  type SnapshotQueueEvent,
} from '../../../../lib/backofficeEventStream';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const config = await ensureBackofficeReady();
    const requestUrl = new URL(request.url);

    const redisUrl = config.redisUrl;

    if (!redisUrl) {
      return new Response('Catalog maintenance queue events require REDIS_URL.', { status: 503 });
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
        let snapshotInFlight = false;
        let snapshotQueued = false;
        const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
        const queueEvents = new QueueEvents(CATALOG_MAINTENANCE_QUEUE_NAME, { connection });
        const queueParams = parseCatalogMaintenanceQueueParams(
          getSearchParamsRecord(requestUrl.searchParams),
        );

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

        const forward = (type: string) => (payload: QueueEventPayload) => {
          const normalizedPayload = normalizeQueueEventPayload(payload);
          send('queue-event', { type, payload: normalizedPayload });
          if (type !== 'progress') {
            scheduleSnapshot('queue-event', { type, payload: normalizedPayload });
          }
        };

        const sendSnapshot = async (
          trigger: 'connected' | 'queue-event',
          queueEvent?: SnapshotQueueEvent,
        ) => {
          if (closed) return;
          if (snapshotInFlight) {
            snapshotQueued = true;
            return;
          }

          snapshotInFlight = true;
          try {
            const jobPage = await listCatalogMaintenanceQueueJobs({
              limit: queueParams.limit,
              offset: queueParams.offset,
              redisUrl,
              state: queueParams.state,
            });
            send('snapshot', {
              jobPage,
              queueEvent,
              trigger,
            });
          } catch (error) {
            logBackofficeError('Failed to stream catalog maintenance queue snapshot', error);
            send('queue-error', { message: 'Failed to read queue snapshot.' });
            void cleanup();
          } finally {
            snapshotInFlight = false;
            if (snapshotQueued) {
              snapshotQueued = false;
              void sendSnapshot('queue-event');
            }
          }
        };

        const scheduleSnapshot = (
          trigger: 'connected' | 'queue-event',
          queueEvent?: SnapshotQueueEvent,
        ) => {
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
          if (snapshotTimer !== null) {
            clearTimeout(snapshotTimer);
          }
          clearInterval(heartbeat);
          queueEvents.removeAllListeners();
          connection.removeAllListeners();
          await queueEvents.close().catch(() => undefined);
          await connection.quit().catch(() => undefined);
          try {
            controller.close();
          } catch {
            // The client can close the stream before cleanup finishes.
          }
        };

        const heartbeat = setInterval(() => {
          send('heartbeat', {});
        }, BACKOFFICE_STREAM_HEARTBEAT_INTERVAL_MS);

        request.signal.addEventListener('abort', () => {
          void cleanup();
        });

        connection.on('error', (error) => {
          logBackofficeError('Backoffice queue events Redis error', error);
          send('queue-error', { message: 'Redis connection error.' });
        });

        bindCatalogMaintenanceQueueEvents(queueEvents, forward);
        queueEvents.on('error', (error) => {
          logBackofficeError('Backoffice queue events stream error', error);
          send('queue-error', { message: 'Queue events stream error.' });
        });

        try {
          await queueEvents.waitUntilReady();
          send('connected', {});
          scheduleSnapshot('connected');
        } catch (error) {
          logBackofficeError('Failed to open catalog maintenance queue event stream', error);
          send('queue-error', { message: 'Failed to open queue event stream.' });
          await cleanup();
        }
      },
    });

    return createServerSentEventResponse(stream);
  } catch (error) {
    logBackofficeError('Failed to start catalog maintenance queue event stream', error);
    return new Response('Failed to start catalog maintenance queue event stream.', { status: 500 });
  }
}

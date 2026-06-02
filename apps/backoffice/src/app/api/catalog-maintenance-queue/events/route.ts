import { QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

import { CATALOG_MAINTENANCE_QUEUE_NAME } from '../../../../catalogMaintenanceQueue';
import { ensureBackofficeReady, logBackofficeError } from '../../../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const HEARTBEAT_INTERVAL_MS = 25_000;

type QueueEventPayload = Record<string, unknown> | string | number | null | undefined;

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

    const redisUrl = config.redisUrl;

    if (!redisUrl) {
      return new Response('Catalog maintenance queue events require REDIS_URL.', { status: 503 });
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
        const queueEvents = new QueueEvents(CATALOG_MAINTENANCE_QUEUE_NAME, { connection });

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

        const forward = (type: string) => (payload: QueueEventPayload) => {
          send('queue-event', { type, payload: normalizePayload(payload) });
        };

        const cleanup = async () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          queueEvents.removeAllListeners();
          connection.removeAllListeners();
          await queueEvents.close().catch(() => undefined);
          await connection.quit().catch(() => undefined);
          controller.close();
        };

        const heartbeat = setInterval(() => {
          send('heartbeat', {});
        }, HEARTBEAT_INTERVAL_MS);

        request.signal.addEventListener('abort', () => {
          void cleanup();
        });

        connection.on('error', (error) => {
          logBackofficeError('Backoffice queue events Redis error', error);
          send('queue-error', { message: 'Redis connection error.' });
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
          logBackofficeError('Backoffice queue events stream error', error);
          send('queue-error', { message: 'Queue events stream error.' });
        });

        try {
          await queueEvents.waitUntilReady();
          send('connected', {});
        } catch (error) {
          logBackofficeError('Failed to open catalog maintenance queue event stream', error);
          send('queue-error', { message: 'Failed to open queue event stream.' });
          await cleanup();
        }
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
    logBackofficeError('Failed to start catalog maintenance queue event stream', error);
    return new Response('Failed to start catalog maintenance queue event stream.', { status: 500 });
  }
}

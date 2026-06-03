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
  createBackofficeQueueEventStream,
  createServerSentEventResponse,
  getSearchParamsRecord,
} from '../../../../lib/backofficeEventStream';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const config = await ensureBackofficeReady();
    const requestUrl = new URL(request.url);

    const redisUrl = config.redisUrl;

    const queueParams = parseCatalogMaintenanceQueueParams(
      getSearchParamsRecord(requestUrl.searchParams),
    );
    const stream = createBackofficeQueueEventStream({
      connectedPayload: (mode) => ({ mode }),
      errorEvent: 'queue-error',
      logError: logBackofficeError,
      logOpenErrorMessage: 'Failed to open catalog maintenance queue event stream',
      logQueueErrorMessage: 'Backoffice queue events stream error',
      logRedisErrorMessage: 'Backoffice queue events Redis error',
      logSnapshotErrorMessage: 'Failed to stream catalog maintenance queue snapshot',
      onQueueEvent: ({ payload, scheduleSnapshot, send, type }) => {
        send('queue-event', { payload, type });
        if (type !== 'progress') {
          scheduleSnapshot('queue-event', { payload, type });
        }
      },
      queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
      readSnapshot: async ({ queueEvent, trigger }) => ({
        jobPage: await listCatalogMaintenanceQueueJobs({
          limit: queueParams.limit,
          offset: queueParams.offset,
          redisUrl,
          state: queueParams.state,
        }),
        queueEvent,
        trigger,
      }),
      redisUrl,
      request,
      sendSnapshotWhenRedisUnavailable: true,
      streamOpenErrorMessage: 'Failed to open queue event stream.',
      streamQueueErrorMessage: 'Queue events stream error.',
      streamRedisErrorMessage: 'Redis connection error.',
      streamSnapshotErrorMessage: 'Failed to read queue snapshot.',
    });

    return createServerSentEventResponse(stream);
  } catch (error) {
    logBackofficeError('Failed to start catalog maintenance queue event stream', error);
    return new Response('Failed to start catalog maintenance queue event stream.', { status: 500 });
  }
}

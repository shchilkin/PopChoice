import { CATALOG_MAINTENANCE_QUEUE_NAME } from '../../../../catalogMaintenanceQueue';
import { ensureBackofficeReady, logBackofficeError } from '../../../../lib/backoffice';
import {
  createBackofficeQueueEventStream,
  createServerSentEventResponse,
} from '../../../../lib/backofficeEventStream';
import { readCatalogHealthLiveData } from '../../../../lib/catalogHealthLiveServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const config = await ensureBackofficeReady();
    const requestUrl = new URL(request.url);

    const stream = createBackofficeQueueEventStream({
      connectedPayload: (mode) => ({ mode }),
      errorEvent: 'stream-error',
      logError: logBackofficeError,
      logOpenErrorMessage: 'Failed to open catalog health live stream',
      logQueueErrorMessage: 'Backoffice catalog health stream queue error',
      logRedisErrorMessage: 'Backoffice catalog health stream Redis error',
      logSnapshotErrorMessage: 'Failed to stream live catalog health snapshot',
      onQueueEvent: ({ payload, scheduleSnapshot, type }) => {
        if (type !== 'progress') {
          scheduleSnapshot('queue-event', { payload, type });
        }
      },
      queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
      readSnapshot: async ({ queueEvent, trigger }) => ({
        data: await readCatalogHealthLiveData({
          config,
          searchParams: requestUrl.searchParams,
        }),
        queueEvent,
        trigger,
      }),
      redisUrl: config.redisUrl,
      request,
      sendSnapshotWhenRedisUnavailable: true,
      streamOpenErrorMessage: 'Failed to open catalog health live stream.',
      streamQueueErrorMessage: 'Queue events stream error.',
      streamRedisErrorMessage: 'Redis connection error.',
      streamSnapshotErrorMessage: 'Failed to read live catalog health snapshot.',
      suppressDuplicateRedisErrors: true,
    });

    return createServerSentEventResponse(stream);
  } catch (error) {
    logBackofficeError('Failed to start catalog health live stream', error);
    return new Response('Failed to start catalog health live stream.', { status: 500 });
  }
}

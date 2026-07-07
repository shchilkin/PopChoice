import { listCatalogMaintenanceQueueJobs } from '../../catalogMaintenanceQueue';
import { BackofficeErrorPage, CatalogMaintenanceQueuePage } from '../../components/backoffice';
import {
  ensureBackofficeReady,
  logBackofficeError,
  parseCatalogMaintenanceQueueParams,
} from '../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type QueuePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QueuePage({ searchParams }: QueuePageProps) {
  try {
    const config = await ensureBackofficeReady();
    const params = (await searchParams) ?? {};
    const pagination = parseCatalogMaintenanceQueueParams(params);
    const jobPage = await listCatalogMaintenanceQueueJobs({
      limit: pagination.limit,
      offset: pagination.offset,
      redisUrl: config.redisUrl,
      state: pagination.state,
    });

    return <CatalogMaintenanceQueuePage bullBoardUrl={config.bullBoardUrl} jobPage={jobPage} />;
  } catch (error) {
    logBackofficeError('Failed to render catalog maintenance queue', error);
    return <BackofficeErrorPage active="queue" error={error} retryHref="/queue" />;
  }
}

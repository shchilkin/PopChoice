import type {
  CatalogMaintenanceQueueJobPage,
  CatalogMaintenanceQueueJobState,
  CatalogMaintenanceQueueJobSummary,
} from '../../catalogMaintenanceQueue';
import { formatLiveSyncTime } from '../liveRefreshTime';

export const QUEUE_STATES = [
  'waiting',
  'active',
  'delayed',
  'failed',
  'completed',
] as const satisfies readonly CatalogMaintenanceQueueJobState[];

export const STATE_LABELS: Record<CatalogMaintenanceQueueJobState, string> = {
  active: 'Active',
  completed: 'Completed',
  delayed: 'Scheduled',
  failed: 'Failed',
  waiting: 'Waiting',
};

export function getQueueStateCount(
  jobPage: CatalogMaintenanceQueueJobPage,
  state: CatalogMaintenanceQueueJobState,
): number {
  if (state === 'waiting') return jobPage.counts.waiting;
  return jobPage.counts[state];
}

export function getQueueStateClass(state: CatalogMaintenanceQueueJobState): string {
  if (state === 'failed') return 'failed';
  if (state === 'completed') return 'completed';
  if (state === 'active') return 'active';
  return 'queued';
}

export function buildQueueHref({
  page,
  pageSize,
  state,
}: {
  page: number;
  pageSize: number;
  state: CatalogMaintenanceQueueJobState;
}) {
  const params = new URLSearchParams();
  params.set('state', state);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  return `/queue?${params.toString()}`;
}

export function getQueueHealth(jobPage: CatalogMaintenanceQueueJobPage): {
  state: 'healthy' | 'warning' | 'active' | 'unavailable';
  title: string;
  copy: string;
} {
  if (!jobPage.available) {
    return {
      state: 'unavailable',
      title: 'Queue connection unavailable',
      copy: 'Set REDIS_URL and check backoffice logs before enqueueing repairs.',
    };
  }
  if (jobPage.counts.failed > 0) {
    return {
      state: 'warning',
      title: 'Failed catalog jobs need review',
      copy: 'Open failed jobs first, then follow the movie or batch link before retrying in Bull Board.',
    };
  }
  if (jobPage.openJobs > 0) {
    return {
      state: 'active',
      title: 'Catalog maintenance has open work',
      copy: 'This view updates as workers move jobs through waiting, active, and scheduled states.',
    };
  }

  return {
    state: 'healthy',
    title: 'Catalog maintenance queue is clear',
    copy: 'No open catalog-maintenance jobs are waiting, active, or scheduled.',
  };
}

export function getQueueJobLinks(
  job: Pick<CatalogMaintenanceQueueJobSummary, 'movieId' | 'repairBatchId'>,
): Array<{
  href: string;
  label: string;
}> {
  const links: Array<{ href: string; label: string }> = [];

  if (job.movieId) {
    links.push({
      href: `/movies/${encodeURIComponent(job.movieId)}`,
      label: `Movie ${job.movieId}`,
    });
  }
  if (job.repairBatchId) {
    links.push({
      href: `/repair-batches/${encodeURIComponent(job.repairBatchId)}`,
      label: `Batch ${job.repairBatchId}`,
    });
  }

  return links;
}

export function getLastQueueEvent(
  job: Pick<CatalogMaintenanceQueueJobSummary, 'createdAt' | 'finishedAt' | 'processedAt'>,
): string {
  if (job.finishedAt) return `Finished ${formatLiveSyncTime(job.finishedAt)}`;
  if (job.processedAt) return `Started ${formatLiveSyncTime(job.processedAt)}`;
  return job.createdAt ? `Created ${formatLiveSyncTime(job.createdAt)}` : 'Created unknown';
}

export function queueRealtimeCopy(status: 'connecting' | 'connected' | 'error'): string {
  if (status === 'connected') return 'Queue updates are live';
  if (status === 'connecting') return 'Connecting to live updates';
  return 'Live updates are reconnecting';
}

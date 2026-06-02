'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  CatalogMaintenanceQueueJobPage,
  CatalogMaintenanceQueueJobState,
  CatalogMaintenanceQueueJobSummary,
} from '../../catalogMaintenanceQueue';
import { parseCatalogMaintenanceQueueSnapshotMessage } from '../../lib/catalogMaintenanceQueueLive';
import { formatLiveSyncTime } from '../liveRefreshTime';
import { SimplePaginationControls } from '../shared';

type RealtimeStatus = 'connecting' | 'connected' | 'error';

const QUEUE_STATES = [
  'waiting',
  'active',
  'delayed',
  'failed',
  'completed',
] as const satisfies readonly CatalogMaintenanceQueueJobState[];

const STATE_LABELS: Record<CatalogMaintenanceQueueJobState, string> = {
  active: 'Active',
  completed: 'Completed',
  delayed: 'Scheduled',
  failed: 'Failed',
  waiting: 'Waiting',
};

function getQueueStateCount(
  jobPage: CatalogMaintenanceQueueJobPage,
  state: CatalogMaintenanceQueueJobState,
): number {
  if (state === 'waiting') return jobPage.counts.waiting;
  return jobPage.counts[state];
}

function getQueueStateClass(state: CatalogMaintenanceQueueJobState): string {
  if (state === 'failed') return 'failed';
  if (state === 'completed') return 'completed';
  if (state === 'active') return 'active';
  return 'queued';
}

function buildQueueHref({
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

function getQueueHealth(jobPage: CatalogMaintenanceQueueJobPage): {
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

function QueueStateTabs({ jobPage }: { jobPage: CatalogMaintenanceQueueJobPage }) {
  return (
    <nav className="queue-tabs" aria-label="Catalog maintenance queue states">
      {QUEUE_STATES.map((state) => (
        <a
          key={state}
          className={jobPage.state === state ? 'active' : ''}
          href={buildQueueHref({ page: 1, pageSize: jobPage.limit, state })}
        >
          <span>{STATE_LABELS[state]}</span>
          <strong>{getQueueStateCount(jobPage, state)}</strong>
        </a>
      ))}
    </nav>
  );
}

function QueueCommandStrip({
  bullBoardUrl,
  jobPage,
}: {
  bullBoardUrl?: string;
  jobPage: CatalogMaintenanceQueueJobPage;
}) {
  const health = getQueueHealth(jobPage);

  return (
    <section className={`queue-command-strip ${health.state}`}>
      <div className="queue-command-main">
        <span
          className={`queue-dot ${health.state === 'healthy' ? '' : health.state === 'active' ? 'neutral' : 'warning'}`}
          aria-hidden="true"
        />
        <div>
          <h2>{health.title}</h2>
          <p>{health.copy}</p>
        </div>
      </div>
      <div className="queue-command-metrics" aria-label="Queue health metrics">
        <span>
          <strong>{jobPage.openJobs}</strong> open
        </span>
        <span className={jobPage.counts.failed > 0 ? 'warn' : ''}>
          <strong>{jobPage.counts.failed}</strong> failed
        </span>
        <span>
          <strong>{jobPage.counts.waiting}</strong> waiting
        </span>
        <span>
          <strong>{jobPage.counts.delayed}</strong> scheduled
        </span>
      </div>
      <div className="queue-command-actions">
        {jobPage.counts.failed > 0 && jobPage.state !== 'failed' ? (
          <a
            className="button secondary small"
            href={buildQueueHref({ page: 1, pageSize: jobPage.limit, state: 'failed' })}
          >
            Review failed
          </a>
        ) : null}
        {bullBoardUrl ? (
          <a className="button small" href={bullBoardUrl}>
            Open Bull Board
          </a>
        ) : null}
      </div>
    </section>
  );
}

function QueueStateGuide() {
  return (
    <div className="queue-state-guide">
      <span>
        <strong>Waiting</strong> ready for a worker
      </span>
      <span>
        <strong>Active</strong> running now
      </span>
      <span>
        <strong>Scheduled</strong> delayed for retry or timing
      </span>
      <span>
        <strong>Failed</strong> needs review
      </span>
      <span>
        <strong>Completed</strong> recent finished work
      </span>
    </div>
  );
}

function QueuePageSizeLinks({ jobPage }: { jobPage: CatalogMaintenanceQueueJobPage }) {
  return (
    <div className="queue-page-size" aria-label="Queue page size">
      <span>Rows</span>
      {[25, 50].map((pageSize) =>
        jobPage.limit === pageSize ? (
          <span key={pageSize} className="button small disabled" aria-current="true">
            {pageSize}
          </span>
        ) : (
          <a
            key={pageSize}
            className="button small quiet"
            href={buildQueueHref({ page: 1, pageSize, state: jobPage.state })}
          >
            {pageSize}
          </a>
        ),
      )}
    </div>
  );
}

function QueuePayload({ job }: { job: CatalogMaintenanceQueueJobSummary }) {
  if (job.payload.length === 0) return <span className="muted">No shown fields</span>;

  return (
    <div className="queue-payload">
      {job.payload.map((item) => (
        <span key={`${job.id}-${item.label}`}>
          <strong>{item.label}</strong>
          {item.value}
        </span>
      ))}
    </div>
  );
}

function QueueJobDetails({ job }: { job: CatalogMaintenanceQueueJobSummary }) {
  return (
    <div className="queue-job-details">
      <QueuePayload job={job} />
      {job.state === 'failed' && job.failedReason ? (
        <p className="queue-failure">Last failure: {job.failedReason}</p>
      ) : null}
    </div>
  );
}

function QueueJobLinks({ job }: { job: CatalogMaintenanceQueueJobSummary }) {
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

  if (links.length === 0) return <span className="muted">-</span>;

  return (
    <div className="queue-links">
      {links.map((link) => (
        <a key={link.href} className="button small quiet" href={link.href}>
          {link.label}
        </a>
      ))}
    </div>
  );
}

function getLastQueueEvent(job: CatalogMaintenanceQueueJobSummary): string {
  if (job.finishedAt) return `Finished ${formatLiveSyncTime(job.finishedAt)}`;
  if (job.processedAt) return `Started ${formatLiveSyncTime(job.processedAt)}`;
  return job.createdAt ? `Created ${formatLiveSyncTime(job.createdAt)}` : 'Created unknown';
}

function QueueJobRows({
  jobs,
  state,
}: {
  jobs: CatalogMaintenanceQueueJobSummary[];
  state: CatalogMaintenanceQueueJobState;
}) {
  if (jobs.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="empty">
          No {STATE_LABELS[state].toLowerCase()} jobs. Check another queue state or open Bull Board
          for full internals.
        </td>
      </tr>
    );
  }

  return (
    <>
      {jobs.map((job) => (
        <tr key={`${job.state}-${job.id}`}>
          <td>
            <div className="queue-job-title">
              <strong>{job.name}</strong>
              <span>#{job.id}</span>
            </div>
          </td>
          <td>
            <span className={`status queue-job-status ${getQueueStateClass(job.state)}`}>
              {STATE_LABELS[job.state]}
            </span>
          </td>
          <td>
            <QueueJobDetails job={job} />
          </td>
          <td>
            {job.attemptsConfigured === null
              ? job.attemptsMade
              : `${job.attemptsMade}/${job.attemptsConfigured}`}
          </td>
          <td>{getLastQueueEvent(job)}</td>
          <td>
            <QueueJobLinks job={job} />
          </td>
        </tr>
      ))}
    </>
  );
}

function QueueRealtimeStatus({
  lastEventAt,
  status,
}: {
  lastEventAt: string | null;
  status: RealtimeStatus;
}) {
  const copy =
    status === 'connected'
      ? 'Queue updates are live'
      : status === 'connecting'
        ? 'Connecting to live updates'
        : 'Live updates are reconnecting';
  const lastEvent = lastEventAt ? formatLiveSyncTime(lastEventAt) : null;

  return (
    <div className={`live-refresh realtime-refresh ${status}`} aria-live="polite">
      <span
        className={`live-refresh-dot ${status === 'connecting' ? 'pending' : status === 'error' ? 'error' : ''}`}
        aria-hidden="true"
      />
      <span>{copy}</span>
      <span className="live-refresh-meta">
        {lastEvent ? `Updated ${lastEvent}` : 'Waiting for the first update'}
      </span>
    </div>
  );
}

export function CatalogMaintenanceQueueRealtime({
  bullBoardUrl,
  initialJobPage,
}: {
  bullBoardUrl?: string;
  initialJobPage: CatalogMaintenanceQueueJobPage;
}) {
  const searchParams = useSearchParams();
  const [jobPage, setJobPage] = useState(initialJobPage);
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const [lastEventAt, setLastEventAt] = useState<string | null>(initialJobPage.updatedAt);
  const initialFingerprint = useRef(
    `${initialJobPage.state}:${initialJobPage.offset}:${initialJobPage.limit}:${initialJobPage.updatedAt}`,
  );
  const search = useMemo(() => {
    const serialized = searchParams.toString();
    return serialized ? `?${serialized}` : '';
  }, [searchParams]);

  useEffect(() => {
    const nextFingerprint = `${initialJobPage.state}:${initialJobPage.offset}:${initialJobPage.limit}:${initialJobPage.updatedAt}`;
    if (initialFingerprint.current === nextFingerprint) return;

    initialFingerprint.current = nextFingerprint;
    setJobPage(initialJobPage);
    setLastEventAt(initialJobPage.updatedAt);
    setStatus('connecting');
  }, [initialJobPage]);

  useEffect(() => {
    setStatus('connecting');
    const source = new EventSource(`/api/catalog-maintenance-queue/events${search}`);

    source.addEventListener('connected', () => {
      setStatus('connected');
    });
    source.addEventListener('snapshot', (event: MessageEvent<string>) => {
      const message = parseCatalogMaintenanceQueueSnapshotMessage(event.data);
      if (!message) {
        setStatus('error');
        return;
      }

      setJobPage(message.jobPage);
      setLastEventAt(message.receivedAt);
      setStatus('connected');
    });
    source.addEventListener('heartbeat', () => {
      setStatus((current) => (current === 'error' ? current : 'connected'));
    });
    source.addEventListener('queue-error', () => {
      setStatus('error');
    });
    source.onerror = () => {
      setStatus('error');
    };

    return () => {
      source.close();
    };
  }, [search]);

  return (
    <>
      <QueueRealtimeStatus lastEventAt={lastEventAt} status={status} />
      <QueueCommandStrip bullBoardUrl={bullBoardUrl} jobPage={jobPage} />
      <section className="panel queue-panel">
        <div className="panel-header">
          <div>
            <h2>{STATE_LABELS[jobPage.state]} jobs</h2>
            <p className="small-note">
              Shown fields are reduced to movie, reason, batch, and timing. Full job details stay in
              Bull Board.
            </p>
          </div>
          <div className="panel-actions">
            <QueuePageSizeLinks jobPage={jobPage} />
            <span className="count">{jobPage.totalCount}</span>
          </div>
        </div>
        <QueueStateTabs jobPage={jobPage} />
        <QueueStateGuide />
        <SimplePaginationControls
          ariaLabel="Catalog maintenance queue pagination"
          emptyLabel={`No ${STATE_LABELS[jobPage.state].toLowerCase()} jobs`}
          itemLabel={`${STATE_LABELS[jobPage.state].toLowerCase()} jobs`}
          limit={jobPage.limit}
          offset={jobPage.offset}
          totalCount={jobPage.totalCount}
          hrefForPage={(page) =>
            buildQueueHref({ page, pageSize: jobPage.limit, state: jobPage.state })
          }
        />
        <div className="table-scroll">
          <table className="queue-jobs-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>State</th>
                <th>Details</th>
                <th>Attempts</th>
                <th>Last update</th>
                <th>Links</th>
              </tr>
            </thead>
            <tbody>
              <QueueJobRows jobs={jobPage.jobs} state={jobPage.state} />
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

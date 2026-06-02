import type {
  CatalogMaintenanceQueueJobPage,
  CatalogMaintenanceQueueJobState,
  CatalogMaintenanceQueueJobSummary,
} from '../../catalogMaintenanceQueue';
import { CATALOG_MAINTENANCE_QUEUE_JOB_STATES } from '../../catalogMaintenanceQueue';
import { formatBackofficeDateTime } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { CatalogMaintenanceRealtimeRefresh } from '../catalogMaintenanceRealtimeRefresh';
import { SimplePaginationControls } from '../shared';

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
      copy: 'Queue updates refresh this snapshot while workers move jobs through active and scheduled states.',
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
      {CATALOG_MAINTENANCE_QUEUE_JOB_STATES.map((state) => (
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
  if (job.finishedAt) return `Finished ${formatBackofficeDateTime(job.finishedAt)}`;
  if (job.processedAt) return `Started ${formatBackofficeDateTime(job.processedAt)}`;
  return `Created ${formatBackofficeDateTime(job.createdAt)}`;
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

export function CatalogMaintenanceQueuePage({
  bullBoardUrl,
  jobPage,
}: {
  bullBoardUrl?: string;
  jobPage: CatalogMaintenanceQueueJobPage;
}) {
  return (
    <BackofficeLayout
      active="queue"
      title="Catalog Maintenance Queue"
      eyebrow="Worker operations"
      description={
        <>
          Updated {formatBackofficeDateTime(jobPage.updatedAt)}. Queue changes refresh
          automatically.
        </>
      }
      actions={
        bullBoardUrl ? (
          <a className="button" href={bullBoardUrl}>
            Open Bull Board
          </a>
        ) : null
      }
    >
      <CatalogMaintenanceRealtimeRefresh />
      <QueueCommandStrip bullBoardUrl={bullBoardUrl} jobPage={jobPage} />
      <section className="panel queue-panel">
        <div className="panel-header">
          <div>
            <h2>{STATE_LABELS[jobPage.state]} jobs</h2>
            <p className="small-note">
              Shown fields are reduced to movie, reason, batch, and timing. Full job internals stay
              in Bull Board.
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
    </BackofficeLayout>
  );
}

import type {
  CatalogMaintenanceQueueJobPage,
  CatalogMaintenanceQueueJobState,
  CatalogMaintenanceQueueJobSummary,
} from '../../catalogMaintenanceQueue';
import { PanelHeader, SimplePaginationControls, TableEmptyRow, TableScroll } from '../shared';
import {
  buildQueueHref,
  getLastQueueEvent,
  getQueueJobLinks,
  getQueueStateClass,
  getQueueStateCount,
  QUEUE_STATES,
  STATE_LABELS,
  type QueueRealtimeStatus as QueueRealtimeStatusValue,
} from './helpers';
import {
  buildQueueCommandStripViewModel,
  buildQueueRealtimeStatusViewModel,
} from './realtimeViewModel';

const QUEUE_JOB_COLUMNS = ['Job', 'State', 'Details', 'Attempts', 'Last update', 'Links'] as const;

export function QueueCommandStrip({
  bullBoardUrl,
  jobPage,
}: {
  bullBoardUrl?: string;
  jobPage: CatalogMaintenanceQueueJobPage;
}) {
  const view = buildQueueCommandStripViewModel({ bullBoardUrl, jobPage });

  return (
    <section className={`queue-command-strip ${view.state}`}>
      <div className="queue-command-main">
        <span className={view.dotClassName} aria-hidden="true" />
        <div>
          <h2>{view.title}</h2>
          <p>{view.copy}</p>
        </div>
      </div>
      <div className="queue-command-metrics" aria-label="Queue health metrics">
        {view.metrics.map((metric) => (
          <span key={metric.label} className={metric.className}>
            <strong>{metric.value}</strong> {metric.label}
          </span>
        ))}
      </div>
      <div className="queue-command-actions">
        {view.actions.map((action) => (
          <a key={action.href} className={action.className} href={action.href}>
            {action.label}
          </a>
        ))}
      </div>
    </section>
  );
}

export function QueueJobsPanel({ jobPage }: { jobPage: CatalogMaintenanceQueueJobPage }) {
  return (
    <section className="panel queue-panel">
      <PanelHeader
        title={<h2>{STATE_LABELS[jobPage.state]} jobs</h2>}
        hint={
          <p className="small-note">
            Shown fields are reduced to movie, reason, batch, and timing. Full job details stay in
            Bull Board.
          </p>
        }
        actions={
          <div className="panel-actions">
            <QueuePageSizeLinks jobPage={jobPage} />
            <span className="count">{jobPage.totalCount}</span>
          </div>
        }
      />
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
      <TableScroll>
        <table className="queue-jobs-table">
          <thead>
            <tr>
              {QUEUE_JOB_COLUMNS.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <QueueJobRows jobs={jobPage.jobs} state={jobPage.state} />
          </tbody>
        </table>
      </TableScroll>
    </section>
  );
}

function QueueStateTabs({ jobPage }: { jobPage: CatalogMaintenanceQueueJobPage }) {
  return (
    <nav className="queue-tabs" aria-label="Catalog maintenance queue states">
      {QUEUE_STATES.map((state) => (
        <a
          key={state}
          className={jobPage.state === state ? 'active' : ''}
          aria-current={jobPage.state === state ? 'page' : undefined}
          href={buildQueueHref({ page: 1, pageSize: jobPage.limit, state })}
        >
          <span>{STATE_LABELS[state]}</span>
          <strong>{getQueueStateCount(jobPage, state)}</strong>
        </a>
      ))}
    </nav>
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

function QueueJobRows({
  jobs,
  state,
}: {
  jobs: CatalogMaintenanceQueueJobSummary[];
  state: CatalogMaintenanceQueueJobState;
}) {
  if (jobs.length === 0) {
    return (
      <TableEmptyRow colSpan={6}>
        No {STATE_LABELS[state].toLowerCase()} jobs. Check another queue state or open Bull Board
        for full internals.
      </TableEmptyRow>
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

function QueuePayload({ job }: { job: CatalogMaintenanceQueueJobSummary }) {
  if (job.payload.length === 0) return <span className="muted">No shown fields</span>;

  return (
    <div className="queue-payload">
      {job.payload.map((item) => (
        <span key={`${job.id}-${item.label}`}>
          <strong>{item.label}:</strong> <span>{item.value}</span>
        </span>
      ))}
    </div>
  );
}

function QueueJobLinks({ job }: { job: CatalogMaintenanceQueueJobSummary }) {
  const links = getQueueJobLinks(job);

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

export function QueueRealtimeStatus({
  isRefreshing = false,
  lastEventAt,
  onRefresh,
  status,
}: {
  isRefreshing?: boolean;
  lastEventAt: string | null;
  onRefresh?: () => void;
  status: QueueRealtimeStatusValue;
}) {
  const view = buildQueueRealtimeStatusViewModel({
    isRefreshing,
    lastEventAt,
    onRefreshAvailable: Boolean(onRefresh),
    status,
  });

  return (
    <div className={`live-refresh realtime-refresh ${status}`} aria-live="polite">
      <span className={`live-refresh-dot ${view.dotState}`} aria-hidden="true" />
      <span>{view.copy}</span>
      <span className="live-refresh-meta">{view.lastEventLabel}</span>
      {view.detailCopy ? <span className="live-refresh-error">{view.detailCopy}</span> : null}
      {view.refreshButton && onRefresh ? (
        <button
          className="button small quiet"
          disabled={view.refreshButton.disabled}
          onClick={onRefresh}
          type="button"
        >
          {view.refreshButton.label}
        </button>
      ) : null}
    </div>
  );
}

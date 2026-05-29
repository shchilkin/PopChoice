import type {
  CatalogHealthIssue,
  CatalogHealthIssueMoviePage,
  CatalogHealthReport,
  CatalogMovieSample,
  CatalogRepairActionAuditPage,
  CatalogRepairActionAudit,
  CatalogRepairBatch,
  CatalogRepairBatchDetail,
  CatalogRepairBatchItem,
  CatalogRepairBatchPage,
  CatalogRepairBatchStatus,
  CatalogRepairItemStatus,
  DuplicateIdentityGroup,
  TMDBMatchReview,
  TMDBMatchReviewAction,
  TMDBMatchReviewActionAudit,
  TMDBMatchReviewReason,
  TMDBMatchReviewSort,
  TMDBMatchReviewStatus,
  TMDBReviewCandidate,
} from '@pop-choice/shared';
import type { CSSProperties, ReactNode } from 'react';

import type { CatalogMaintenanceQueueSnapshot } from '../catalogMaintenanceQueue';
import { CatalogHealthLiveRefresh } from './catalogHealthLiveRefresh';
import { CatalogRepairEnhancement } from './catalogRepairEnhancement';
import type { CatalogHealthLiveData } from '../lib/catalogHealthLive';
import {
  DEFAULT_BULK_REPAIR_LIMIT,
  DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
  formatBackofficeDateTime,
  REPAIRABLE_CATALOG_ISSUE_KEYS,
} from '../lib/backoffice';

type Section = 'health' | 'repair-batches' | 'reviews';

type ShellProps = {
  active: Section;
  title: string;
  eyebrow: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function BackofficeShell({
  active,
  title,
  eyebrow,
  description,
  actions,
  children,
}: ShellProps) {
  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/" aria-label="PopChoice Backoffice home">
            <span className="brand-mark" aria-hidden="true">
              <img src="/popcorn.svg" alt="" />
            </span>
            <span className="brand-copy">
              <span className="brand-name">PopChoice</span>
              <span className="brand-context">Backoffice</span>
            </span>
          </a>
          <span className="operator-badge">Operator console</span>
        </div>
      </div>
      <main>
        <header className="page-header">
          <div>
            <p className="page-kicker">{eyebrow}</p>
            <h1>{title}</h1>
            {description ? <div className="page-description">{description}</div> : null}
          </div>
          {actions ? <div className="actions">{actions}</div> : null}
        </header>
        <nav className="section-nav" aria-label="Backoffice sections">
          <a className={active === 'health' ? 'active' : ''} href="/">
            Catalog health
          </a>
          <a className={active === 'reviews' ? 'active' : ''} href="/tmdb-reviews">
            TMDB reviews
          </a>
          <a className={active === 'repair-batches' ? 'active' : ''} href="/repair-batches">
            Repair batches
          </a>
        </nav>
        {children}
      </main>
    </>
  );
}

function BooleanDataPill({ value }: { value: boolean }) {
  return <span className={`data-pill ${value ? 'good' : 'warn'}`}>{value ? 'yes' : 'no'}</span>;
}

function OptionalCatalogValue({ value }: { value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') {
    return <span className="data-pill neutral">-</span>;
  }

  return <>{value}</>;
}

function catalogIssueHint(issueKey: string): string {
  const hints: Record<string, string> = {
    missing_age_rating: 'Age-rating gaps reduce safety and household filtering quality.',
    missing_cast_metadata: 'Cast gaps limit actor-aware recommendation features.',
    missing_director_metadata: 'Director gaps limit creator-aware recommendation features.',
    missing_genre_metadata: 'Genre gaps weaken discovery and future filters.',
    missing_keyword_metadata: 'Keyword gaps reduce nuance for ranking and search.',
    missing_localized_name: 'Localized names improve non-English operator and user views.',
    missing_poster_url: 'Poster coverage affects result cards and catalog browsing.',
    missing_runtime: 'Runtime gaps make fit and pacing recommendations weaker.',
    missing_tmdb_id: 'Identity gaps block richer TMDB refreshes and joins.',
    missing_tmdb_matched_at: 'Matched rows need timestamps for stale-data decisions.',
    stale_tmdb_metadata: 'Refresh candidates through the rate-limited TMDB path.',
  };

  return hints[issueKey] ?? 'Review affected catalog records.';
}

function CountPill({
  count,
  state,
}: {
  count: number;
  state?: 'healthy' | 'warning' | 'repairable';
}) {
  return <span className={state ? `count ${state}` : 'count'}>{count}</span>;
}

function buildCatalogIssuePageHref({
  issueKey,
  page,
  pageSize,
}: {
  issueKey: string;
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();
  params.set('issue', issueKey);
  params.set('issuePage', String(page));
  params.set('issuePageSize', String(pageSize));
  return `/?${params.toString()}#issue-${encodeURIComponent(issueKey)}`;
}

function buildRepairAuditPageHref({ page, pageSize }: { page: number; pageSize: number }) {
  const params = new URLSearchParams();
  params.set('auditPage', String(page));
  params.set('auditPageSize', String(pageSize));
  return `/?${params.toString()}#repair-audit`;
}

function SimplePaginationControls({
  ariaLabel,
  emptyLabel,
  itemLabel,
  limit,
  offset,
  totalCount,
  hrefForPage,
}: {
  ariaLabel: string;
  emptyLabel: string;
  itemLabel: string;
  limit: number;
  offset: number;
  totalCount: number;
  hrefForPage: (page: number) => string;
}) {
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
  const currentPage = Math.floor(offset / limit) + 1;
  const firstItem =
    totalCount === 0 || currentPage > totalPages ? 0 : (currentPage - 1) * limit + 1;
  const lastItem = currentPage > totalPages ? 0 : Math.min(currentPage * limit, totalCount);

  return (
    <nav className="pagination" aria-label={ariaLabel}>
      <span className="pagination-summary">
        {totalCount === 0
          ? emptyLabel
          : currentPage > totalPages
            ? `Page ${currentPage} is past ${totalCount} ${itemLabel}`
            : `Showing ${firstItem}-${lastItem} of ${totalCount} ${itemLabel}`}
      </span>
      <div className="pagination-actions">
        {currentPage > 1 ? (
          <a className="button small" href={hrefForPage(currentPage - 1)}>
            Previous
          </a>
        ) : (
          <span className="button small disabled" aria-disabled="true">
            Previous
          </span>
        )}
        <span className="pagination-page">
          Page {currentPage} / {totalPages}
        </span>
        {currentPage < totalPages ? (
          <a className="button small" href={hrefForPage(currentPage + 1)}>
            Next
          </a>
        ) : (
          <span className="button small disabled" aria-disabled="true">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}

function CatalogStat({
  label,
  value,
  meta,
  state = 'neutral',
}: {
  label: string;
  value: string | number;
  meta: string;
  state?: 'healthy' | 'warning' | 'neutral';
}) {
  return (
    <div className={`stat ${state}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
      </div>
      <span className="stat-value">{value}</span>
      <div className="stat-meta">{meta}</div>
    </div>
  );
}

function CatalogStatusStrip({
  activeIssues,
  duplicateGroups,
  queueSnapshot,
}: {
  activeIssues: number;
  duplicateGroups: number;
  queueSnapshot: CatalogMaintenanceQueueSnapshot;
}) {
  const isHealthy = activeIssues === 0 && duplicateGroups === 0;

  return (
    <section
      className={`catalog-status ${isHealthy ? 'healthy' : 'needs-work'}`}
      aria-label="Catalog health status"
    >
      <div>
        <div className="status-heading">
          <span className="status-dot" aria-hidden="true" />
          <span>{isHealthy ? 'Catalog is clear' : 'Catalog needs operator attention'}</span>
        </div>
        <p className="status-copy">
          {isHealthy
            ? 'No active issue categories or duplicate groups are currently reported.'
            : 'Work the highest-count repairable panels first, then review duplicates before manual merges.'}
        </p>
      </div>
      <div className="status-metrics" aria-label="Open catalog signals">
        <span className={`pill ${activeIssues > 0 ? 'warning' : 'good'}`}>
          {activeIssues} active issue categories
        </span>
        <span className={`pill ${duplicateGroups > 0 ? 'warning' : 'good'}`}>
          {duplicateGroups} duplicate groups
        </span>
        <span className={`pill ${queueSnapshot.available ? 'good' : 'warning'}`}>
          {queueSnapshot.available
            ? `${queueSnapshot.openJobs} catalog queue open`
            : 'Catalog queue unavailable'}
        </span>
      </div>
    </section>
  );
}

function CatalogQueueStatus({ snapshot }: { snapshot: CatalogMaintenanceQueueSnapshot }) {
  const state = !snapshot.available ? 'warning' : snapshot.openJobs > 0 ? 'neutral' : 'healthy';

  return (
    <section className="queue-status" aria-label="Catalog maintenance queue status">
      <div>
        <div className="queue-status-title">
          <span className={`queue-dot ${state}`} aria-hidden="true" />
          <span>Catalog maintenance queue</span>
        </div>
        <p>
          {snapshot.available
            ? `Synced from BullMQ at ${formatBackofficeDateTime(snapshot.updatedAt)}.`
            : 'REDIS_URL is unavailable, so backoffice cannot read BullMQ state.'}
        </p>
      </div>
      <div className="queue-counts">
        <span>
          <strong>{snapshot.counts.waiting}</strong> waiting
        </span>
        <span>
          <strong>{snapshot.counts.active}</strong> active
        </span>
        <span>
          <strong>{snapshot.counts.delayed + snapshot.counts.prioritized}</strong> scheduled
        </span>
        <span>
          <strong>{snapshot.counts.failed}</strong> failed
        </span>
        <span>
          <strong>{snapshot.counts.completed}</strong> completed
        </span>
      </div>
    </section>
  );
}

function SampleRows({
  emptyLabel = 'No sample records returned.',
  issueKey,
  samples,
}: {
  emptyLabel?: string;
  issueKey: string;
  samples: CatalogMovieSample[];
}) {
  if (samples.length === 0) return <p className="empty">{emptyLabel}</p>;

  const canRepair = REPAIRABLE_CATALOG_ISSUE_KEYS.has(issueKey);

  return (
    <div className="table-scroll">
      <table className="sample-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Movie</th>
            <th>Year</th>
            <th>TMDB</th>
            <th>Poster</th>
            <th>Localized</th>
            <th>Runtime</th>
            <th>Age</th>
            <th>Matched</th>
            {canRepair ? <th>Repair</th> : null}
          </tr>
        </thead>
        <tbody>
          {samples.map((movie) => (
            <tr key={movie.id} data-repair-row data-issue-key={issueKey} data-movie-id={movie.id}>
              <td className="id-cell">#{movie.id}</td>
              <td className="movie-cell">
                <strong>{movie.name}</strong>
              </td>
              <td>{movie.year}</td>
              <td>
                <OptionalCatalogValue value={movie.tmdb_id} />
              </td>
              <td>
                <BooleanDataPill value={Boolean(movie.poster_url)} />
              </td>
              <td>
                <OptionalCatalogValue value={movie.localized_name} />
              </td>
              <td>
                {movie.duration > 0 ? movie.duration : <span className="data-pill warn">0</span>}
              </td>
              <td>
                <OptionalCatalogValue value={movie.age_rating} />
              </td>
              <td>
                <OptionalCatalogValue value={movie.tmdb_matched_at} />
              </td>
              {canRepair ? (
                <td className="repair-cell">
                  <form
                    className="repair-form"
                    method="post"
                    action="/catalog-health/actions"
                    data-repair-form
                  >
                    <input type="hidden" name="action" value="enqueue_backfill" />
                    <input type="hidden" name="issue_key" value={issueKey} />
                    <input type="hidden" name="movie_id" value={movie.id} />
                    <button className="button primary small" type="submit" data-repair-submit>
                      Queue backfill
                    </button>
                    <span className="repair-message" aria-live="polite" data-repair-message />
                  </form>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulkRepairForm({ issue }: { issue: CatalogHealthIssue }) {
  const batchLimit = Math.min(issue.count, DEFAULT_BULK_REPAIR_LIMIT);

  return (
    <form
      className="bulk-repair-form"
      method="post"
      action="/catalog-health/actions"
      data-bulk-repair-form
      data-confirm-message={`Queue up to ${batchLimit} repair jobs for ${issue.label}? Workers will keep the existing TMDB/OpenAI pacing.`}
    >
      <input type="hidden" name="action" value="bulk_enqueue_backfill" />
      <input type="hidden" name="issue_key" value={issue.key} />
      <input type="hidden" name="batch_limit" value={batchLimit} />
      <button className="button secondary small" type="submit" data-repair-submit>
        Queue next {batchLimit}
      </button>
      <span className="repair-message" aria-live="polite" data-repair-message />
    </form>
  );
}

function CatalogIssuePanel({
  issue,
  issuePage,
}: {
  issue: CatalogHealthIssue;
  issuePage: CatalogHealthIssueMoviePage | null;
}) {
  const severity = issue.count > 0 ? 'needs-work' : 'healthy';
  const canRepair = REPAIRABLE_CATALOG_ISSUE_KEYS.has(issue.key);
  const state = issue.count === 0 ? 'healthy' : canRepair ? 'repairable' : 'warning';
  const activePage = issuePage?.issueKey === issue.key ? issuePage : null;
  const rows = activePage ? activePage.movies : issue.samples;

  return (
    <section
      id={`issue-${issue.key}`}
      className={`panel issue-panel ${severity} ${canRepair && issue.count > 0 ? 'repairable' : ''}`}
    >
      <div className="panel-header">
        <div className="issue-title">
          <div className="issue-title-row">
            <h2>{issue.label}</h2>
            <span className={`pill ${state}`}>
              {issue.count === 0 ? 'Healthy' : canRepair ? 'Repairable' : 'Review'}
            </span>
          </div>
          <div className="issue-hint">{catalogIssueHint(issue.key)}</div>
        </div>
        <div className="panel-actions">
          <CountPill count={issue.count} state={state} />
          {issue.count > 0 ? (
            <a
              className={`button small ${activePage ? 'quiet' : ''}`}
              href={buildCatalogIssuePageHref({
                issueKey: issue.key,
                page: 1,
                pageSize: activePage?.limit ?? DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
              })}
            >
              {activePage ? 'Browsing rows' : 'Browse rows'}
            </a>
          ) : null}
          {canRepair && issue.count > 0 ? <BulkRepairForm issue={issue} /> : null}
        </div>
      </div>
      {issue.count === 0 ? (
        <p className="empty">No affected movies.</p>
      ) : (
        <>
          {activePage ? (
            <SimplePaginationControls
              ariaLabel={`${issue.label} affected movie pagination`}
              emptyLabel="No affected movies"
              itemLabel="affected movies"
              limit={activePage.limit}
              offset={activePage.offset}
              totalCount={activePage.totalCount}
              hrefForPage={(page) =>
                buildCatalogIssuePageHref({
                  issueKey: issue.key,
                  page,
                  pageSize: activePage.limit,
                })
              }
            />
          ) : null}
          <SampleRows
            issueKey={issue.key}
            samples={rows}
            emptyLabel={activePage ? 'No affected movies on this page.' : undefined}
          />
          {activePage ? (
            <SimplePaginationControls
              ariaLabel={`${issue.label} affected movie pagination bottom`}
              emptyLabel="No affected movies"
              itemLabel="affected movies"
              limit={activePage.limit}
              offset={activePage.offset}
              totalCount={activePage.totalCount}
              hrefForPage={(page) =>
                buildCatalogIssuePageHref({
                  issueKey: issue.key,
                  page,
                  pageSize: activePage.limit,
                })
              }
            />
          ) : issue.count > issue.samples.length ? (
            <div className="panel-footer">
              <a
                className="button small"
                href={buildCatalogIssuePageHref({
                  issueKey: issue.key,
                  page: 1,
                  pageSize: DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
                })}
              >
                Browse all {issue.count} rows
              </a>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function RepairFlash({ repairStatus }: { repairStatus: string | null }) {
  if (repairStatus === 'queued') {
    return (
      <div className="notice good">
        Catalog backfill job queued. Workers will process it through the existing rate-limited TMDB
        path.
      </div>
    );
  }

  if (repairStatus === 'bulk-queued') {
    return (
      <div className="notice good">
        Catalog repair batch queued. Workers will process jobs through the existing rate-limited
        TMDB path.
      </div>
    );
  }

  if (repairStatus === 'bulk-partial') {
    return (
      <div className="notice warn">
        Catalog repair batch partially queued. Check the recent repair audit before retrying.
      </div>
    );
  }

  if (repairStatus === 'unavailable') {
    return (
      <div className="notice warn">
        Catalog repair queue is unavailable. Check REDIS_URL and the backoffice logs.
      </div>
    );
  }

  if (repairStatus === 'empty') {
    return <div className="notice warn">No affected movies are currently available to queue.</div>;
  }

  if (repairStatus === 'failed') {
    return (
      <div className="notice warn">
        Catalog repair action failed. Check backoffice logs for details.
      </div>
    );
  }

  return null;
}

function RepairAuditRows({ audit }: { audit: CatalogRepairActionAudit[] }) {
  if (audit.length === 0) {
    return <p className="empty">No catalog repair actions have been recorded yet.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>When</th>
          <th>Actor</th>
          <th>Issue</th>
          <th>Target</th>
          <th>Action</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        {audit.map((entry) => (
          <tr key={entry.id}>
            <td>{formatBackofficeDateTime(entry.createdAt)}</td>
            <td>{entry.actor}</td>
            <td>{entry.issueKey}</td>
            <td>
              {entry.targetType}:{entry.targetId}
            </td>
            <td>{entry.action}</td>
            <td>
              {entry.repairBatchId
                ? `batch:${entry.repairBatchId}`
                : String(entry.result.jobId ?? entry.result.status ?? JSON.stringify(entry.result))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function repairStatusLabel(status: CatalogRepairBatchStatus | CatalogRepairItemStatus): string {
  const labels: Record<CatalogRepairBatchStatus | CatalogRepairItemStatus, string> = {
    completed: 'Completed',
    completed_resolved: 'Completed resolved',
    completed_unresolved: 'Completed unresolved',
    deduped: 'Deduped',
    empty: 'Empty',
    enqueue_failed: 'Enqueue failed',
    enqueueing: 'Enqueueing',
    failed: 'Failed',
    partial: 'Partial',
    pending: 'Pending',
    processing: 'Processing',
    queued: 'Queued',
    skipped: 'Skipped',
    unavailable: 'Unavailable',
  };

  return labels[status];
}

function RepairStatusBadge({
  status,
}: {
  status: CatalogRepairBatchStatus | CatalogRepairItemStatus;
}) {
  return (
    <span className={`status repair-status repair-${status}`}>{repairStatusLabel(status)}</span>
  );
}

function getRepairBatchProgress(batch: CatalogRepairBatch): string {
  const finished =
    batch.completedCount +
    batch.failedCount +
    batch.skippedCount +
    batch.dedupedCount +
    batch.unavailableCount;
  const attempted = Math.max(batch.attemptedCount, 0);
  if (attempted === 0) return 'No items attempted';
  return `${finished}/${attempted} finished`;
}

function buildRepairBatchPageHref({ page, pageSize }: { page: number; pageSize: number }) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  return `/repair-batches?${params.toString()}`;
}

function buildRepairBatchItemPageHref({
  batchId,
  page,
  pageSize,
}: {
  batchId: string;
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();
  params.set('itemPage', String(page));
  params.set('itemPageSize', String(pageSize));
  return `/repair-batches/${encodeURIComponent(batchId)}?${params.toString()}`;
}

function snapshotValue(
  snapshot: Record<string, unknown>,
  key: string,
): string | number | null | undefined {
  const value = snapshot[key];
  if (typeof value === 'string' || typeof value === 'number' || value === null) return value;
  return undefined;
}

function RepairBatchRows({ batches }: { batches: CatalogRepairBatch[] }) {
  if (batches.length === 0) {
    return (
      <tr>
        <td colSpan={9} className="empty">
          No durable catalog repair batches have been recorded yet.
        </td>
      </tr>
    );
  }

  return (
    <>
      {batches.map((batch) => (
        <tr key={batch.id}>
          <td>
            <a href={`/repair-batches/${encodeURIComponent(batch.id)}`}>#{batch.id}</a>
          </td>
          <td>
            <RepairStatusBadge status={batch.status} />
          </td>
          <td>{batch.issueKey}</td>
          <td>{batch.actor}</td>
          <td>{batch.requestedLimit}</td>
          <td>{batch.totalCandidates}</td>
          <td>
            <span className="repair-counts">
              <span>{batch.queuedCount} queued</span>
              <span>{batch.dedupedCount} deduped</span>
              <span>{batch.failedCount} failed</span>
            </span>
          </td>
          <td>{formatBackofficeDateTime(batch.createdAt)}</td>
          <td>
            <a className="button small" href={`/repair-batches/${encodeURIComponent(batch.id)}`}>
              Open
            </a>
          </td>
        </tr>
      ))}
    </>
  );
}

function RepairBatchItemRows({ items }: { items: CatalogRepairBatchItem[] }) {
  if (items.length === 0) {
    return (
      <tr>
        <td colSpan={9} className="empty">
          No item rows were recorded for this repair batch.
        </td>
      </tr>
    );
  }

  return (
    <>
      {items.map((item) => {
        const name = snapshotValue(item.movieSnapshot, 'name');
        const year = snapshotValue(item.movieSnapshot, 'year');

        return (
          <tr key={item.id}>
            <td>#{item.id}</td>
            <td>
              <a href={`/api/catalog-repair-batches/${encodeURIComponent(item.batchId)}`}>
                batch:{item.batchId}
              </a>
            </td>
            <td>
              <div className="movie-title">
                <strong>{name ?? `Movie ${item.movieId}`}</strong>
                <span className="muted">
                  #{item.movieId}
                  {year === null || year === undefined ? '' : ` · ${year}`}
                </span>
              </div>
            </td>
            <td>
              <RepairStatusBadge status={item.status} />
            </td>
            <td>{item.jobId ?? '-'}</td>
            <td>{item.reason ?? '-'}</td>
            <td>{item.language ?? '-'}</td>
            <td>{item.errorMessage ?? '-'}</td>
            <td>{formatBackofficeDateTime(item.updatedAt)}</td>
          </tr>
        );
      })}
    </>
  );
}

function RepairBatchSummary({ batch }: { batch: CatalogRepairBatch }) {
  return (
    <section className="summary batch-summary" aria-label="Repair batch summary">
      <CatalogStat
        label="Status"
        value={repairStatusLabel(batch.status)}
        meta={getRepairBatchProgress(batch)}
        state={
          batch.status === 'completed'
            ? 'healthy'
            : batch.status === 'failed' || batch.status === 'partial'
              ? 'warning'
              : 'neutral'
        }
      />
      <CatalogStat
        label="Candidates"
        value={batch.totalCandidates}
        meta="Affected rows at queue time"
      />
      <CatalogStat
        label="Attempted"
        value={batch.attemptedCount}
        meta={`Requested limit ${batch.requestedLimit}`}
      />
      <CatalogStat
        label="Queued"
        value={batch.queuedCount}
        meta={`${batch.dedupedCount} deduped, ${batch.unavailableCount} unavailable`}
        state={batch.failedCount > 0 ? 'warning' : 'neutral'}
      />
    </section>
  );
}

export function RepairBatchListPage({ batchPage }: { batchPage: CatalogRepairBatchPage }) {
  return (
    <BackofficeShell
      active="repair-batches"
      title="Catalog Repair Batches"
      eyebrow="Repair history"
      description="Review durable bulk repair attempts, enqueue outcomes, and worker progress by item."
      actions={
        <a className="button" href="/repair-batches">
          Refresh
        </a>
      }
    >
      <section className="panel">
        <div className="panel-header">
          <h2>Recent batches</h2>
          <span className="count">{batchPage.totalCount}</span>
        </div>
        <SimplePaginationControls
          ariaLabel="Catalog repair batch pagination"
          emptyLabel="No repair batches"
          itemLabel="repair batches"
          limit={batchPage.limit}
          offset={batchPage.offset}
          totalCount={batchPage.totalCount}
          hrefForPage={(page) => buildRepairBatchPageHref({ page, pageSize: batchPage.limit })}
        />
        <div className="table-scroll">
          <table className="repair-batch-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Issue</th>
                <th>Actor</th>
                <th>Limit</th>
                <th>Candidates</th>
                <th>Outcomes</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <RepairBatchRows batches={batchPage.batches} />
            </tbody>
          </table>
        </div>
        <SimplePaginationControls
          ariaLabel="Catalog repair batch pagination bottom"
          emptyLabel="No repair batches"
          itemLabel="repair batches"
          limit={batchPage.limit}
          offset={batchPage.offset}
          totalCount={batchPage.totalCount}
          hrefForPage={(page) => buildRepairBatchPageHref({ page, pageSize: batchPage.limit })}
        />
      </section>
    </BackofficeShell>
  );
}

export function RepairBatchDetailPage({ detail }: { detail: CatalogRepairBatchDetail }) {
  const { batch, items } = detail;

  return (
    <BackofficeShell
      active="repair-batches"
      title={`Repair Batch #${batch.id}`}
      eyebrow="Repair detail"
      description={
        <div className="toolbar-summary">
          <RepairStatusBadge status={batch.status} />
          <span>{batch.issueKey}</span>
          <span>Updated {formatBackofficeDateTime(batch.updatedAt)}</span>
        </div>
      }
      actions={
        <>
          <a className="button" href="/repair-batches">
            Back to batches
          </a>
          <a
            className="button quiet"
            href={`/api/catalog-repair-batches/${encodeURIComponent(batch.id)}`}
          >
            JSON
          </a>
        </>
      }
    >
      <RepairBatchSummary batch={batch} />
      <section className="detail-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Batch context</h2>
          </div>
          <dl className="facts">
            <div>
              <dt>Action</dt>
              <dd>{batch.action.replaceAll('_', ' ')}</dd>
            </div>
            <div>
              <dt>Actor</dt>
              <dd>{batch.actor}</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>
                {batch.targetType}:{batch.targetId}
              </dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatBackofficeDateTime(batch.createdAt)}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{formatBackofficeDateTime(batch.completedAt)}</dd>
            </div>
            <div>
              <dt>Note</dt>
              <dd>{batch.note ?? '-'}</dd>
            </div>
          </dl>
        </article>
        <article className="panel">
          <div className="panel-header">
            <h2>Item status counts</h2>
          </div>
          <dl className="facts">
            <div>
              <dt>Queued</dt>
              <dd>{batch.queuedCount}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{batch.completedCount}</dd>
            </div>
            <div>
              <dt>Deduped</dt>
              <dd>{batch.dedupedCount}</dd>
            </div>
            <div>
              <dt>Skipped</dt>
              <dd>{batch.skippedCount}</dd>
            </div>
            <div>
              <dt>Unavailable</dt>
              <dd>{batch.unavailableCount}</dd>
            </div>
            <div>
              <dt>Failed</dt>
              <dd>{batch.failedCount}</dd>
            </div>
          </dl>
        </article>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Batch items</h2>
            <div className="issue-hint">
              Item rows preserve the movie snapshot and queue result for operator history.
            </div>
          </div>
          <span className="count">{items.totalCount}</span>
        </div>
        <SimplePaginationControls
          ariaLabel="Catalog repair batch item pagination"
          emptyLabel="No repair batch items"
          itemLabel="batch items"
          limit={items.limit}
          offset={items.offset}
          totalCount={items.totalCount}
          hrefForPage={(page) =>
            buildRepairBatchItemPageHref({ batchId: batch.id, page, pageSize: items.limit })
          }
        />
        <div className="table-scroll">
          <table className="repair-batch-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Batch</th>
                <th>Movie</th>
                <th>Status</th>
                <th>Job</th>
                <th>Reason</th>
                <th>Language</th>
                <th>Error</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              <RepairBatchItemRows items={items.items} />
            </tbody>
          </table>
        </div>
        <SimplePaginationControls
          ariaLabel="Catalog repair batch item pagination bottom"
          emptyLabel="No repair batch items"
          itemLabel="batch items"
          limit={items.limit}
          offset={items.offset}
          totalCount={items.totalCount}
          hrefForPage={(page) =>
            buildRepairBatchItemPageHref({ batchId: batch.id, page, pageSize: items.limit })
          }
        />
      </section>
    </BackofficeShell>
  );
}

export function RepairBatchNotFoundPage({ batchId }: { batchId: string }) {
  return (
    <BackofficeShell
      active="repair-batches"
      title="Repair Batch Not Found"
      eyebrow="Repair detail"
      description={`No durable catalog repair batch exists for id ${batchId}.`}
      actions={
        <a className="button" href="/repair-batches">
          Back to batches
        </a>
      }
    >
      <section className="panel">
        <p className="empty">The batch may have been created in another environment or deleted.</p>
      </section>
    </BackofficeShell>
  );
}

export function BackofficeLoadingPage({
  active = 'health',
  title = 'Loading backoffice',
}: {
  active?: Section;
  title?: string;
}) {
  return (
    <BackofficeShell
      active={active}
      title={title}
      eyebrow="Loading"
      description="Fetching the latest operator state."
    >
      <section className="panel loading-panel" aria-busy="true">
        <div className="panel-header">
          <h2>Loading</h2>
        </div>
        <p className="empty">Loading current records...</p>
      </section>
    </BackofficeShell>
  );
}

function DuplicateGroup({ group }: { group: DuplicateIdentityGroup }) {
  return (
    <article className="duplicate-group">
      <div className="duplicate-heading">
        <strong>{group.identityKey}</strong>
        <span>{group.count} movies</span>
      </div>
      <ul>
        {group.movies.map((movie) => (
          <li key={movie.id}>
            <span>#{movie.id}</span>
            <span>
              {movie.name} ({movie.year})
            </span>
            <span>tmdb:{movie.tmdb_id ?? '-'}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function DuplicateReport({
  title,
  report,
}: {
  title: string;
  report: CatalogHealthReport['duplicateTmdbIds'];
}) {
  const state = report.totalGroups > 0 ? 'warning' : 'healthy';

  return (
    <section
      className={`panel duplicate-panel ${report.totalGroups > 0 ? 'needs-work' : 'healthy'}`}
    >
      <div className="panel-header">
        <div className="issue-title">
          <div className="issue-title-row">
            <h2>{title}</h2>
            <span className={`pill ${state}`}>{report.totalGroups > 0 ? 'Review' : 'Healthy'}</span>
          </div>
          <div className="issue-hint">
            Potential identity collisions that should be reviewed before merge automation.
          </div>
        </div>
        <CountPill count={report.totalGroups} state={state} />
      </div>
      {report.groups.length === 0 ? (
        <p className="empty">No duplicate groups found.</p>
      ) : (
        report.groups.map((group) => <DuplicateGroup key={group.identityKey} group={group} />)
      )}
    </section>
  );
}

export function CatalogHealthPage({
  auditPage,
  initialLiveData,
  issueMoviePage,
  queueSnapshot,
  report,
  repairStatus,
}: {
  report: CatalogHealthReport;
  auditPage: CatalogRepairActionAuditPage;
  initialLiveData: CatalogHealthLiveData;
  issueMoviePage: CatalogHealthIssueMoviePage | null;
  queueSnapshot: CatalogMaintenanceQueueSnapshot;
  repairStatus: string | null;
}) {
  const activeIssues = report.issues.filter((issue) => issue.count > 0).length;
  const duplicateGroups =
    report.duplicateTmdbIds.totalGroups + report.duplicateNormalizedTitleYears.totalGroups;

  return (
    <BackofficeShell
      active="health"
      title="Catalog Health"
      eyebrow="Catalog operations"
      description={
        <>
          Generated {formatBackofficeDateTime(report.generatedAt)}. Live refresh is enabled without
          a full page reload.
        </>
      }
      actions={
        <a className="button" href="/">
          Refresh
        </a>
      }
    >
      <RepairFlash repairStatus={repairStatus} />
      <CatalogHealthLiveRefresh initialData={initialLiveData} intervalSeconds={12} />
      <CatalogStatusStrip
        activeIssues={activeIssues}
        duplicateGroups={duplicateGroups}
        queueSnapshot={queueSnapshot}
      />
      <CatalogQueueStatus snapshot={queueSnapshot} />
      <section className="summary" aria-label="Catalog health summary">
        <CatalogStat label="Movies" value={report.totalMovies} meta="Catalog rows tracked" />
        <CatalogStat
          label="Issue categories"
          value={activeIssues}
          meta={activeIssues === 0 ? 'No active categories' : 'Categories with affected rows'}
          state={activeIssues === 0 ? 'healthy' : 'warning'}
        />
        <CatalogStat
          label="Duplicate groups"
          value={duplicateGroups}
          meta={duplicateGroups === 0 ? 'No duplicate groups' : 'Groups awaiting review'}
          state={duplicateGroups === 0 ? 'healthy' : 'warning'}
        />
        <CatalogStat
          label="Stale threshold"
          value={`${report.staleAfterDays}d`}
          meta="TMDB metadata refresh window"
        />
      </section>
      <div className="grid">
        {report.issues.map((issue) => (
          <CatalogIssuePanel key={issue.key} issue={issue} issuePage={issueMoviePage} />
        ))}
        <DuplicateReport title="Duplicate TMDB ids" report={report.duplicateTmdbIds} />
        <DuplicateReport
          title="Duplicate normalized title/year groups"
          report={report.duplicateNormalizedTitleYears}
        />
        <section className="panel" id="repair-audit">
          <div className="panel-header">
            <h2>Recent repair actions</h2>
            <span className="count">{auditPage.totalCount}</span>
          </div>
          <SimplePaginationControls
            ariaLabel="Catalog repair audit pagination"
            emptyLabel="No catalog repair actions"
            itemLabel="repair actions"
            limit={auditPage.limit}
            offset={auditPage.offset}
            totalCount={auditPage.totalCount}
            hrefForPage={(page) => buildRepairAuditPageHref({ page, pageSize: auditPage.limit })}
          />
          <RepairAuditRows audit={auditPage.audit} />
          <SimplePaginationControls
            ariaLabel="Catalog repair audit pagination bottom"
            emptyLabel="No catalog repair actions"
            itemLabel="repair actions"
            limit={auditPage.limit}
            offset={auditPage.offset}
            totalCount={auditPage.totalCount}
            hrefForPage={(page) => buildRepairAuditPageHref({ page, pageSize: auditPage.limit })}
          />
        </section>
      </div>
      <CatalogRepairEnhancement />
    </BackofficeShell>
  );
}

function formatPercent(value: number | null): string {
  if (value === null) return '-';
  return `${Math.round(value * 100)}%`;
}

function confidenceWidth(value: number | null): string {
  if (value === null) return '0%';
  return `${Math.min(Math.max(Math.round(value * 100), 0), 100)}%`;
}

function renderReason(reason: TMDBMatchReviewReason): string {
  return reason === 'ambiguous_match' ? 'Ambiguous match' : 'Runtime mismatch';
}

function ReasonBadge({ reason }: { reason: TMDBMatchReviewReason }) {
  const className = reason === 'runtime_mismatch' ? 'reason-runtime' : 'reason-ambiguous';
  return <span className={`pill ${className}`}>{renderReason(reason)}</span>;
}

function renderStatus(status: TMDBMatchReviewStatus): string {
  const labels: Record<TMDBMatchReviewStatus, string> = {
    deferred: 'Deferred',
    ignored: 'Ignored',
    open: 'Open',
    resolved: 'Resolved',
  };
  return labels[status];
}

function StatusBadge({ status }: { status: TMDBMatchReviewStatus }) {
  return <span className={`status ${status}`}>{renderStatus(status)}</span>;
}

function ConfidenceMeter({ confidence }: { confidence: number | null }) {
  return (
    <div className="confidence-meter" aria-label={`Confidence ${formatPercent(confidence)}`}>
      <span style={{ '--confidence-width': confidenceWidth(confidence) } as CSSProperties} />
    </div>
  );
}

function CurrentTMDBValue({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="data-pill neutral">-</span>;
  return <span className="data-pill good">{value}</span>;
}

function ReviewFilterSummary({
  filters,
}: {
  filters: {
    status: TMDBMatchReviewStatus | 'all';
    reason: TMDBMatchReviewReason | 'all';
    sort: TMDBMatchReviewSort;
  };
}) {
  return (
    <div className="toolbar-summary" aria-label="Active filters">
      <span className="pill">
        {filters.status === 'all' ? 'All statuses' : renderStatus(filters.status)}
      </span>
      <span className="pill">
        {filters.reason === 'all' ? 'All reasons' : renderReason(filters.reason)}
      </span>
      <span className="pill">{filters.sort.replaceAll('_', ' ')}</span>
    </div>
  );
}

function buildReviewPageHref({
  filters,
  page,
  pageSize,
}: {
  filters: {
    status: TMDBMatchReviewStatus | 'all';
    reason: TMDBMatchReviewReason | 'all';
    sort: TMDBMatchReviewSort;
  };
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();
  params.set('status', filters.status);
  params.set('reason', filters.reason);
  params.set('sort', filters.sort);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  return `/tmdb-reviews?${params.toString()}`;
}

function PaginationControls({
  filters,
  page,
  pageSize,
  totalCount,
}: {
  filters: {
    status: TMDBMatchReviewStatus | 'all';
    reason: TMDBMatchReviewReason | 'all';
    sort: TMDBMatchReviewSort;
  };
  page: number;
  pageSize: number;
  totalCount: number;
}) {
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const currentPage = Math.max(page, 1);
  const firstItem =
    totalCount === 0 || currentPage > totalPages ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = currentPage > totalPages ? 0 : Math.min(currentPage * pageSize, totalCount);

  return (
    <nav className="pagination" aria-label="Review queue pagination">
      <span className="pagination-summary">
        {totalCount === 0
          ? 'No reviews'
          : currentPage > totalPages
            ? `Page ${currentPage} is past ${totalCount} matching reviews`
            : `Showing ${firstItem}-${lastItem} of ${totalCount} reviews`}
      </span>
      <div className="pagination-actions">
        {currentPage > 1 ? (
          <a
            className="button small"
            href={buildReviewPageHref({ filters, page: currentPage - 1, pageSize })}
          >
            Previous
          </a>
        ) : (
          <span className="button small disabled" aria-disabled="true">
            Previous
          </span>
        )}
        <span className="pagination-page">
          Page {currentPage} / {totalPages}
        </span>
        {currentPage < totalPages ? (
          <a
            className="button small"
            href={buildReviewPageHref({ filters, page: currentPage + 1, pageSize })}
          >
            Next
          </a>
        ) : (
          <span className="button small disabled" aria-disabled="true">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}

function CandidateSummary({ candidates }: { candidates: TMDBReviewCandidate[] }) {
  if (candidates.length === 0) return <span className="muted">No candidates captured</span>;

  const [best, runnerUp] = candidates;
  const gap =
    best?.confidence !== null &&
    best?.confidence !== undefined &&
    runnerUp?.confidence !== null &&
    runnerUp?.confidence !== undefined
      ? best.confidence - runnerUp.confidence
      : null;

  return (
    <div className="candidate-summary">
      <div className="candidate-headline">
        <strong>
          {best?.title}
          {best?.releaseYear === null || best?.releaseYear === undefined
            ? null
            : ` (${best.releaseYear})`}
        </strong>
        <span className="pill">{formatPercent(best?.confidence ?? null)}</span>
      </div>
      <ConfidenceMeter confidence={best?.confidence ?? null} />
      <div className="muted">
        {candidates.length} candidate(s){gap === null ? '' : `, gap ${formatPercent(gap)}`}
      </div>
    </div>
  );
}

function ReviewRows({ reviews }: { reviews: TMDBMatchReview[] }) {
  if (reviews.length === 0) {
    return (
      <tr>
        <td colSpan={8} className="empty">
          No TMDB review rows match these filters.
        </td>
      </tr>
    );
  }

  return (
    <>
      {reviews.map((review) => (
        <tr key={review.id}>
          <td>
            <a href={`/tmdb-reviews/${encodeURIComponent(review.id)}`}>#{review.id}</a>
          </td>
          <td>
            <div className="movie-title">
              <strong>{review.movieName}</strong>
              <span className="muted">
                {review.movieYear} · movie {review.movieId}
              </span>
            </div>
          </td>
          <td>
            <ReasonBadge reason={review.reason} />
          </td>
          <td>
            <StatusBadge status={review.status} />
          </td>
          <td>
            <CandidateSummary candidates={review.candidates} />
          </td>
          <td>
            <CurrentTMDBValue value={review.currentMovie?.tmdb_id} />
          </td>
          <td>{formatBackofficeDateTime(review.updatedAt)}</td>
          <td>
            <a className="button small" href={`/tmdb-reviews/${encodeURIComponent(review.id)}`}>
              Open
            </a>
          </td>
        </tr>
      ))}
    </>
  );
}

export function ReviewListPage({
  reviews,
  filters,
  pagination,
}: {
  reviews: TMDBMatchReview[];
  filters: {
    status: TMDBMatchReviewStatus | 'all';
    reason: TMDBMatchReviewReason | 'all';
    sort: TMDBMatchReviewSort;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
  };
}) {
  return (
    <BackofficeShell
      active="reviews"
      title="TMDB Match Reviews"
      eyebrow="Catalog decisions"
      description="Review ambiguous TMDB candidates and runtime confidence cases before changing catalog data."
      actions={
        <a className="button" href="/tmdb-reviews">
          Reset
        </a>
      }
    >
      <form className="review-toolbar" method="get" action="/tmdb-reviews">
        <div className="toolbar-fields">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={pagination.pageSize} />
          <label>
            Status
            <select name="status" defaultValue={filters.status}>
              <option value="open">Open</option>
              <option value="deferred">Deferred</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
              <option value="all">All</option>
            </select>
          </label>
          <label>
            Reason
            <select name="reason" defaultValue={filters.reason}>
              <option value="all">All</option>
              <option value="ambiguous_match">Ambiguous match</option>
              <option value="runtime_mismatch">Runtime mismatch</option>
            </select>
          </label>
          <label>
            Sort
            <select name="sort" defaultValue={filters.sort}>
              <option value="highest_risk">Highest risk</option>
              <option value="oldest">Oldest first</option>
              <option value="newest">Newest first</option>
            </select>
          </label>
          <button className="button primary" type="submit">
            Apply filters
          </button>
        </div>
        <ReviewFilterSummary filters={filters} />
      </form>
      <section className="panel">
        <div className="panel-header">
          <h2>Review queue</h2>
          <span className="count">{pagination.totalCount}</span>
        </div>
        <PaginationControls filters={filters} {...pagination} />
        <div className="table-scroll">
          <table className="review-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Local movie</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Candidates</th>
                <th>Current TMDB</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <ReviewRows reviews={reviews} />
            </tbody>
          </table>
        </div>
        <PaginationControls filters={filters} {...pagination} />
      </section>
    </BackofficeShell>
  );
}

function getCandidateWarning({
  review,
  candidate,
}: {
  review: TMDBMatchReview;
  candidate: TMDBReviewCandidate;
}): string | null {
  if (candidate.id === null) return 'Candidate has no TMDB id and cannot be applied.';
  if (candidate.confidence !== null && candidate.confidence < 0.7) {
    return 'Low confidence candidate. Verify title, year, and runtime before applying.';
  }
  if (candidate.releaseYear !== null && candidate.releaseYear !== review.movieYear) {
    return `Release year differs from local movie year ${review.movieYear}.`;
  }

  return null;
}

function CandidateCard({
  review,
  candidate,
  index,
}: {
  review: TMDBMatchReview;
  candidate: TMDBReviewCandidate;
  index: number;
}) {
  const canApply =
    candidate.id !== null && (review.status === 'open' || review.status === 'deferred');
  const isBest = index === 0;
  const isCurrent = candidate.id !== null && candidate.id === review.currentMovie?.tmdb_id;
  const warning = getCandidateWarning({ candidate, review });

  return (
    <article className={`candidate ${isBest ? 'best' : ''} ${isCurrent ? 'current' : ''}`}>
      <div>
        <div className="candidate-title">
          <h3>{candidate.title}</h3>
          <div className="candidate-flags">
            {isBest ? <span className="pill good">Best candidate</span> : null}
            {isCurrent ? <span className="pill repairable">Current TMDB</span> : null}
            {warning ? <span className="pill warning">Needs check</span> : null}
          </div>
        </div>
        <dl>
          <div>
            <dt>TMDB</dt>
            <dd>{candidate.id ?? '-'}</dd>
          </div>
          <div>
            <dt>Original</dt>
            <dd>{candidate.originalTitle ?? '-'}</dd>
          </div>
          <div>
            <dt>Year</dt>
            <dd>{candidate.releaseYear ?? '-'}</dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>{formatPercent(candidate.confidence)}</dd>
          </div>
        </dl>
        <ConfidenceMeter confidence={candidate.confidence} />
        {warning ? <p className="candidate-warning">{warning}</p> : null}
      </div>
      {canApply ? (
        <form
          className="action-form apply-action"
          method="post"
          action={`/tmdb-reviews/${encodeURIComponent(review.id)}/actions`}
        >
          <input type="hidden" name="action" value="apply_candidate" />
          <input type="hidden" name="candidate_id" value={String(candidate.id)} />
          <label>
            Decision note
            <input name="note" maxLength={500} placeholder="Why this candidate is correct" />
          </label>
          <button className="button success" type="submit">
            Apply candidate
          </button>
        </form>
      ) : (
        <p className="muted">This candidate cannot be applied from the current review state.</p>
      )}
    </article>
  );
}

function AuditRows({ audit }: { audit: TMDBMatchReviewActionAudit[] }) {
  if (audit.length === 0) return <p className="empty">No decisions have been recorded yet.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>When</th>
          <th>Actor</th>
          <th>Action</th>
          <th>Status</th>
          <th>Candidate</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        {audit.map((entry) => (
          <tr key={entry.id}>
            <td>{formatBackofficeDateTime(entry.createdAt)}</td>
            <td>{entry.actor}</td>
            <td>{entry.action.replaceAll('_', ' ')}</td>
            <td>
              {entry.previousStatus ? (
                <StatusBadge status={entry.previousStatus} />
              ) : (
                <span className="data-pill neutral">-</span>
              )}{' '}
              <StatusBadge status={entry.newStatus} />
            </td>
            <td>
              {entry.candidate?.id ?? '-'} {entry.candidate ? entry.candidate.title : ''}
            </td>
            <td>{entry.note ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusActionForm({
  review,
  action,
  label,
}: {
  review: TMDBMatchReview;
  action: Exclude<TMDBMatchReviewAction, 'apply_candidate'>;
  label: string;
}) {
  const disabled =
    review.status === 'resolved' ||
    (action === 'reject' && review.status === 'ignored') ||
    (action === 'defer' && review.status === 'deferred') ||
    (action === 'reopen' && review.status === 'open');
  const details = {
    defer: {
      buttonClass: 'secondary',
      className: 'defer',
      description: 'Keep it out of the active queue until more catalog context exists.',
    },
    reject: {
      buttonClass: 'danger',
      className: 'reject',
      description: 'Mark this review as ignored when candidates are wrong or not useful.',
    },
    reopen: {
      buttonClass: 'quiet',
      className: 'reopen',
      description: 'Move a deferred or ignored review back into active operator work.',
    },
  }[action];

  return (
    <article className={`decision-card ${details.className}`}>
      <div className="decision-card-header">
        <span className="decision-title">{label}</span>
        <span className="small-note">{details.description}</span>
      </div>
      <form
        className="action-form"
        method="post"
        action={`/tmdb-reviews/${encodeURIComponent(review.id)}/actions`}
      >
        <input type="hidden" name="action" value={action} />
        <label>
          Decision note
          <input name="note" maxLength={500} placeholder="Optional rationale" disabled={disabled} />
        </label>
        <button className={`button ${details.buttonClass}`} type="submit" disabled={disabled}>
          {label}
        </button>
      </form>
    </article>
  );
}

export function ReviewDetailPage({
  review,
  audit,
}: {
  review: TMDBMatchReview;
  audit: TMDBMatchReviewActionAudit[];
}) {
  return (
    <BackofficeShell
      active="reviews"
      title={`TMDB Review #${review.id}`}
      eyebrow="Catalog decision"
      description={
        <div className="toolbar-summary">
          <ReasonBadge reason={review.reason} />
          <StatusBadge status={review.status} />
          <span>Updated {formatBackofficeDateTime(review.updatedAt)}</span>
        </div>
      }
      actions={
        <a className="button" href="/tmdb-reviews">
          Back to queue
        </a>
      }
    >
      <section className="detail-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Local movie</h2>
          </div>
          <dl className="facts">
            <div>
              <dt>ID</dt>
              <dd>{review.movieId}</dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>{review.currentMovie?.name ?? review.movieName}</dd>
            </div>
            <div>
              <dt>Year</dt>
              <dd>{review.currentMovie?.year ?? review.movieYear}</dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>{review.currentMovie?.duration ?? '-'}</dd>
            </div>
            <div>
              <dt>Age</dt>
              <dd>{review.currentMovie?.age_rating ?? '-'}</dd>
            </div>
            <div>
              <dt>TMDB</dt>
              <dd>
                <CurrentTMDBValue value={review.currentMovie?.tmdb_id} />
              </dd>
            </div>
            <div>
              <dt>Matched at</dt>
              <dd>{formatBackofficeDateTime(review.currentMovie?.tmdb_matched_at)}</dd>
            </div>
          </dl>
          <div className="decision-brief">
            <span className="small-note">Current match confidence</span>
            <strong>{formatPercent(review.currentMovie?.tmdb_match_confidence ?? null)}</strong>
            <ConfidenceMeter confidence={review.currentMovie?.tmdb_match_confidence ?? null} />
          </div>
        </article>
        <article className="panel">
          <div className="panel-header">
            <h2>Why it needs review</h2>
          </div>
          <div className="copy">
            <p>
              <strong>{renderReason(review.reason)}</strong>
            </p>
            <p>{review.notes ?? 'No notes were recorded by backfill.'}</p>
            <p className="muted">
              Actions are audited. Applying a candidate only changes TMDB identity fields and marks
              the match source as manual; richer metadata still comes from backfill/discovery
              refreshes.
            </p>
          </div>
        </article>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Decision actions</h2>
        </div>
        <div className="decision-actions">
          <StatusActionForm review={review} action="reject" label="Reject / ignore" />
          <StatusActionForm review={review} action="defer" label="Defer" />
          <StatusActionForm review={review} action="reopen" label="Reopen" />
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Candidates</h2>
          <span className="count">{review.candidates.length}</span>
        </div>
        <div className="candidates">
          {review.candidates.length === 0 ? (
            <p className="empty">
              No candidate metadata was captured. Reject, defer, or rerun backfill after checking
              TMDB manually.
            </p>
          ) : (
            review.candidates.map((candidate, index) => (
              <CandidateCard
                key={`${candidate.id ?? 'unknown'}-${index}`}
                review={review}
                candidate={candidate}
                index={index}
              />
            ))
          )}
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Audit history</h2>
        </div>
        <AuditRows audit={audit} />
      </section>
    </BackofficeShell>
  );
}

export function BackofficeErrorPage({
  active = 'health',
  error: _error,
  retryHref = '/',
}: {
  active?: Section;
  error: unknown;
  retryHref?: string;
}) {
  return (
    <BackofficeShell
      active={active}
      title="Backoffice unavailable"
      eyebrow="Operator error"
      description="The backoffice service is running, but the requested report could not be loaded."
      actions={
        <a className="button" href={retryHref}>
          Retry
        </a>
      }
    >
      <section className="panel error-panel">
        <div className="panel-header">
          <h2>Recovery</h2>
        </div>
        <p>
          An internal backoffice error occurred. Retry the request, then check service logs if the
          problem continues.
        </p>
      </section>
    </BackofficeShell>
  );
}

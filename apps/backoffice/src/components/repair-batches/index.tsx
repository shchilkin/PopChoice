import type {
  CatalogRepairBatch,
  CatalogRepairBatchDetail,
  CatalogRepairBatchItem,
  CatalogRepairBatchPage,
  CatalogRepairBatchStatus,
  CatalogRepairItemStatus,
} from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { CatalogStat, SimplePaginationControls } from '../shared';

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
    <BackofficeLayout
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
    </BackofficeLayout>
  );
}

export function RepairBatchDetailPage({ detail }: { detail: CatalogRepairBatchDetail }) {
  const { batch, items } = detail;

  return (
    <BackofficeLayout
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
    </BackofficeLayout>
  );
}

export function RepairBatchNotFoundPage({ batchId }: { batchId: string }) {
  return (
    <BackofficeLayout
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
    </BackofficeLayout>
  );
}

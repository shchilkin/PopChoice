import type {
  CatalogRepairBatch,
  CatalogRepairBatchDetail,
  CatalogRepairBatchItem,
  CatalogRepairBatchItemSort,
  CatalogRepairBatchItemStatusFilter,
  CatalogRepairBatchPage,
  CatalogRepairBatchSort,
  CatalogRepairBatchStatusFilter,
} from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { RepairStatusBadge, repairStatusLabel } from '../catalog-repair-status';
import { CatalogMaintenanceRealtimeRefresh } from '../catalogMaintenanceRealtimeRefresh';
import { CatalogStat, SimplePaginationControls } from '../shared';
import {
  buildRepairBatchItemPageHref,
  buildRepairBatchListHref,
  getRepairBatchProgress,
  issueHref,
  movieHref,
  repairBatchRecoveryHint,
  repairItemPressureLabel,
  resultValue,
  snapshotValue,
  truncateText,
} from './helpers';

function FilterLink({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <a className={`filter-chip ${active ? 'active' : ''}`} href={href}>
      {label}
    </a>
  );
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
              <span>{batch.queuedCount} accepted</span>
              <span>{batch.dedupedCount} already queued</span>
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
        <td colSpan={10} className="empty">
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
        const attempts =
          resultValue(item.result, 'attemptsMade') ??
          resultValue(item.result, 'attempts') ??
          resultValue(item.result, 'attempt');

        return (
          <tr key={item.id}>
            <td>#{item.id}</td>
            <td>
              <a href={issueHref(item.issueKey)}>{item.issueKey}</a>
            </td>
            <td>
              <div className="movie-title">
                <strong>
                  <a href={movieHref(item.movieId)}>{name ?? `Movie ${item.movieId}`}</a>
                </strong>
                <span className="muted">
                  #{item.movieId}
                  {year === null || year === undefined ? '' : ` · ${year}`}
                </span>
              </div>
            </td>
            <td>
              <RepairStatusBadge status={item.status} />
            </td>
            <td>
              <div className="queue-metadata">
                <strong>{item.jobId ?? '-'}</strong>
                <span>{item.queueName ?? 'queue unknown'}</span>
                <span>{item.jobName ?? 'job unknown'}</span>
              </div>
            </td>
            <td>{item.reason ?? '-'}</td>
            <td>{item.language ?? '-'}</td>
            <td>
              <span title={item.errorMessage ?? undefined}>{truncateText(item.errorMessage)}</span>
            </td>
            <td>
              <div className="queue-metadata">
                <strong>{repairItemPressureLabel(item)}</strong>
                <span>{attempts === null ? 'attempts unknown' : `${attempts} attempts`}</span>
              </div>
            </td>
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
        label="Accepted"
        value={batch.queuedCount}
        meta={`${batch.dedupedCount} already queued, ${batch.unavailableCount} unavailable`}
        state={batch.failedCount > 0 ? 'warning' : 'neutral'}
      />
    </section>
  );
}

export function RepairBatchListPage({
  batchPage,
  selectedSort,
  selectedStatus,
}: {
  batchPage: CatalogRepairBatchPage;
  selectedSort: CatalogRepairBatchSort;
  selectedStatus: CatalogRepairBatchStatusFilter;
}) {
  const statusFilters: Array<{ label: string; status: CatalogRepairBatchStatusFilter }> = [
    { label: 'All', status: 'all' },
    { label: 'Partial', status: 'partial' },
    { label: 'Failed', status: 'failed' },
    { label: 'Processing', status: 'processing' },
    { label: 'Accepted', status: 'queued' },
    { label: 'Completed', status: 'completed' },
  ];
  const sortFilters: Array<{ label: string; sort: CatalogRepairBatchSort }> = [
    { label: 'Newest', sort: 'newest' },
    { label: 'Needs review', sort: 'needs_review' },
    { label: 'Recently updated', sort: 'updated' },
  ];

  return (
    <BackofficeLayout
      active="repair-batches"
      title="Catalog Repair Batches"
      eyebrow="Repair history"
      description="Review durable bulk repair attempts, enqueue outcomes, and worker progress by item."
    >
      <CatalogMaintenanceRealtimeRefresh label="Repair batches are live" />
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent batches</h2>
            <div className="issue-hint">
              Filter durable batches by operator recovery state before opening raw JSON.
            </div>
          </div>
          <span className="count">{batchPage.totalCount}</span>
        </div>
        <div className="filter-bar" aria-label="Repair batch filters">
          {statusFilters.map((filter) => (
            <FilterLink
              key={filter.status}
              active={selectedStatus === filter.status}
              href={buildRepairBatchListHref({
                pageSize: batchPage.limit,
                sort: selectedSort,
                status: filter.status,
              })}
              label={filter.label}
            />
          ))}
        </div>
        <div className="filter-bar quiet" aria-label="Repair batch sorting">
          {sortFilters.map((filter) => (
            <FilterLink
              key={filter.sort}
              active={selectedSort === filter.sort}
              href={buildRepairBatchListHref({
                pageSize: batchPage.limit,
                sort: filter.sort,
                status: selectedStatus,
              })}
              label={filter.label}
            />
          ))}
        </div>
        <SimplePaginationControls
          ariaLabel="Catalog repair batch pagination"
          emptyLabel="No repair batches"
          itemLabel="repair batches"
          limit={batchPage.limit}
          offset={batchPage.offset}
          totalCount={batchPage.totalCount}
          hrefForPage={(page) =>
            buildRepairBatchListHref({
              page,
              pageSize: batchPage.limit,
              sort: selectedSort,
              status: selectedStatus,
            })
          }
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
          hrefForPage={(page) =>
            buildRepairBatchListHref({
              page,
              pageSize: batchPage.limit,
              sort: selectedSort,
              status: selectedStatus,
            })
          }
        />
      </section>
    </BackofficeLayout>
  );
}

export function RepairBatchDetailPage({
  detail,
  selectedItemSort,
  selectedItemStatus,
}: {
  detail: CatalogRepairBatchDetail;
  selectedItemSort: CatalogRepairBatchItemSort;
  selectedItemStatus: CatalogRepairBatchItemStatusFilter;
}) {
  const { batch, items } = detail;
  const itemStatusFilters: Array<{
    label: string;
    status: CatalogRepairBatchItemStatusFilter;
  }> = [
    { label: 'Needs review', status: 'needs_review' },
    { label: 'Failed', status: 'failed' },
    { label: 'In progress', status: 'in_progress' },
    { label: 'Still flagged', status: 'completed_unresolved' },
    { label: 'All', status: 'all' },
  ];
  const itemSortFilters: Array<{ label: string; sort: CatalogRepairBatchItemSort }> = [
    { label: 'Needs review', sort: 'needs_review' },
    { label: 'Newest', sort: 'newest' },
    { label: 'Original order', sort: 'oldest' },
  ];

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
          <a className="button quiet" href={issueHref(batch.issueKey)}>
            Catalog issue
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
      <CatalogMaintenanceRealtimeRefresh label="Repair batch items are live" />
      <RepairBatchSummary batch={batch} />
      <section className="panel triage-panel">
        <div className="panel-header">
          <div>
            <h2>Recovery focus</h2>
            <div className="issue-hint">{repairBatchRecoveryHint(batch)}</div>
          </div>
          <RepairStatusBadge status={batch.status} />
        </div>
      </section>
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
                <a href={issueHref(batch.issueKey)}>
                  {batch.targetType}:{batch.targetId}
                </a>
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
              <dt>Accepted</dt>
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
              Item rows preserve movie snapshot, queue metadata, latest error, and recovery
              pressure.
            </div>
          </div>
          <span className="count">{items.totalCount}</span>
        </div>
        <div className="filter-bar" aria-label="Repair batch item filters">
          {itemStatusFilters.map((filter) => (
            <FilterLink
              key={filter.status}
              active={selectedItemStatus === filter.status}
              href={buildRepairBatchItemPageHref({
                batchId: batch.id,
                page: 1,
                pageSize: items.limit,
                sort: selectedItemSort,
                status: filter.status,
              })}
              label={filter.label}
            />
          ))}
        </div>
        <div className="filter-bar quiet" aria-label="Repair batch item sorting">
          {itemSortFilters.map((filter) => (
            <FilterLink
              key={filter.sort}
              active={selectedItemSort === filter.sort}
              href={buildRepairBatchItemPageHref({
                batchId: batch.id,
                page: 1,
                pageSize: items.limit,
                sort: filter.sort,
                status: selectedItemStatus,
              })}
              label={filter.label}
            />
          ))}
        </div>
        <SimplePaginationControls
          ariaLabel="Catalog repair batch item pagination"
          emptyLabel="No repair batch items"
          itemLabel="batch items"
          limit={items.limit}
          offset={items.offset}
          totalCount={items.totalCount}
          hrefForPage={(page) =>
            buildRepairBatchItemPageHref({
              batchId: batch.id,
              page,
              pageSize: items.limit,
              sort: selectedItemSort,
              status: selectedItemStatus,
            })
          }
        />
        <div className="table-scroll">
          <table className="repair-batch-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Issue</th>
                <th>Movie</th>
                <th>Status</th>
                <th>Job</th>
                <th>Reason</th>
                <th>Language</th>
                <th>Error</th>
                <th>Pressure</th>
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
            buildRepairBatchItemPageHref({
              batchId: batch.id,
              page,
              pageSize: items.limit,
              sort: selectedItemSort,
              status: selectedItemStatus,
            })
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

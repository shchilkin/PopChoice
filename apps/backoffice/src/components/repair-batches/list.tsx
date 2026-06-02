import type {
  CatalogRepairBatch,
  CatalogRepairBatchPage,
  CatalogRepairBatchSort,
  CatalogRepairBatchStatusFilter,
} from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { RepairStatusBadge } from '../catalog-repair-status';
import { CatalogMaintenanceRealtimeRefresh } from '../catalogMaintenanceRealtimeRefresh';
import { SimplePaginationControls } from '../shared';
import { FilterLink } from './filterLink';
import { buildRepairBatchListHref } from './helpers';

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
  const hrefForPage = (page: number) =>
    buildRepairBatchListHref({
      page,
      pageSize: batchPage.limit,
      sort: selectedSort,
      status: selectedStatus,
    });

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
          hrefForPage={hrefForPage}
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
          hrefForPage={hrefForPage}
        />
      </section>
    </BackofficeLayout>
  );
}

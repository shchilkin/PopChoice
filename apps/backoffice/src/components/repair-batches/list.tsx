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
import { DataTable, PanelHeader, SimplePaginationControls, TableEmptyRow } from '../shared';
import { FilterLink } from './filterLink';
import { buildRepairBatchListHref } from './helpers';

function RepairBatchRows({ batches }: { batches: CatalogRepairBatch[] }) {
  if (batches.length === 0) {
    return (
      <TableEmptyRow colSpan={9}>
        No durable catalog repair batches have been recorded yet.
      </TableEmptyRow>
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
        <PanelHeader
          title="Recent batches"
          hint="Filter durable batches by operator recovery state before opening raw JSON."
          count={batchPage.totalCount}
        />
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
        <DataTable
          className="repair-batch-table"
          columns={[
            'ID',
            'Status',
            'Issue',
            'Actor',
            'Limit',
            'Candidates',
            'Outcomes',
            'Created',
            'Actions',
          ]}
        >
          <RepairBatchRows batches={batchPage.batches} />
        </DataTable>
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

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { RepairStatusBadge } from '../catalog-repair-status';
import { CatalogMaintenanceRealtimeRefresh } from '../catalogMaintenanceRealtimeRefresh';
import { DataTable, PanelHeader, SimplePaginationControls } from '../shared';

import {
  RepairBatchContextPanel,
  RepairBatchItemRows,
  RepairBatchItemStatusCountsPanel,
  RepairBatchSummary,
} from './detailSections';
import { FilterLink } from './filterLink';
import {
  REPAIR_BATCH_ITEM_SORT_FILTERS,
  REPAIR_BATCH_ITEM_STATUS_FILTERS,
  buildRepairBatchItemPageHref,
  issueHref,
  repairBatchRecoveryHint,
} from './helpers';

import type {
  CatalogRepairBatchDetail,
  CatalogRepairBatchItemSort,
  CatalogRepairBatchItemStatusFilter,
} from '@pop-choice/shared';

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
  const hrefForItemPage = (page: number) =>
    buildRepairBatchItemPageHref({
      batchId: batch.id,
      page,
      pageSize: items.limit,
      sort: selectedItemSort,
      status: selectedItemStatus,
    });

  return (
    <BackofficeLayout
      active="repair-batches"
      title={`Repair Batch #${batch.id}`}
      eyebrow="Repair detail"
      breadcrumbs={[
        { href: '/', label: 'Backoffice' },
        { href: '/repair-batches', label: 'Repair batches' },
        { label: `Batch #${batch.id}` },
      ]}
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
        <PanelHeader
          title="Recovery focus"
          hint={repairBatchRecoveryHint(batch)}
          actions={<RepairStatusBadge status={batch.status} />}
        />
      </section>
      <section className="detail-grid">
        <RepairBatchContextPanel batch={batch} />
        <RepairBatchItemStatusCountsPanel batch={batch} />
      </section>
      <section className="panel">
        <PanelHeader
          title="Batch items"
          hint="Item rows preserve movie snapshot, queue metadata, latest error, and recovery pressure."
          count={items.totalCount}
        />
        <div className="filter-bar" aria-label="Repair batch item filters">
          {REPAIR_BATCH_ITEM_STATUS_FILTERS.map((filter) => (
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
          {REPAIR_BATCH_ITEM_SORT_FILTERS.map((filter) => (
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
          hrefForPage={hrefForItemPage}
        />
        <DataTable
          className="repair-batch-table"
          columns={[
            'Item',
            'Issue',
            'Movie',
            'Status',
            'Job',
            'Reason',
            'Language',
            'Error',
            'Pressure',
            'Updated',
            'Action',
          ]}
        >
          <RepairBatchItemRows items={items.items} />
        </DataTable>
        <SimplePaginationControls
          ariaLabel="Catalog repair batch item pagination bottom"
          emptyLabel="No repair batch items"
          itemLabel="batch items"
          limit={items.limit}
          offset={items.offset}
          totalCount={items.totalCount}
          hrefForPage={hrefForItemPage}
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
      breadcrumbs={[
        { href: '/', label: 'Backoffice' },
        { href: '/repair-batches', label: 'Repair batches' },
        { label: 'Batch not found' },
      ]}
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

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { RepairStatusBadge, repairStatusLabel } from '../catalog-repair-status';
import { CatalogStat, PanelHeader, TableEmptyRow } from '../shared';

import { getRepairBatchProgress, issueHref } from './helpers';
import { getRepairBatchItemRowView, type RepairBatchItemRowView } from './viewModels';

import type { CatalogRepairBatch, CatalogRepairBatchItem } from '@pop-choice/shared';

function RepairBatchItemAction({ action }: { action: RepairBatchItemRowView['action'] }) {
  if (action.type === 'inspect') return <span className="muted">Inspect</span>;

  return (
    <form action={`/repair-batches/${encodeURIComponent(action.batchId)}/actions`} method="post">
      <input type="hidden" name="action" value="retry_item" />
      <input type="hidden" name="batch_id" value={action.batchId} />
      <input type="hidden" name="item_id" value={action.itemId} />
      <input type="hidden" name="return_to" value={action.returnTo} />
      <button className="button small secondary" type="submit">
        Retry item
      </button>
    </form>
  );
}

export function RepairBatchItemRows({ items }: { items: CatalogRepairBatchItem[] }) {
  if (items.length === 0) {
    return (
      <TableEmptyRow colSpan={11}>No item rows were recorded for this repair batch.</TableEmptyRow>
    );
  }

  const rows = items.map(getRepairBatchItemRowView);

  return (
    <>
      {rows.map((row) => (
        <RepairBatchItemRow key={row.id} row={row} />
      ))}
    </>
  );
}

function RepairBatchItemRow({ row }: { row: RepairBatchItemRowView }) {
  return (
    <tr>
      <td>#{row.id}</td>
      <td>
        <a href={row.issueHref}>{row.issueKey}</a>
      </td>
      <td>
        <div className="movie-title">
          <strong>
            <a href={row.movieHref}>{row.movieLabel}</a>
          </strong>
          <span className="muted">{row.movieMeta}</span>
        </div>
      </td>
      <td>
        <RepairStatusBadge status={row.status} />
      </td>
      <td>
        <div className="queue-metadata">
          <strong>{row.jobIdLabel}</strong>
          <span>{row.queueNameLabel}</span>
          <span>{row.jobNameLabel}</span>
        </div>
      </td>
      <td>{row.reasonLabel}</td>
      <td>{row.languageLabel}</td>
      <td>
        <span title={row.errorTitle}>{row.errorLabel}</span>
      </td>
      <td>
        <div className="queue-metadata">
          <strong>{row.pressureLabel}</strong>
          <span>{row.attemptsLabel}</span>
        </div>
      </td>
      <td>{row.updatedAtLabel}</td>
      <td>
        <RepairBatchItemAction action={row.action} />
      </td>
    </tr>
  );
}

export function RepairBatchSummary({ batch }: { batch: CatalogRepairBatch }) {
  const hasUnavailableItems = batch.unavailableCount > 0;

  return (
    <section className="summary batch-summary" aria-label="Repair batch summary">
      <CatalogStat
        label="Status"
        value={repairStatusLabel(batch.status)}
        meta={getRepairBatchProgress(batch)}
        state={
          batch.status === 'completed' && !hasUnavailableItems
            ? 'healthy'
            : batch.status === 'failed' ||
                batch.status === 'partial' ||
                batch.status === 'unavailable' ||
                hasUnavailableItems
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
        state={batch.failedCount > 0 || hasUnavailableItems ? 'warning' : 'neutral'}
      />
    </section>
  );
}

export function RepairBatchContextPanel({ batch }: { batch: CatalogRepairBatch }) {
  return (
    <article className="panel">
      <PanelHeader title="Batch context" />
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
  );
}

export function RepairBatchItemStatusCountsPanel({ batch }: { batch: CatalogRepairBatch }) {
  return (
    <article className="panel">
      <PanelHeader title="Item status counts" />
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
  );
}

import type { CatalogRepairBatch, CatalogRepairBatchItem } from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { RepairStatusBadge, repairStatusLabel } from '../catalog-repair-status';
import { CatalogStat, PanelHeader, TableEmptyRow } from '../shared';
import {
  getRepairBatchProgress,
  issueHref,
  movieHref,
  repairItemPressureLabel,
  resultValue,
  snapshotValue,
  truncateText,
} from './helpers';

export function RepairBatchItemRows({ items }: { items: CatalogRepairBatchItem[] }) {
  if (items.length === 0) {
    return (
      <TableEmptyRow colSpan={10}>No item rows were recorded for this repair batch.</TableEmptyRow>
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

import type { CatalogRepairActionAudit } from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { JsonDetails } from '../shared';

export function humanizeBackofficeIdentifier(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCompactBackofficeDateTime(value: string): string {
  const formatted = formatBackofficeDateTime(value);
  return formatted.replace(/,\s*/g, ' ').replace(/\sUTC$/, ' UTC');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberFromResult(result: Record<string, unknown>, key: string): number | null {
  const value = result[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatRepairTarget(entry: CatalogRepairActionAudit) {
  if (entry.targetType === 'movie') {
    return <a href={`/movies/${encodeURIComponent(entry.targetId)}`}>Movie #{entry.targetId}</a>;
  }

  if (entry.targetType === 'catalog_issue') {
    return (
      <a href={`/#issue-${encodeURIComponent(entry.targetId)}`}>
        {humanizeBackofficeIdentifier(entry.targetId)}
      </a>
    );
  }

  return (
    <span>
      {entry.targetType}:{entry.targetId}
    </span>
  );
}

export type RepairResultChip = {
  key: string;
  label: string;
  value: number;
};

export function repairResultChips(result: Record<string, unknown>): RepairResultChip[] {
  const fields = [
    ['queued', 'Accepted'],
    ['deduped', 'Already queued'],
    ['failed', 'Failed'],
    ['unavailable', 'Unavailable'],
    ['attempted', 'Attempted'],
    ['totalCandidates', 'Total'],
  ] as const;

  return fields.flatMap(([key, label]) => {
    const value = numberFromResult(result, key);
    return value === null ? [] : [{ key, label, value }];
  });
}

export function repairResultStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    deduped: 'Already queued',
    enqueue_failed: 'Enqueue failed',
    failed: 'Failed',
    partial: 'Partially accepted',
    queued: 'Accepted',
    unavailable: 'Unavailable',
  };

  return labels[status] ?? humanizeBackofficeIdentifier(status);
}

export function repairResultStatusTone(status: string): 'good' | 'neutral' | 'warn' {
  if (
    status === 'failed' ||
    status === 'enqueue_failed' ||
    status === 'partial' ||
    status === 'unavailable'
  ) {
    return 'warn';
  }
  return status === 'completed_resolved' ? 'good' : 'neutral';
}

function RepairResultSummary({ entry }: { entry: CatalogRepairActionAudit }) {
  const result = isRecord(entry.result) ? entry.result : {};
  const jobId = typeof result.jobId === 'string' ? result.jobId : null;
  const status = typeof result.status === 'string' ? result.status : null;
  const chips = repairResultChips(result);

  return (
    <div className="repair-result">
      <div className="repair-result-headline">
        {entry.repairBatchId ? (
          <a className="repair-result-primary" href={`/repair-batches/${entry.repairBatchId}`}>
            Batch #{entry.repairBatchId}
          </a>
        ) : jobId ? (
          <span className="repair-result-primary">{jobId}</span>
        ) : (
          <span className="repair-result-primary">{status ?? 'Recorded'}</span>
        )}
        {status ? (
          <span className={`data-pill ${repairResultStatusTone(status)}`}>
            {repairResultStatusLabel(status)}
          </span>
        ) : null}
      </div>
      {chips.length > 0 ? (
        <div className="repair-result-chips">
          {chips.map((chip) => (
            <span key={chip.key} className={chip.key === 'failed' ? 'warn' : ''}>
              <strong>{chip.value}</strong> {chip.label.toLowerCase()}
            </span>
          ))}
        </div>
      ) : null}
      <JsonDetails className="repair-result-raw" label="Raw result" value={entry.result} />
    </div>
  );
}

export function RepairAuditRows({ audit }: { audit: CatalogRepairActionAudit[] }) {
  if (audit.length === 0) {
    return <p className="empty">No catalog repair actions have been recorded yet.</p>;
  }

  return (
    <div className="table-scroll">
      <table className="repair-audit-table">
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
              <td>
                <time dateTime={entry.createdAt} title={formatBackofficeDateTime(entry.createdAt)}>
                  {formatCompactBackofficeDateTime(entry.createdAt)}
                </time>
              </td>
              <td>{entry.actor}</td>
              <td>
                <span className="repair-issue-label">
                  {humanizeBackofficeIdentifier(entry.issueKey)}
                </span>
                <span className="repair-issue-key">{entry.issueKey}</span>
              </td>
              <td>{formatRepairTarget(entry)}</td>
              <td>{humanizeBackofficeIdentifier(entry.action)}</td>
              <td>
                <RepairResultSummary entry={entry} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

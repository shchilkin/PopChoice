import { confidenceWidth, formatPercent } from '../shared';

import type { TMDBMatchReviewReason, TMDBMatchReviewStatus } from '@pop-choice/shared';
import type { CSSProperties } from 'react';

export function renderReason(reason: TMDBMatchReviewReason): string {
  return reason === 'ambiguous_match' ? 'Ambiguous match' : 'Runtime mismatch';
}

export function ReasonBadge({ reason }: { reason: TMDBMatchReviewReason }) {
  const className = reason === 'runtime_mismatch' ? 'reason-runtime' : 'reason-ambiguous';
  return <span className={`pill ${className}`}>{renderReason(reason)}</span>;
}

export function renderStatus(status: TMDBMatchReviewStatus): string {
  const labels: Record<TMDBMatchReviewStatus, string> = {
    deferred: 'Deferred',
    ignored: 'Ignored',
    open: 'Open',
    resolved: 'Resolved',
  };
  return labels[status];
}

export function StatusBadge({ status }: { status: TMDBMatchReviewStatus }) {
  return <span className={`status ${status}`}>{renderStatus(status)}</span>;
}

export function ConfidenceMeter({ confidence }: { confidence: number | null }) {
  return (
    <div className="confidence-meter" aria-label={`Confidence ${formatPercent(confidence)}`}>
      <span style={{ '--confidence-width': confidenceWidth(confidence) } as CSSProperties} />
    </div>
  );
}

export function CurrentTMDBValue({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="data-pill neutral">-</span>;
  return <span className="data-pill good">{value}</span>;
}

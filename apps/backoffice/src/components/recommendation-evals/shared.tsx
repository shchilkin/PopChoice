import { CopyJsonButton } from './copyJsonButton';

import type { RecommendationEvalRunStatus } from '@pop-choice/shared';

export function recommendationEvalStatusLabel(status: RecommendationEvalRunStatus): string {
  const labels: Record<RecommendationEvalRunStatus, string> = {
    canceled: 'Canceled',
    completed: 'Completed',
    enqueue_failed: 'Enqueue failed',
    failed: 'Failed',
    pending: 'Pending',
    processing: 'Processing',
    queued: 'Queued',
  };

  return labels[status];
}

export function RecommendationEvalStatusBadge({ status }: { status: RecommendationEvalRunStatus }) {
  return (
    <span className={`status eval-status eval-${status}`}>
      {recommendationEvalStatusLabel(status)}
    </span>
  );
}

export function buildRecommendationEvalPageHref({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  return `/recommendation-evals?${params.toString()}`;
}

function stringifyJsonBlock(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

export function JsonBlock({ value }: { value: unknown }) {
  const serializedValue = stringifyJsonBlock(value);

  return (
    <div className="json-panel">
      <div className="json-panel-toolbar">
        <span>JSON</span>
        <CopyJsonButton label="JSON" text={serializedValue} />
      </div>
      <pre className="json-block">{serializedValue}</pre>
    </div>
  );
}

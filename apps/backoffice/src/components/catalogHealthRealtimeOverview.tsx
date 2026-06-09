'use client';

import { useEffect, useState } from 'react';

import { CatalogHealthLiveRefresh } from './catalogHealthLiveRefresh';
import { buildCatalogHealthOverviewViewModel } from './catalogHealthRealtimeViewModel';
import { CatalogStat } from './shared';

import type { CatalogHealthLiveData } from '../lib/catalogHealthLive';
import type {
  CatalogNextActionViewModel,
  CatalogQueueStatusViewModel,
} from './catalogHealthRealtimeViewModel';

function CatalogNextAction({ action }: { action: CatalogNextActionViewModel }) {
  return (
    <section className={action.className} aria-label="Next operator action">
      <div>
        <div className="next-action-title">{action.title}</div>
        <p>{action.copy}</p>
      </div>
      <a className="button small primary" href={action.href}>
        {action.label}
      </a>
    </section>
  );
}

function ManualRepairForm({ repairableIssueKeys }: { repairableIssueKeys: string[] }) {
  return (
    <form
      className="manual-repair-form"
      method="post"
      action="/catalog-health/actions"
      data-repair-form
    >
      <input type="hidden" name="action" value="enqueue_backfill" />
      <label>
        Movie ID
        <input name="movie_id" inputMode="numeric" pattern="[0-9]+" placeholder="331" required />
      </label>
      <label>
        Issue
        <select name="issue_key" defaultValue="missing_keyword_metadata" required>
          {repairableIssueKeys.map((issueKey) => (
            <option key={issueKey} value={issueKey}>
              {issueKey.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
            </option>
          ))}
        </select>
      </label>
      <label>
        Note
        <input name="note" placeholder="Optional context" />
      </label>
      <button className="button secondary small" type="submit" data-repair-submit>
        Queue manual backfill
      </button>
      <span className="repair-message" aria-live="polite" data-repair-message />
    </form>
  );
}

function CatalogQueueStatus({
  bullBoardUrl,
  repairableIssueKeys,
  queue,
}: {
  bullBoardUrl?: string;
  queue: CatalogQueueStatusViewModel;
  repairableIssueKeys: string[];
}) {
  return (
    <section className="queue-status" aria-label="Catalog maintenance queue status">
      <div className="queue-status-main">
        <div>
          <div className="queue-status-title">
            <span className={queue.dotClassName} aria-hidden="true" />
            <span>Catalog maintenance queue</span>
          </div>
          <p>{queue.statusCopy}</p>
        </div>
        <div className="queue-status-actions">
          <BullBoardAction action={queue.bullBoardAction} bullBoardUrl={bullBoardUrl} />
          <a className="button small" href="/repair-batches">
            Repair batches
          </a>
        </div>
      </div>
      {queue.diagnosticCopy ? <p className="queue-diagnostic">{queue.diagnosticCopy}</p> : null}
      <div className="queue-counts">
        {queue.counts.map((count) => (
          <span key={count.label}>
            <strong>{count.value}</strong> {count.label}
          </span>
        ))}
      </div>
      <details className="manual-repair">
        <summary>Manually queue a movie</summary>
        <ManualRepairForm repairableIssueKeys={repairableIssueKeys} />
      </details>
    </section>
  );
}

function BullBoardAction({
  action,
  bullBoardUrl,
}: {
  action: CatalogQueueStatusViewModel['bullBoardAction'];
  bullBoardUrl?: string;
}) {
  if (action === 'link') {
    return (
      <a className="button small" href={bullBoardUrl} target="_blank" rel="noreferrer">
        Open Bull Board
      </a>
    );
  }

  return (
    <span className="queue-diagnostic-action" aria-disabled="true">
      Bull Board unavailable
    </span>
  );
}

export function CatalogHealthRealtimeOverview({
  bullBoardUrl,
  initialData,
  repairableIssueKeys,
}: {
  bullBoardUrl?: string;
  initialData: CatalogHealthLiveData;
  repairableIssueKeys: string[];
}) {
  const [data, setData] = useState(initialData);
  const view = buildCatalogHealthOverviewViewModel(data, bullBoardUrl);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  return (
    <>
      <CatalogHealthLiveRefresh initialData={initialData} onSnapshot={setData} />
      <CatalogNextAction action={view.nextAction} />
      <CatalogQueueStatus
        bullBoardUrl={bullBoardUrl}
        queue={view.queue}
        repairableIssueKeys={repairableIssueKeys}
      />
      <section className="summary" aria-label="Catalog health summary">
        {view.summary.map((stat) => (
          <CatalogStat key={stat.label} {...stat} />
        ))}
      </section>
    </>
  );
}

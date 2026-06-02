'use client';

import { useEffect, useState } from 'react';

import type { CatalogMaintenanceQueueSnapshot } from '../catalogMaintenanceQueue';
import type { CatalogHealthLiveData } from '../lib/catalogHealthLive';
import { CatalogHealthLiveRefresh } from './catalogHealthLiveRefresh';
import { formatLiveSyncTime } from './liveRefreshTime';
import { CatalogStat } from './shared';

function CatalogStatusStrip({
  activeIssues,
  duplicateGroups,
  queueSnapshot,
}: {
  activeIssues: number;
  duplicateGroups: number;
  queueSnapshot: CatalogMaintenanceQueueSnapshot;
}) {
  const isHealthy = activeIssues === 0 && duplicateGroups === 0;

  return (
    <section
      className={`catalog-status ${isHealthy ? 'healthy' : 'needs-work'}`}
      aria-label="Catalog health status"
    >
      <div>
        <div className="status-heading">
          <span className="status-dot" aria-hidden="true" />
          <span>{isHealthy ? 'Catalog is clear' : 'Catalog needs operator attention'}</span>
        </div>
        <p className="status-copy">
          {isHealthy
            ? 'No active issue categories or duplicate groups are currently reported.'
            : 'Work the highest-count repairable panels first, then review duplicates before manual merges.'}
        </p>
      </div>
      <div className="status-metrics" aria-label="Open catalog signals">
        <span className={`pill ${activeIssues > 0 ? 'warning' : 'good'}`}>
          {activeIssues} active issue categories
        </span>
        <span className={`pill ${duplicateGroups > 0 ? 'warning' : 'good'}`}>
          {duplicateGroups} duplicate groups
        </span>
        <span className={`pill ${queueSnapshot.available ? 'good' : 'warning'}`}>
          {queueSnapshot.available
            ? `${queueSnapshot.openJobs} catalog queue open`
            : 'Catalog queue unavailable'}
        </span>
      </div>
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
  snapshot,
}: {
  bullBoardUrl?: string;
  repairableIssueKeys: string[];
  snapshot: CatalogMaintenanceQueueSnapshot;
}) {
  const state = !snapshot.available ? 'warning' : snapshot.openJobs > 0 ? 'neutral' : 'healthy';

  return (
    <section className="queue-status" aria-label="Catalog maintenance queue status">
      <div className="queue-status-main">
        <div>
          <div className="queue-status-title">
            <span className={`queue-dot ${state}`} aria-hidden="true" />
            <span>Catalog maintenance queue</span>
          </div>
          <p>
            {snapshot.available
              ? `Queue updated ${formatLiveSyncTime(snapshot.updatedAt)}.`
              : 'Queue data is unavailable, so backoffice cannot read repair job state.'}
          </p>
        </div>
        <div className="queue-status-actions">
          {bullBoardUrl ? (
            <a className="button small" href={bullBoardUrl} target="_blank" rel="noreferrer">
              Open Bull Board
            </a>
          ) : (
            <span className="button small disabled" aria-disabled="true">
              Queue dashboard unavailable
            </span>
          )}
          <a className="button small" href="/repair-batches">
            Repair batches
          </a>
        </div>
      </div>
      <div className="queue-counts">
        <span>
          <strong>{snapshot.counts.waiting}</strong> waiting
        </span>
        <span>
          <strong>{snapshot.counts.active}</strong> active
        </span>
        <span>
          <strong>{snapshot.counts.delayed + snapshot.counts.prioritized}</strong> scheduled
        </span>
        <span>
          <strong>{snapshot.counts.failed}</strong> failed
        </span>
        <span>
          <strong>{snapshot.counts.completed}</strong> completed
        </span>
      </div>
      <details className="manual-repair">
        <summary>Manually queue a movie</summary>
        <ManualRepairForm repairableIssueKeys={repairableIssueKeys} />
      </details>
    </section>
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
  const activeIssues = data.report.activeIssues;
  const duplicateGroups = data.report.duplicateGroups;

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  return (
    <>
      <CatalogHealthLiveRefresh initialData={initialData} onSnapshot={setData} />
      <CatalogStatusStrip
        activeIssues={activeIssues}
        duplicateGroups={duplicateGroups}
        queueSnapshot={data.queueSnapshot}
      />
      <CatalogQueueStatus
        bullBoardUrl={bullBoardUrl}
        repairableIssueKeys={repairableIssueKeys}
        snapshot={data.queueSnapshot}
      />
      <section className="summary" aria-label="Catalog health summary">
        <CatalogStat label="Movies" value={data.report.totalMovies} meta="Catalog rows tracked" />
        <CatalogStat
          label="Issue categories"
          value={activeIssues}
          meta={activeIssues === 0 ? 'No active categories' : 'Categories with affected rows'}
          state={activeIssues === 0 ? 'healthy' : 'warning'}
        />
        <CatalogStat
          label="Duplicate groups"
          value={duplicateGroups}
          meta={duplicateGroups === 0 ? 'No duplicate groups' : 'Groups awaiting review'}
          state={duplicateGroups === 0 ? 'healthy' : 'warning'}
        />
        <CatalogStat
          label="Stale threshold"
          value={`${data.report.staleAfterDays}d`}
          meta="TMDB metadata refresh window"
        />
      </section>
    </>
  );
}

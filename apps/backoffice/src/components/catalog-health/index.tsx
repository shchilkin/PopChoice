import type {
  CatalogHealthIssue,
  CatalogHealthIssueMoviePage,
  CatalogHealthReport,
  CatalogMovieSample,
  CatalogRepairActionAudit,
  CatalogRepairActionAuditPage,
  DuplicateIdentityGroup,
} from '@pop-choice/shared';

import type { CatalogMaintenanceQueueSnapshot } from '../../catalogMaintenanceQueue';
import type { CatalogHealthLiveData } from '../../lib/catalogHealthLive';
import {
  DEFAULT_BULK_REPAIR_LIMIT,
  DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
  formatBackofficeDateTime,
  REPAIRABLE_CATALOG_ISSUE_KEYS,
} from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { CatalogHealthLiveRefresh } from '../catalogHealthLiveRefresh';
import { CatalogRepairEnhancement } from '../catalogRepairEnhancement';
import {
  BooleanDataPill,
  CatalogStat,
  CountPill,
  OptionalCatalogValue,
  SimplePaginationControls,
} from '../shared';

function catalogIssueHint(issueKey: string): string {
  const hints: Record<string, string> = {
    missing_age_rating: 'Age-rating gaps reduce safety and household filtering quality.',
    missing_cast_metadata: 'Cast gaps limit actor-aware recommendation features.',
    missing_director_metadata: 'Director gaps limit creator-aware recommendation features.',
    missing_genre_metadata: 'Genre gaps weaken discovery and future filters.',
    missing_keyword_metadata: 'Keyword gaps reduce nuance for ranking and search.',
    missing_localized_name: 'Localized names improve non-English operator and user views.',
    missing_poster_url: 'Poster coverage affects result cards and catalog browsing.',
    missing_runtime: 'Runtime gaps make fit and pacing recommendations weaker.',
    missing_tmdb_id: 'Identity gaps block richer TMDB refreshes and joins.',
    missing_tmdb_matched_at: 'Matched rows need timestamps for stale-data decisions.',
    stale_tmdb_metadata: 'Refresh candidates through the rate-limited TMDB path.',
  };

  return hints[issueKey] ?? 'Review affected catalog records.';
}

function buildCatalogIssuePageHref({
  issueKey,
  page,
  pageSize,
}: {
  issueKey: string;
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();
  params.set('issue', issueKey);
  params.set('issuePage', String(page));
  params.set('issuePageSize', String(pageSize));
  return `/?${params.toString()}#issue-${encodeURIComponent(issueKey)}`;
}

function buildRepairAuditPageHref({ page, pageSize }: { page: number; pageSize: number }) {
  const params = new URLSearchParams();
  params.set('auditPage', String(page));
  params.set('auditPageSize', String(pageSize));
  return `/?${params.toString()}#repair-audit`;
}

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

function CatalogQueueStatus({ snapshot }: { snapshot: CatalogMaintenanceQueueSnapshot }) {
  const state = !snapshot.available ? 'warning' : snapshot.openJobs > 0 ? 'neutral' : 'healthy';

  return (
    <section className="queue-status" aria-label="Catalog maintenance queue status">
      <div>
        <div className="queue-status-title">
          <span className={`queue-dot ${state}`} aria-hidden="true" />
          <span>Catalog maintenance queue</span>
        </div>
        <p>
          {snapshot.available
            ? `Synced from BullMQ at ${formatBackofficeDateTime(snapshot.updatedAt)}.`
            : 'REDIS_URL is unavailable, so backoffice cannot read BullMQ state.'}
        </p>
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
    </section>
  );
}

function SampleRows({
  emptyLabel = 'No sample records returned.',
  issueKey,
  samples,
}: {
  emptyLabel?: string;
  issueKey: string;
  samples: CatalogMovieSample[];
}) {
  if (samples.length === 0) return <p className="empty">{emptyLabel}</p>;

  const canRepair = REPAIRABLE_CATALOG_ISSUE_KEYS.has(issueKey);

  return (
    <div className="table-scroll">
      <table className="sample-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Movie</th>
            <th>Year</th>
            <th>TMDB</th>
            <th>Poster</th>
            <th>Localized</th>
            <th>Runtime</th>
            <th>Age</th>
            <th>Matched</th>
            {canRepair ? <th>Repair</th> : null}
          </tr>
        </thead>
        <tbody>
          {samples.map((movie) => (
            <tr key={movie.id} data-repair-row data-issue-key={issueKey} data-movie-id={movie.id}>
              <td className="id-cell">#{movie.id}</td>
              <td className="movie-cell">
                <strong>{movie.name}</strong>
              </td>
              <td>{movie.year}</td>
              <td>
                <OptionalCatalogValue value={movie.tmdb_id} />
              </td>
              <td>
                <BooleanDataPill value={Boolean(movie.poster_url)} />
              </td>
              <td>
                <OptionalCatalogValue value={movie.localized_name} />
              </td>
              <td>
                {movie.duration > 0 ? movie.duration : <span className="data-pill warn">0</span>}
              </td>
              <td>
                <OptionalCatalogValue value={movie.age_rating} />
              </td>
              <td>
                <OptionalCatalogValue value={movie.tmdb_matched_at} />
              </td>
              {canRepair ? (
                <td className="repair-cell">
                  <form
                    className="repair-form"
                    method="post"
                    action="/catalog-health/actions"
                    data-repair-form
                  >
                    <input type="hidden" name="action" value="enqueue_backfill" />
                    <input type="hidden" name="issue_key" value={issueKey} />
                    <input type="hidden" name="movie_id" value={movie.id} />
                    <button className="button primary small" type="submit" data-repair-submit>
                      Queue backfill
                    </button>
                    <span className="repair-message" aria-live="polite" data-repair-message />
                  </form>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulkRepairForm({ issue }: { issue: CatalogHealthIssue }) {
  const batchLimit = Math.min(issue.count, DEFAULT_BULK_REPAIR_LIMIT);

  return (
    <form
      className="bulk-repair-form"
      method="post"
      action="/catalog-health/actions"
      data-bulk-repair-form
      data-confirm-message={`Queue up to ${batchLimit} repair jobs for ${issue.label}? Workers will keep the existing TMDB/OpenAI pacing.`}
    >
      <input type="hidden" name="action" value="bulk_enqueue_backfill" />
      <input type="hidden" name="issue_key" value={issue.key} />
      <input type="hidden" name="batch_limit" value={batchLimit} />
      <button className="button secondary small" type="submit" data-repair-submit>
        Queue next {batchLimit}
      </button>
      <span className="repair-message" aria-live="polite" data-repair-message />
    </form>
  );
}

function CatalogIssuePanel({
  issue,
  issuePage,
}: {
  issue: CatalogHealthIssue;
  issuePage: CatalogHealthIssueMoviePage | null;
}) {
  const severity = issue.count > 0 ? 'needs-work' : 'healthy';
  const canRepair = REPAIRABLE_CATALOG_ISSUE_KEYS.has(issue.key);
  const state = issue.count === 0 ? 'healthy' : canRepair ? 'repairable' : 'warning';
  const activePage = issuePage?.issueKey === issue.key ? issuePage : null;
  const rows = activePage ? activePage.movies : issue.samples;

  return (
    <section
      id={`issue-${issue.key}`}
      className={`panel issue-panel ${severity} ${canRepair && issue.count > 0 ? 'repairable' : ''}`}
    >
      <div className="panel-header">
        <div className="issue-title">
          <div className="issue-title-row">
            <h2>{issue.label}</h2>
            <span className={`pill ${state}`}>
              {issue.count === 0 ? 'Healthy' : canRepair ? 'Repairable' : 'Review'}
            </span>
          </div>
          <div className="issue-hint">{catalogIssueHint(issue.key)}</div>
        </div>
        <div className="panel-actions">
          <CountPill count={issue.count} state={state} />
          {issue.count > 0 ? (
            <a
              className={`button small ${activePage ? 'quiet' : ''}`}
              href={buildCatalogIssuePageHref({
                issueKey: issue.key,
                page: 1,
                pageSize: activePage?.limit ?? DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
              })}
            >
              {activePage ? 'Browsing rows' : 'Browse rows'}
            </a>
          ) : null}
          {canRepair && issue.count > 0 ? <BulkRepairForm issue={issue} /> : null}
        </div>
      </div>
      {issue.count === 0 ? (
        <p className="empty">No affected movies.</p>
      ) : (
        <>
          {activePage ? (
            <SimplePaginationControls
              ariaLabel={`${issue.label} affected movie pagination`}
              emptyLabel="No affected movies"
              itemLabel="affected movies"
              limit={activePage.limit}
              offset={activePage.offset}
              totalCount={activePage.totalCount}
              hrefForPage={(page) =>
                buildCatalogIssuePageHref({
                  issueKey: issue.key,
                  page,
                  pageSize: activePage.limit,
                })
              }
            />
          ) : null}
          <SampleRows
            issueKey={issue.key}
            samples={rows}
            emptyLabel={activePage ? 'No affected movies on this page.' : undefined}
          />
          {activePage ? (
            <SimplePaginationControls
              ariaLabel={`${issue.label} affected movie pagination bottom`}
              emptyLabel="No affected movies"
              itemLabel="affected movies"
              limit={activePage.limit}
              offset={activePage.offset}
              totalCount={activePage.totalCount}
              hrefForPage={(page) =>
                buildCatalogIssuePageHref({
                  issueKey: issue.key,
                  page,
                  pageSize: activePage.limit,
                })
              }
            />
          ) : issue.count > issue.samples.length ? (
            <div className="panel-footer">
              <a
                className="button small"
                href={buildCatalogIssuePageHref({
                  issueKey: issue.key,
                  page: 1,
                  pageSize: DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
                })}
              >
                Browse all {issue.count} rows
              </a>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function RepairFlash({ repairStatus }: { repairStatus: string | null }) {
  if (repairStatus === 'queued') {
    return (
      <div className="notice good">
        Catalog backfill job queued. Workers will process it through the existing rate-limited TMDB
        path.
      </div>
    );
  }

  if (repairStatus === 'bulk-queued') {
    return (
      <div className="notice good">
        Catalog repair batch queued. Workers will process jobs through the existing rate-limited
        TMDB path.
      </div>
    );
  }

  if (repairStatus === 'bulk-partial') {
    return (
      <div className="notice warn">
        Catalog repair batch partially queued. Check the recent repair audit before retrying.
      </div>
    );
  }

  if (repairStatus === 'unavailable') {
    return (
      <div className="notice warn">
        Catalog repair queue is unavailable. Check REDIS_URL and the backoffice logs.
      </div>
    );
  }

  if (repairStatus === 'empty') {
    return <div className="notice warn">No affected movies are currently available to queue.</div>;
  }

  if (repairStatus === 'failed') {
    return (
      <div className="notice warn">
        Catalog repair action failed. Check backoffice logs for details.
      </div>
    );
  }

  return null;
}

export function RepairAuditRows({ audit }: { audit: CatalogRepairActionAudit[] }) {
  if (audit.length === 0) {
    return <p className="empty">No catalog repair actions have been recorded yet.</p>;
  }

  return (
    <table>
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
            <td>{formatBackofficeDateTime(entry.createdAt)}</td>
            <td>{entry.actor}</td>
            <td>{entry.issueKey}</td>
            <td>
              {entry.targetType}:{entry.targetId}
            </td>
            <td>{entry.action}</td>
            <td>
              {entry.repairBatchId
                ? `batch:${entry.repairBatchId}`
                : String(entry.result.jobId ?? entry.result.status ?? JSON.stringify(entry.result))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DuplicateGroup({ group }: { group: DuplicateIdentityGroup }) {
  return (
    <article className="duplicate-group">
      <div className="duplicate-heading">
        <strong>{group.identityKey}</strong>
        <span>{group.count} movies</span>
      </div>
      <ul>
        {group.movies.map((movie) => (
          <li key={movie.id}>
            <span>#{movie.id}</span>
            <span>
              {movie.name} ({movie.year})
            </span>
            <span>tmdb:{movie.tmdb_id ?? '-'}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function DuplicateReport({
  title,
  report,
}: {
  title: string;
  report: CatalogHealthReport['duplicateTmdbIds'];
}) {
  const state = report.totalGroups > 0 ? 'warning' : 'healthy';

  return (
    <section
      className={`panel duplicate-panel ${report.totalGroups > 0 ? 'needs-work' : 'healthy'}`}
    >
      <div className="panel-header">
        <div className="issue-title">
          <div className="issue-title-row">
            <h2>{title}</h2>
            <span className={`pill ${state}`}>{report.totalGroups > 0 ? 'Review' : 'Healthy'}</span>
          </div>
          <div className="issue-hint">
            Potential identity collisions that should be reviewed before merge automation.
          </div>
        </div>
        <CountPill count={report.totalGroups} state={state} />
      </div>
      {report.groups.length === 0 ? (
        <p className="empty">No duplicate groups found.</p>
      ) : (
        report.groups.map((group) => <DuplicateGroup key={group.identityKey} group={group} />)
      )}
    </section>
  );
}

export function CatalogHealthPage({
  auditPage,
  initialLiveData,
  issueMoviePage,
  queueSnapshot,
  report,
  repairStatus,
}: {
  report: CatalogHealthReport;
  auditPage: CatalogRepairActionAuditPage;
  initialLiveData: CatalogHealthLiveData;
  issueMoviePage: CatalogHealthIssueMoviePage | null;
  queueSnapshot: CatalogMaintenanceQueueSnapshot;
  repairStatus: string | null;
}) {
  const activeIssues = report.issues.filter((issue) => issue.count > 0).length;
  const duplicateGroups =
    report.duplicateTmdbIds.totalGroups + report.duplicateNormalizedTitleYears.totalGroups;

  return (
    <BackofficeLayout
      active="health"
      title="Catalog Health"
      eyebrow="Catalog operations"
      description={
        <>
          Generated {formatBackofficeDateTime(report.generatedAt)}. Live refresh is enabled without
          a full page reload.
        </>
      }
      actions={
        <a className="button" href="/">
          Refresh
        </a>
      }
    >
      <RepairFlash repairStatus={repairStatus} />
      <CatalogHealthLiveRefresh initialData={initialLiveData} intervalSeconds={12} />
      <CatalogStatusStrip
        activeIssues={activeIssues}
        duplicateGroups={duplicateGroups}
        queueSnapshot={queueSnapshot}
      />
      <CatalogQueueStatus snapshot={queueSnapshot} />
      <section className="summary" aria-label="Catalog health summary">
        <CatalogStat label="Movies" value={report.totalMovies} meta="Catalog rows tracked" />
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
          value={`${report.staleAfterDays}d`}
          meta="TMDB metadata refresh window"
        />
      </section>
      <div className="grid">
        {report.issues.map((issue) => (
          <CatalogIssuePanel key={issue.key} issue={issue} issuePage={issueMoviePage} />
        ))}
        <DuplicateReport title="Duplicate TMDB ids" report={report.duplicateTmdbIds} />
        <DuplicateReport
          title="Duplicate normalized title/year groups"
          report={report.duplicateNormalizedTitleYears}
        />
        <section className="panel" id="repair-audit">
          <div className="panel-header">
            <h2>Recent repair actions</h2>
            <span className="count">{auditPage.totalCount}</span>
          </div>
          <SimplePaginationControls
            ariaLabel="Catalog repair audit pagination"
            emptyLabel="No catalog repair actions"
            itemLabel="repair actions"
            limit={auditPage.limit}
            offset={auditPage.offset}
            totalCount={auditPage.totalCount}
            hrefForPage={(page) => buildRepairAuditPageHref({ page, pageSize: auditPage.limit })}
          />
          <RepairAuditRows audit={auditPage.audit} />
          <SimplePaginationControls
            ariaLabel="Catalog repair audit pagination bottom"
            emptyLabel="No catalog repair actions"
            itemLabel="repair actions"
            limit={auditPage.limit}
            offset={auditPage.offset}
            totalCount={auditPage.totalCount}
            hrefForPage={(page) => buildRepairAuditPageHref({ page, pageSize: auditPage.limit })}
          />
        </section>
      </div>
      <CatalogRepairEnhancement />
    </BackofficeLayout>
  );
}

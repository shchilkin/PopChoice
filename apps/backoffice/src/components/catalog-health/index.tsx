import type {
  CatalogHealthReport,
  CatalogHealthIssueMoviePage,
  CatalogRepairActionAuditPage,
  DuplicateIdentityGroup,
} from '@pop-choice/shared';

import type { CatalogHealthLiveData } from '../../lib/catalogHealthLive';
import { REPAIRABLE_CATALOG_ISSUE_KEYS } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { RepairAuditRows } from '../catalog-repair-audit';
import { CatalogHealthRealtimeOverview } from '../catalogHealthRealtimeOverview';
import { CatalogRepairEnhancement } from '../catalogRepairEnhancement';
import { formatLiveSyncTime } from '../liveRefreshTime';
import { CountPill, SimplePaginationControls } from '../shared';
import { buildRepairAuditPageHref } from '../shared/hrefs';
import { CatalogIssuePanel } from './issuePanel';

function RepairFlash({ repairStatus }: { repairStatus: string | null }) {
  if (repairStatus === 'queued') {
    return (
      <div className="notice neutral">
        Catalog backfill work accepted. This row is not resolved yet; workers will process it
        through the existing rate-limited TMDB path.
      </div>
    );
  }

  if (repairStatus === 'deduped') {
    return (
      <div className="notice neutral">
        Catalog backfill work was already queued. Workers will process the existing job through the
        rate-limited TMDB path.
      </div>
    );
  }

  if (repairStatus === 'bulk-queued') {
    return (
      <div className="notice neutral">
        Catalog repair batch accepted. Issues stay open until workers update the catalog and the
        next health report clears them.
      </div>
    );
  }

  if (repairStatus === 'bulk-orchestration-queued') {
    return (
      <div className="notice neutral">
        Catalog repair orchestration accepted. A durable batch was created; workers will add repair
        items and queue backfill jobs in chunks.
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
  bullBoardUrl,
  initialLiveData,
  issueMoviePage,
  report,
  repairStatus,
}: {
  report: CatalogHealthReport;
  auditPage: CatalogRepairActionAuditPage;
  bullBoardUrl?: string;
  initialLiveData: CatalogHealthLiveData;
  issueMoviePage: CatalogHealthIssueMoviePage | null;
  repairStatus: string | null;
}) {
  return (
    <BackofficeLayout
      active="health"
      title="Catalog Health"
      eyebrow="Catalog operations"
      description={
        <>
          Updated {formatLiveSyncTime(report.generatedAt)}. Changes appear automatically while you
          work.
        </>
      }
    >
      <RepairFlash repairStatus={repairStatus} />
      <CatalogHealthRealtimeOverview
        bullBoardUrl={bullBoardUrl}
        initialData={initialLiveData}
        repairableIssueKeys={Array.from(REPAIRABLE_CATALOG_ISSUE_KEYS)}
      />
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

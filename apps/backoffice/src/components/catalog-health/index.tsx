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
import { buildDuplicateReportViewModel, buildRepairFlashViewModel } from './viewModels';

function RepairFlash({ repairStatus }: { repairStatus: string | null }) {
  const view = buildRepairFlashViewModel(repairStatus);

  return view ? <div className={`notice ${view.tone}`}>{view.copy}</div> : null;
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
  const view = buildDuplicateReportViewModel(report);

  return (
    <section className={view.panelClassName}>
      <div className="panel-header">
        <div className="issue-title">
          <div className="issue-title-row">
            <h2>{title}</h2>
            <span className={`pill ${view.state}`}>{view.pillLabel}</span>
          </div>
          <div className="issue-hint">
            Potential identity collisions that should be reviewed before merge automation.
          </div>
        </div>
        <CountPill count={report.totalGroups} state={view.state} />
      </div>
      {view.groups.length === 0 ? (
        <p className="empty">No duplicate groups found.</p>
      ) : (
        view.groups.map((group) => <DuplicateGroup key={group.identityKey} group={group} />)
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

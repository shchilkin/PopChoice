import type {
  CatalogHealthReport,
  CatalogHealthIssueMoviePage,
  CatalogRepairActionAuditPage,
  DuplicateIdentityGroup,
} from '@pop-choice/shared';
import { Badge, ButtonLink } from '@pop-choice/ui';

import type { CatalogHealthLiveData } from '../../lib/catalogHealthLive';
import { REPAIRABLE_CATALOG_ISSUE_KEYS } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { RepairAuditRows } from '../catalog-repair-audit';
import { CatalogHealthRealtimeOverview } from '../catalogHealthRealtimeOverview';
import { CatalogRepairEnhancement } from '../catalogRepairEnhancement';
import { CountPill, SimplePaginationControls } from '../shared';
import { buildRepairAuditPageHref } from '../shared/hrefs';
import { CatalogIssuePanel } from './issuePanel';
import {
  buildCatalogActionSectionsViewModel,
  buildCatalogWorkQueueViewModel,
  buildDuplicateReportViewModel,
  buildRepairFlashViewModel,
} from './viewModels';

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
  id,
  title,
  report,
}: {
  id: string;
  title: string;
  report: CatalogHealthReport['duplicateTmdbIds'];
}) {
  const view = buildDuplicateReportViewModel(report);

  return (
    <section id={id} className={view.panelClassName}>
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

function CatalogWorkQueue({ report }: { report: CatalogHealthReport }) {
  const view = buildCatalogWorkQueueViewModel(report);

  return (
    <section className="work-queue" aria-labelledby="catalog-work-queue-title">
      <div className="work-queue-heading">
        <div>
          <p className="page-kicker">Operator queue</p>
          <h2 id="catalog-work-queue-title">Start here</h2>
          <p>{view.summary}</p>
        </div>
        <Badge variant={view.items.length > 0 ? 'warning' : 'success'}>
          {view.items.length} open lane{view.items.length === 1 ? '' : 's'}
        </Badge>
      </div>
      {view.items.length === 0 ? (
        <p className="empty compact">No prioritized catalog work is open.</p>
      ) : (
        <ol className="work-queue-list">
          {view.items.map((item) => (
            <li className="work-queue-item" key={item.issueKey}>
              <div className="work-queue-item-main">
                <div className="work-queue-item-title">
                  <Badge variant={item.lane === 'repair' ? 'accent' : 'warning'}>
                    {item.priorityLabel}
                  </Badge>
                  <strong>{item.label}</strong>
                  <span>{item.count}</span>
                </div>
                <p>{item.detail}</p>
              </div>
              <ButtonLink
                href={item.actionHref}
                size="sm"
                variant={item.lane === 'repair' ? 'primary' : 'secondary'}
              >
                {item.actionLabel}
              </ButtonLink>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function HealthyCatalogChecks({ checks }: { checks: CatalogHealthReport['issues'] }) {
  if (checks.length === 0) return null;

  return (
    <section className="healthy-checks" aria-labelledby="healthy-catalog-checks-title">
      <div className="healthy-checks-heading">
        <div>
          <p className="page-kicker">Resolved checks</p>
          <h2 id="healthy-catalog-checks-title">No affected rows</h2>
        </div>
        <Badge variant="success">{checks.length} clear</Badge>
      </div>
      <ul className="healthy-checks-list">
        {checks.map((issue) => (
          <li aria-label={`${issue.label}: 0 affected`} key={issue.key}>
            <span aria-hidden="true" className="healthy-checks-dot" />
            <span>{issue.label}</span>
            <span>0 affected</span>
          </li>
        ))}
      </ul>
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
  const actionSections = buildCatalogActionSectionsViewModel(report);

  return (
    <BackofficeLayout
      active="health"
      title="Catalog Health"
      eyebrow="Catalog operations"
      description="Resolve catalog data issues in priority order, then verify worker progress below."
    >
      <RepairFlash repairStatus={repairStatus} />
      <CatalogHealthRealtimeOverview
        bullBoardUrl={bullBoardUrl}
        initialData={initialLiveData}
        repairableIssueKeys={Array.from(REPAIRABLE_CATALOG_ISSUE_KEYS)}
      />
      <CatalogWorkQueue report={report} />
      <div className="grid">
        {actionSections.issues.map((issue) => (
          <CatalogIssuePanel key={issue.key} issue={issue} issuePage={issueMoviePage} />
        ))}
        {actionSections.duplicateTmdbIdsVisible ? (
          <DuplicateReport
            id="duplicate-tmdb-ids"
            title="Duplicate TMDB ids"
            report={report.duplicateTmdbIds}
          />
        ) : null}
        {actionSections.duplicateNormalizedTitleYearsVisible ? (
          <DuplicateReport
            id="duplicate-title-year"
            title="Duplicate normalized title/year groups"
            report={report.duplicateNormalizedTitleYears}
          />
        ) : null}
        {actionSections.hasOpenWork ? null : (
          <section className="panel healthy">
            <div className="panel-header">
              <h2>Catalog checks are clear</h2>
              <span className="pill healthy">All clear</span>
            </div>
            <p className="empty">No catalog data issues need operator action.</p>
          </section>
        )}
        <HealthyCatalogChecks checks={actionSections.healthyChecks} />
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

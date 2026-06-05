import type {
  CatalogHealthIssue,
  CatalogHealthIssueMoviePage,
  CatalogMovieSample,
} from '@pop-choice/shared';

import {
  DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
  REPAIRABLE_CATALOG_ISSUE_KEYS,
} from '../../lib/backoffice';
import {
  BooleanDataPill,
  CountPill,
  OptionalCatalogValue,
  SimplePaginationControls,
} from '../shared';
import { buildCatalogIssuePageHref } from '../shared/hrefs';
import {
  buildCatalogIssuePanelViewModel,
  catalogIssueHint,
  type BulkRepairActionViewModel,
} from './viewModels';

export { buildCatalogIssuePageHref };
export { catalogIssueHint };

const SAMPLE_TABLE_COLUMNS = [
  'ID',
  'Movie',
  'Year',
  'TMDB',
  'Poster',
  'Localized',
  'Runtime',
  'Age',
  'Matched',
] as const;

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
            {SAMPLE_TABLE_COLUMNS.map((column) => (
              <th key={column}>{column}</th>
            ))}
            {canRepair ? <th>Repair</th> : null}
          </tr>
        </thead>
        <tbody>
          {samples.map((movie) => (
            <tr key={movie.id} data-repair-row data-issue-key={issueKey} data-movie-id={movie.id}>
              <td className="id-cell">
                <a href={`/movies/${encodeURIComponent(movie.id)}`}>#{movie.id}</a>
              </td>
              <td className="movie-cell">
                <strong>
                  <a href={`/movies/${encodeURIComponent(movie.id)}`}>{movie.name}</a>
                </strong>
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
  const { bulkActions } = buildCatalogIssuePanelViewModel({ issue, issuePage: null });

  return (
    <div className="bulk-repair-actions">
      {bulkActions.map((action) => (
        <BulkRepairActionForm key={action.action} action={action} issueKey={issue.key} />
      ))}
    </div>
  );
}

function BulkRepairActionForm({
  action,
  issueKey,
}: {
  action: BulkRepairActionViewModel;
  issueKey: string;
}) {
  return (
    <form
      className="bulk-repair-form"
      method="post"
      action="/catalog-health/actions"
      data-bulk-repair-form
      data-confirm-message={action.confirmMessage}
    >
      <input type="hidden" name="action" value={action.action} />
      <input type="hidden" name="issue_key" value={issueKey} />
      <input type="hidden" name="batch_limit" value={action.batchLimit} />
      <button className={action.buttonClassName} type="submit" data-repair-submit>
        {action.label}
      </button>
      <span className="repair-message" aria-live="polite" data-repair-message />
    </form>
  );
}

function CatalogIssuePagination({
  ariaLabel,
  issue,
  page,
}: {
  ariaLabel: string;
  issue: CatalogHealthIssue;
  page: CatalogHealthIssueMoviePage;
}) {
  return (
    <SimplePaginationControls
      ariaLabel={ariaLabel}
      emptyLabel="No affected movies"
      itemLabel="affected movies"
      limit={page.limit}
      offset={page.offset}
      totalCount={page.totalCount}
      hrefForPage={(nextPage) =>
        buildCatalogIssuePageHref({
          issueKey: issue.key,
          page: nextPage,
          pageSize: page.limit,
        })
      }
    />
  );
}

export function CatalogIssuePanel({
  issue,
  issuePage,
}: {
  issue: CatalogHealthIssue;
  issuePage: CatalogHealthIssueMoviePage | null;
}) {
  const view = buildCatalogIssuePanelViewModel({ issue, issuePage });

  return (
    <section id={`issue-${issue.key}`} className={view.panelClassName}>
      <div className="panel-header issue-panel-header">
        <div className="issue-title">
          <div className="issue-title-row">
            <h2>{issue.label}</h2>
            <span className={`pill ${view.countState}`}>{view.pillLabel}</span>
          </div>
          <div className="issue-hint">{view.hint}</div>
        </div>
        <div className="issue-panel-controls">
          <div className="issue-panel-row-actions">
            <CountPill count={issue.count} state={view.countState} />
            {view.browseAction ? (
              <a className={view.browseAction.className} href={view.browseAction.href}>
                {view.browseAction.label}
              </a>
            ) : null}
          </div>
          {view.canRepair && issue.count > 0 ? <BulkRepairForm issue={issue} /> : null}
        </div>
      </div>
      {view.showHealthyEmpty ? (
        <p className="empty">No affected movies.</p>
      ) : (
        <>
          {view.activePage ? (
            <CatalogIssuePagination
              ariaLabel={`${issue.label} affected movie pagination`}
              issue={issue}
              page={view.activePage}
            />
          ) : null}
          <SampleRows issueKey={issue.key} samples={view.rows} emptyLabel={view.emptyLabel} />
          {view.activePage ? (
            <CatalogIssuePagination
              ariaLabel={`${issue.label} affected movie pagination bottom`}
              issue={issue}
              page={view.activePage}
            />
          ) : view.footerBrowseHref ? (
            <div className="panel-footer">
              <a className="button small" href={view.footerBrowseHref}>
                Browse all {issue.count} rows
              </a>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

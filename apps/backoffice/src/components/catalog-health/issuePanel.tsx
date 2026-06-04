import type {
  CatalogHealthIssue,
  CatalogHealthIssueMoviePage,
  CatalogMovieSample,
} from '@pop-choice/shared';

import {
  DEFAULT_BULK_REPAIR_LIMIT,
  DEFAULT_CATALOG_ISSUE_PAGE_SIZE,
  MAX_ASYNC_BULK_REPAIR_LIMIT,
  REPAIRABLE_CATALOG_ISSUE_KEYS,
} from '../../lib/backoffice';
import {
  BooleanDataPill,
  CountPill,
  OptionalCatalogValue,
  SimplePaginationControls,
} from '../shared';
import { buildCatalogIssuePageHref } from '../shared/hrefs';

export function catalogIssueHint(issueKey: string): string {
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

export { buildCatalogIssuePageHref };

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
  const batchLimit = Math.min(issue.count, DEFAULT_BULK_REPAIR_LIMIT);
  const allLimit = Math.min(issue.count, MAX_ASYNC_BULK_REPAIR_LIMIT);
  const allLabel =
    issue.count > MAX_ASYNC_BULK_REPAIR_LIMIT ? `Queue first ${allLimit}` : `Queue all ${allLimit}`;

  return (
    <div className="bulk-repair-actions">
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
      {allLimit > batchLimit ? (
        <form
          className="bulk-repair-form"
          method="post"
          action="/catalog-health/actions"
          data-bulk-repair-form
          data-confirm-message={`${allLabel} repair jobs for ${issue.label}? Backoffice will create a durable batch now, then workers will add repair jobs in chunks.`}
        >
          <input type="hidden" name="action" value="bulk_enqueue_backfill_async" />
          <input type="hidden" name="issue_key" value={issue.key} />
          <input type="hidden" name="batch_limit" value={allLimit} />
          <button className="button quiet small" type="submit" data-repair-submit>
            {allLabel}
          </button>
          <span className="repair-message" aria-live="polite" data-repair-message />
        </form>
      ) : null}
    </div>
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
      <div className="panel-header issue-panel-header">
        <div className="issue-title">
          <div className="issue-title-row">
            <h2>{issue.label}</h2>
            <span className={`pill ${state}`}>
              {issue.count === 0 ? 'Healthy' : canRepair ? 'Repairable' : 'Review'}
            </span>
          </div>
          <div className="issue-hint">{catalogIssueHint(issue.key)}</div>
        </div>
        <div className="issue-panel-controls">
          <div className="issue-panel-row-actions">
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
          </div>
          {canRepair && issue.count > 0 ? <BulkRepairForm issue={issue} /> : null}
        </div>
      </div>
      {issue.count === 0 ? (
        <p className="empty">No affected movies.</p>
      ) : (
        <>
          {activePage ? (
            <CatalogIssuePagination
              ariaLabel={`${issue.label} affected movie pagination`}
              issue={issue}
              page={activePage}
            />
          ) : null}
          <SampleRows
            issueKey={issue.key}
            samples={rows}
            emptyLabel={activePage ? 'No affected movies on this page.' : undefined}
          />
          {activePage ? (
            <CatalogIssuePagination
              ariaLabel={`${issue.label} affected movie pagination bottom`}
              issue={issue}
              page={activePage}
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

import type { TMDBMatchReview, TMDBReviewCandidate } from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { PanelHeader, TableEmptyRow, TableScroll } from '../shared';
import {
  ConfidenceMeter,
  CurrentTMDBValue,
  ReasonBadge,
  renderReason,
  renderStatus,
  StatusBadge,
} from './reviewPresentation';
import {
  buildCandidateSummaryViewModel,
  buildReviewPaginationViewModel,
  type ReviewFilters,
} from './helpers';

const REVIEW_TABLE_COLUMNS = [
  'ID',
  'Local movie',
  'Reason',
  'Status',
  'Candidates',
  'Current TMDB',
  'Updated',
  '',
] as const;

function ReviewFilterSummary({ filters }: { filters: ReviewFilters }) {
  return (
    <div className="toolbar-summary" aria-label="Active filters">
      <span className="pill">
        {filters.status === 'all' ? 'All statuses' : renderStatus(filters.status)}
      </span>
      <span className="pill">
        {filters.reason === 'all' ? 'All reasons' : renderReason(filters.reason)}
      </span>
      <span className="pill">{filters.sort.replaceAll('_', ' ')}</span>
    </div>
  );
}

function PaginationControls({
  filters,
  page,
  pageSize,
  totalCount,
}: {
  filters: ReviewFilters;
  page: number;
  pageSize: number;
  totalCount: number;
}) {
  const view = buildReviewPaginationViewModel({ filters, page, pageSize, totalCount });

  return (
    <nav className="pagination" aria-label="Review queue pagination">
      <span className="pagination-summary">{view.summary}</span>
      <div className="pagination-actions">
        {view.previousHref ? (
          <a className="button small" href={view.previousHref}>
            Previous
          </a>
        ) : (
          <span className="button small disabled" aria-disabled="true">
            Previous
          </span>
        )}
        <span className="pagination-page">
          Page {view.currentPage} / {view.totalPages}
        </span>
        {view.nextHref ? (
          <a className="button small" href={view.nextHref}>
            Next
          </a>
        ) : (
          <span className="button small disabled" aria-disabled="true">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}

function CandidateSummary({ candidates }: { candidates: TMDBReviewCandidate[] }) {
  const view = buildCandidateSummaryViewModel(candidates);
  if (view.emptyText) return <span className="muted">{view.emptyText}</span>;

  return (
    <div className="candidate-summary">
      <div className="candidate-headline">
        <strong>{view.headline}</strong>
        <span className="pill">{view.confidenceLabel}</span>
      </div>
      <ConfidenceMeter confidence={view.confidence} />
      <div className="muted">{view.meta}</div>
    </div>
  );
}

function ReviewRows({ reviews }: { reviews: TMDBMatchReview[] }) {
  if (reviews.length === 0) {
    return <TableEmptyRow colSpan={8}>No TMDB review rows match these filters.</TableEmptyRow>;
  }

  return (
    <>
      {reviews.map((review) => (
        <tr key={review.id}>
          <td>
            <a href={`/tmdb-reviews/${encodeURIComponent(review.id)}`}>#{review.id}</a>
          </td>
          <td>
            <div className="movie-title">
              <strong>{review.movieName}</strong>
              <span className="muted">
                {review.movieYear} ·{' '}
                <a href={`/movies/${encodeURIComponent(review.movieId)}`}>movie {review.movieId}</a>
              </span>
            </div>
          </td>
          <td>
            <ReasonBadge reason={review.reason} />
          </td>
          <td>
            <StatusBadge status={review.status} />
          </td>
          <td>
            <CandidateSummary candidates={review.candidates} />
          </td>
          <td>
            <CurrentTMDBValue value={review.currentMovie?.tmdb_id} />
          </td>
          <td>{formatBackofficeDateTime(review.updatedAt)}</td>
          <td>
            <a className="button small" href={`/tmdb-reviews/${encodeURIComponent(review.id)}`}>
              Open
            </a>
          </td>
        </tr>
      ))}
    </>
  );
}

export function ReviewListPage({
  reviews,
  filters,
  pagination,
}: {
  reviews: TMDBMatchReview[];
  filters: ReviewFilters;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
  };
}) {
  return (
    <BackofficeLayout
      active="reviews"
      title="TMDB Match Reviews"
      eyebrow="Catalog decisions"
      description="Review ambiguous TMDB candidates and runtime confidence cases before changing catalog data."
      actions={
        <a className="button" href="/tmdb-reviews">
          Reset
        </a>
      }
    >
      <form className="review-toolbar" method="get" action="/tmdb-reviews">
        <div className="toolbar-fields">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={pagination.pageSize} />
          <label>
            Status
            <select name="status" defaultValue={filters.status}>
              <option value="open">Open</option>
              <option value="deferred">Deferred</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
              <option value="all">All</option>
            </select>
          </label>
          <label>
            Reason
            <select name="reason" defaultValue={filters.reason}>
              <option value="all">All</option>
              <option value="ambiguous_match">Ambiguous match</option>
              <option value="runtime_mismatch">Runtime mismatch</option>
            </select>
          </label>
          <label>
            Sort
            <select name="sort" defaultValue={filters.sort}>
              <option value="highest_risk">Highest risk</option>
              <option value="oldest">Oldest first</option>
              <option value="newest">Newest first</option>
            </select>
          </label>
          <button className="button primary" type="submit">
            Apply filters
          </button>
        </div>
        <ReviewFilterSummary filters={filters} />
      </form>
      <section className="panel">
        <PanelHeader title="Review queue" count={pagination.totalCount} />
        <PaginationControls filters={filters} {...pagination} />
        <TableScroll>
          <table className="review-table">
            <thead>
              <tr>
                {REVIEW_TABLE_COLUMNS.map((column, index) => (
                  <th key={`${column}-${index}`}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <ReviewRows reviews={reviews} />
            </tbody>
          </table>
        </TableScroll>
        <PaginationControls filters={filters} {...pagination} />
      </section>
    </BackofficeLayout>
  );
}

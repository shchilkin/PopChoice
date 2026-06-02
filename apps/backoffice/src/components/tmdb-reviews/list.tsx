import type { TMDBMatchReview, TMDBReviewCandidate } from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { formatPercent } from '../shared';
import {
  ConfidenceMeter,
  CurrentTMDBValue,
  ReasonBadge,
  renderReason,
  renderStatus,
  StatusBadge,
} from './reviewPresentation';
import { buildReviewPageHref, candidateConfidenceGap, type ReviewFilters } from './helpers';

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
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const currentPage = Math.max(page, 1);
  const firstItem =
    totalCount === 0 || currentPage > totalPages ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = currentPage > totalPages ? 0 : Math.min(currentPage * pageSize, totalCount);

  return (
    <nav className="pagination" aria-label="Review queue pagination">
      <span className="pagination-summary">
        {totalCount === 0
          ? 'No reviews'
          : currentPage > totalPages
            ? `Page ${currentPage} is past ${totalCount} matching reviews`
            : `Showing ${firstItem}-${lastItem} of ${totalCount} reviews`}
      </span>
      <div className="pagination-actions">
        {currentPage > 1 ? (
          <a
            className="button small"
            href={buildReviewPageHref({ filters, page: currentPage - 1, pageSize })}
          >
            Previous
          </a>
        ) : (
          <span className="button small disabled" aria-disabled="true">
            Previous
          </span>
        )}
        <span className="pagination-page">
          Page {currentPage} / {totalPages}
        </span>
        {currentPage < totalPages ? (
          <a
            className="button small"
            href={buildReviewPageHref({ filters, page: currentPage + 1, pageSize })}
          >
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
  if (candidates.length === 0) return <span className="muted">No candidates captured</span>;

  const [best] = candidates;
  const gap = candidateConfidenceGap(candidates);

  return (
    <div className="candidate-summary">
      <div className="candidate-headline">
        <strong>
          {best?.title}
          {best?.releaseYear === null || best?.releaseYear === undefined
            ? null
            : ` (${best.releaseYear})`}
        </strong>
        <span className="pill">{formatPercent(best?.confidence ?? null)}</span>
      </div>
      <ConfidenceMeter confidence={best?.confidence ?? null} />
      <div className="muted">
        {candidates.length} candidate(s){gap === null ? '' : `, gap ${formatPercent(gap)}`}
      </div>
    </div>
  );
}

function ReviewRows({ reviews }: { reviews: TMDBMatchReview[] }) {
  if (reviews.length === 0) {
    return (
      <tr>
        <td colSpan={8} className="empty">
          No TMDB review rows match these filters.
        </td>
      </tr>
    );
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
        <div className="panel-header">
          <h2>Review queue</h2>
          <span className="count">{pagination.totalCount}</span>
        </div>
        <PaginationControls filters={filters} {...pagination} />
        <div className="table-scroll">
          <table className="review-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Local movie</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Candidates</th>
                <th>Current TMDB</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <ReviewRows reviews={reviews} />
            </tbody>
          </table>
        </div>
        <PaginationControls filters={filters} {...pagination} />
      </section>
    </BackofficeLayout>
  );
}

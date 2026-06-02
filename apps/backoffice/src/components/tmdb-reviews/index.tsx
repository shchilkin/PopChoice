import type {
  TMDBMatchReview,
  TMDBMatchReviewAction,
  TMDBMatchReviewActionAudit,
  TMDBMatchReviewReason,
  TMDBMatchReviewSort,
  TMDBMatchReviewStatus,
  TMDBReviewCandidate,
} from '@pop-choice/shared';

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

function ReviewFilterSummary({
  filters,
}: {
  filters: {
    status: TMDBMatchReviewStatus | 'all';
    reason: TMDBMatchReviewReason | 'all';
    sort: TMDBMatchReviewSort;
  };
}) {
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

function buildReviewPageHref({
  filters,
  page,
  pageSize,
}: {
  filters: {
    status: TMDBMatchReviewStatus | 'all';
    reason: TMDBMatchReviewReason | 'all';
    sort: TMDBMatchReviewSort;
  };
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();
  params.set('status', filters.status);
  params.set('reason', filters.reason);
  params.set('sort', filters.sort);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  return `/tmdb-reviews?${params.toString()}`;
}

function PaginationControls({
  filters,
  page,
  pageSize,
  totalCount,
}: {
  filters: {
    status: TMDBMatchReviewStatus | 'all';
    reason: TMDBMatchReviewReason | 'all';
    sort: TMDBMatchReviewSort;
  };
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

  const [best, runnerUp] = candidates;
  const gap =
    best?.confidence !== null &&
    best?.confidence !== undefined &&
    runnerUp?.confidence !== null &&
    runnerUp?.confidence !== undefined
      ? best.confidence - runnerUp.confidence
      : null;

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
  filters: {
    status: TMDBMatchReviewStatus | 'all';
    reason: TMDBMatchReviewReason | 'all';
    sort: TMDBMatchReviewSort;
  };
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

function getCandidateWarning({
  review,
  candidate,
}: {
  review: TMDBMatchReview;
  candidate: TMDBReviewCandidate;
}): string | null {
  if (candidate.id === null) return 'Candidate has no TMDB id and cannot be applied.';
  if (candidate.confidence !== null && candidate.confidence < 0.7) {
    return 'Low confidence candidate. Verify title, year, and runtime before applying.';
  }
  if (candidate.releaseYear !== null && candidate.releaseYear !== review.movieYear) {
    return `Release year differs from local movie year ${review.movieYear}.`;
  }

  return null;
}

function CandidateCard({
  review,
  candidate,
  index,
}: {
  review: TMDBMatchReview;
  candidate: TMDBReviewCandidate;
  index: number;
}) {
  const canApply =
    candidate.id !== null && (review.status === 'open' || review.status === 'deferred');
  const isBest = index === 0;
  const isCurrent = candidate.id !== null && candidate.id === review.currentMovie?.tmdb_id;
  const warning = getCandidateWarning({ candidate, review });

  return (
    <article className={`candidate ${isBest ? 'best' : ''} ${isCurrent ? 'current' : ''}`}>
      <div>
        <div className="candidate-title">
          <h3>{candidate.title}</h3>
          <div className="candidate-flags">
            {isBest ? <span className="pill good">Best candidate</span> : null}
            {isCurrent ? <span className="pill repairable">Current TMDB</span> : null}
            {warning ? <span className="pill warning">Needs check</span> : null}
          </div>
        </div>
        <dl>
          <div>
            <dt>TMDB</dt>
            <dd>{candidate.id ?? '-'}</dd>
          </div>
          <div>
            <dt>Original</dt>
            <dd>{candidate.originalTitle ?? '-'}</dd>
          </div>
          <div>
            <dt>Year</dt>
            <dd>{candidate.releaseYear ?? '-'}</dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>{formatPercent(candidate.confidence)}</dd>
          </div>
        </dl>
        <ConfidenceMeter confidence={candidate.confidence} />
        {warning ? <p className="candidate-warning">{warning}</p> : null}
      </div>
      {canApply ? (
        <form
          className="action-form apply-action"
          method="post"
          action={`/tmdb-reviews/${encodeURIComponent(review.id)}/actions`}
        >
          <input type="hidden" name="action" value="apply_candidate" />
          <input type="hidden" name="candidate_id" value={String(candidate.id)} />
          <label>
            Decision note
            <input name="note" maxLength={500} placeholder="Why this candidate is correct" />
          </label>
          <button className="button success" type="submit">
            Apply candidate
          </button>
        </form>
      ) : (
        <p className="muted">This candidate cannot be applied from the current review state.</p>
      )}
    </article>
  );
}

function AuditRows({ audit }: { audit: TMDBMatchReviewActionAudit[] }) {
  if (audit.length === 0) return <p className="empty">No decisions have been recorded yet.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>When</th>
          <th>Actor</th>
          <th>Action</th>
          <th>Status</th>
          <th>Candidate</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        {audit.map((entry) => (
          <tr key={entry.id}>
            <td>{formatBackofficeDateTime(entry.createdAt)}</td>
            <td>{entry.actor}</td>
            <td>{entry.action.replaceAll('_', ' ')}</td>
            <td>
              {entry.previousStatus ? (
                <StatusBadge status={entry.previousStatus} />
              ) : (
                <span className="data-pill neutral">-</span>
              )}{' '}
              <StatusBadge status={entry.newStatus} />
            </td>
            <td>
              {entry.candidate?.id ?? '-'} {entry.candidate ? entry.candidate.title : ''}
            </td>
            <td>{entry.note ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusActionForm({
  review,
  action,
  label,
}: {
  review: TMDBMatchReview;
  action: Exclude<TMDBMatchReviewAction, 'apply_candidate'>;
  label: string;
}) {
  const disabled =
    review.status === 'resolved' ||
    (action === 'reject' && review.status === 'ignored') ||
    (action === 'defer' && review.status === 'deferred') ||
    (action === 'reopen' && review.status === 'open');
  const details = {
    defer: {
      buttonClass: 'secondary',
      className: 'defer',
      description: 'Keep it out of the active queue until more catalog context exists.',
    },
    reject: {
      buttonClass: 'danger',
      className: 'reject',
      description: 'Mark this review as ignored when candidates are wrong or not useful.',
    },
    reopen: {
      buttonClass: 'quiet',
      className: 'reopen',
      description: 'Move a deferred or ignored review back into active operator work.',
    },
  }[action];

  return (
    <article className={`decision-card ${details.className}`}>
      <div className="decision-card-header">
        <span className="decision-title">{label}</span>
        <span className="small-note">{details.description}</span>
      </div>
      <form
        className="action-form"
        method="post"
        action={`/tmdb-reviews/${encodeURIComponent(review.id)}/actions`}
      >
        <input type="hidden" name="action" value={action} />
        <label>
          Decision note
          <input name="note" maxLength={500} placeholder="Optional rationale" disabled={disabled} />
        </label>
        <button className={`button ${details.buttonClass}`} type="submit" disabled={disabled}>
          {label}
        </button>
      </form>
    </article>
  );
}

export function ReviewDetailPage({
  review,
  audit,
}: {
  review: TMDBMatchReview;
  audit: TMDBMatchReviewActionAudit[];
}) {
  return (
    <BackofficeLayout
      active="reviews"
      title={`TMDB Review #${review.id}`}
      eyebrow="Catalog decision"
      description={
        <div className="toolbar-summary">
          <ReasonBadge reason={review.reason} />
          <StatusBadge status={review.status} />
          <span>Updated {formatBackofficeDateTime(review.updatedAt)}</span>
        </div>
      }
      actions={
        <a className="button" href="/tmdb-reviews">
          Back to queue
        </a>
      }
    >
      <section className="detail-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Local movie</h2>
          </div>
          <dl className="facts">
            <div>
              <dt>ID</dt>
              <dd>
                <a href={`/movies/${encodeURIComponent(review.movieId)}`}>{review.movieId}</a>
              </dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>{review.currentMovie?.name ?? review.movieName}</dd>
            </div>
            <div>
              <dt>Year</dt>
              <dd>{review.currentMovie?.year ?? review.movieYear}</dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>{review.currentMovie?.duration ?? '-'}</dd>
            </div>
            <div>
              <dt>Age</dt>
              <dd>{review.currentMovie?.age_rating ?? '-'}</dd>
            </div>
            <div>
              <dt>TMDB</dt>
              <dd>
                <CurrentTMDBValue value={review.currentMovie?.tmdb_id} />
              </dd>
            </div>
            <div>
              <dt>Matched at</dt>
              <dd>{formatBackofficeDateTime(review.currentMovie?.tmdb_matched_at)}</dd>
            </div>
          </dl>
          <div className="decision-brief">
            <span className="small-note">Current match confidence</span>
            <strong>{formatPercent(review.currentMovie?.tmdb_match_confidence ?? null)}</strong>
            <ConfidenceMeter confidence={review.currentMovie?.tmdb_match_confidence ?? null} />
          </div>
        </article>
        <article className="panel">
          <div className="panel-header">
            <h2>Why it needs review</h2>
          </div>
          <div className="copy">
            <p>
              <strong>{renderReason(review.reason)}</strong>
            </p>
            <p>{review.notes ?? 'No notes were recorded by backfill.'}</p>
            <p className="muted">
              Actions are audited. Applying a candidate only changes TMDB identity fields and marks
              the match source as manual; richer metadata still comes from backfill/discovery
              refreshes.
            </p>
          </div>
        </article>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Decision actions</h2>
        </div>
        <div className="decision-actions">
          <StatusActionForm review={review} action="reject" label="Reject / ignore" />
          <StatusActionForm review={review} action="defer" label="Defer" />
          <StatusActionForm review={review} action="reopen" label="Reopen" />
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Candidates</h2>
          <span className="count">{review.candidates.length}</span>
        </div>
        <div className="candidates">
          {review.candidates.length === 0 ? (
            <p className="empty">
              No candidate metadata was captured. Reject, defer, or rerun backfill after checking
              TMDB manually.
            </p>
          ) : (
            review.candidates.map((candidate, index) => (
              <CandidateCard
                key={`${candidate.id ?? 'unknown'}-${index}`}
                review={review}
                candidate={candidate}
                index={index}
              />
            ))
          )}
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Audit history</h2>
        </div>
        <AuditRows audit={audit} />
      </section>
    </BackofficeLayout>
  );
}

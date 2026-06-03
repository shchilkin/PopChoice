import type {
  TMDBMatchReview,
  TMDBMatchReviewAction,
  TMDBMatchReviewActionAudit,
  TMDBReviewCandidate,
} from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { formatPercent } from '../shared';
import { ReviewActionSubmitButton } from './actionSubmitButton';
import { AuditRows } from './auditRows';
import {
  buildReviewPageHref,
  canApplyCandidate,
  getCandidateWarning,
  getReviewRiskSummary,
  isCurrentCandidate,
} from './helpers';
import {
  ConfidenceMeter,
  CurrentTMDBValue,
  ReasonBadge,
  renderReason,
  StatusBadge,
} from './reviewPresentation';

function CandidateCard({
  review,
  candidate,
  index,
}: {
  review: TMDBMatchReview;
  candidate: TMDBReviewCandidate;
  index: number;
}) {
  const canApply = canApplyCandidate({ candidate, review });
  const isBest = index === 0;
  const isCurrent = isCurrentCandidate({ candidate, review });
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
          <ReviewActionSubmitButton
            buttonClass="success"
            label="Apply candidate"
            pendingLabel="Applying..."
          />
          <ReviewActionSubmitButton
            buttonClass="secondary"
            label="Apply + next"
            name="next_review"
            pendingLabel="Applying..."
            value="1"
          />
        </form>
      ) : (
        <p className="muted">This candidate cannot be applied from the current review state.</p>
      )}
    </article>
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
        <ReviewActionSubmitButton
          buttonClass={details.buttonClass}
          disabled={disabled}
          label={label}
          pendingLabel="Saving..."
        />
        {action === 'reopen' ? null : (
          <ReviewActionSubmitButton
            buttonClass="secondary"
            disabled={disabled}
            label={`${label} + next`}
            name="next_review"
            pendingLabel="Saving..."
            value="1"
          />
        )}
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
  const riskSummary = getReviewRiskSummary(review);
  const openQueueHref = buildReviewPageHref({
    filters: { reason: 'all', sort: 'highest_risk', status: 'open' },
    page: 1,
    pageSize: 25,
  });

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
        <>
          <a className="button" href={openQueueHref}>
            Next open
          </a>
          <a className="button quiet" href="/tmdb-reviews">
            Back to queue
          </a>
        </>
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
        <article className={`panel review-risk ${riskSummary.level}`}>
          <div className="panel-header">
            <div>
              <h2>{riskSummary.title}</h2>
              <div className="issue-hint">Decision context before changing TMDB identity.</div>
            </div>
            <span className={`pill ${riskSummary.level === 'low' ? 'good' : 'warning'}`}>
              {riskSummary.level}
            </span>
          </div>
          <ul className="evidence-list">
            {riskSummary.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
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

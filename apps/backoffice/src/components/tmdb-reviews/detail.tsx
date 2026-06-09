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
  buildCandidateCardViewModel,
  buildStatusActionViewModel,
  getReviewRiskSummary,
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
  const view = buildCandidateCardViewModel({ candidate, index, review });

  return (
    <article className={view.className}>
      <div>
        <div className="candidate-title">
          <h3>{view.title}</h3>
          <div className="candidate-flags">
            {view.flags.map((flag) => (
              <span key={flag.label} className={flag.className}>
                {flag.label}
              </span>
            ))}
          </div>
        </div>
        <dl>
          {view.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
        <ConfidenceMeter confidence={view.confidence} />
        {view.warning ? <p className="candidate-warning">{view.warning}</p> : null}
      </div>
      {view.applyCandidateId ? (
        <form className="action-form apply-action" method="post" action={view.actionHref}>
          <input type="hidden" name="action" value="apply_candidate" />
          <input type="hidden" name="candidate_id" value={view.applyCandidateId} />
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
  const view = buildStatusActionViewModel({ action, review });

  return (
    <article className={`decision-card ${view.className}`}>
      <div className="decision-card-header">
        <span className="decision-title">{label}</span>
        <span className="small-note">{view.description}</span>
      </div>
      <form className="action-form" method="post" action={view.formAction}>
        <input type="hidden" name="action" value={action} />
        <label>
          Decision note
          <input
            name="note"
            maxLength={500}
            placeholder="Optional rationale"
            disabled={view.disabled}
          />
        </label>
        <ReviewActionSubmitButton
          buttonClass={view.buttonClass}
          disabled={view.disabled}
          label={label}
          pendingLabel="Saving..."
        />
        {view.includeNextAction ? (
          <ReviewActionSubmitButton
            buttonClass="secondary"
            disabled={view.disabled}
            label={`${label} + next`}
            name="next_review"
            pendingLabel="Saving..."
            value="1"
          />
        ) : null}
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
      breadcrumbs={[
        { href: '/', label: 'Backoffice' },
        { href: '/tmdb-reviews', label: 'TMDB reviews' },
        { label: `Review #${review.id}` },
      ]}
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

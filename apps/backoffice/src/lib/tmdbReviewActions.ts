import { applyTMDBMatchReviewAction, listTMDBMatchReviewPage } from '@pop-choice/shared';
import type { TMDBMatchReview, TMDBMatchReviewAction } from '@pop-choice/shared';

import {
  backofficeActionError,
  ensureBackofficeReady,
  parseOperatorActor,
} from './backofficeRuntime';

export type TMDBReviewFormActionResult = {
  action: TMDBMatchReviewAction;
  redirectTo: string;
  review: TMDBMatchReview;
};

export function parseAction(value: FormDataEntryValue | null): TMDBMatchReviewAction {
  if (
    value === 'apply_candidate' ||
    value === 'reject' ||
    value === 'defer' ||
    value === 'reopen'
  ) {
    return value;
  }

  throw backofficeActionError(`Unsupported review action "${String(value)}".`);
}

export function parseCandidateId(value: FormDataEntryValue | null): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;

  if (typeof value !== 'string') {
    throw backofficeActionError('Candidate id must be numeric.');
  }

  const trimmed = value.trim();
  if (trimmed === '') return undefined;

  if (!/^\d+$/.test(trimmed)) {
    throw backofficeActionError('Candidate id must be numeric.');
  }

  const candidateId = Number(trimmed);
  if (!Number.isSafeInteger(candidateId) || candidateId <= 0) {
    throw backofficeActionError('Candidate id must be a positive safe integer.');
  }

  return candidateId;
}

export function assertCandidateIdForAction(
  action: TMDBMatchReviewAction,
  candidateId: number | undefined,
): void {
  if (action === 'apply_candidate' && candidateId === undefined) {
    throw backofficeActionError('Candidate id is required when applying a TMDB candidate.');
  }
}

export function isNextReviewRequested(value: FormDataEntryValue | null): boolean {
  return value === '1' || value === 'true' || value === 'on';
}

export function reviewDetailPath(reviewId: string): string {
  return `/tmdb-reviews/${encodeURIComponent(reviewId)}`;
}

export function openReviewQueuePath(): string {
  return '/tmdb-reviews?status=open&reason=all&sort=highest_risk&page=1&pageSize=25';
}

export async function getNextOpenReviewPath(currentReviewId: string): Promise<string> {
  const page = await listTMDBMatchReviewPage({
    limit: 2,
    offset: 0,
    reason: 'all',
    sort: 'highest_risk',
    status: 'open',
  });
  const nextReview = page.reviews.find((review) => review.id !== currentReviewId);

  return nextReview ? reviewDetailPath(nextReview.id) : openReviewQueuePath();
}

export async function applyTMDBReviewFormAction(
  reviewId: string,
  formData: FormData,
  headers: Headers,
): Promise<TMDBReviewFormActionResult> {
  await ensureBackofficeReady();

  const action = parseAction(formData.get('action'));
  const candidateId = parseCandidateId(formData.get('candidate_id'));
  const note = formData.get('note');

  assertCandidateIdForAction(action, candidateId);

  const review = await applyTMDBMatchReviewAction({
    reviewId,
    action,
    actor: parseOperatorActor(headers),
    candidateId,
    note: typeof note === 'string' ? note : undefined,
  });
  const redirectTo = isNextReviewRequested(formData.get('next_review'))
    ? await getNextOpenReviewPath(review.id)
    : reviewDetailPath(review.id);

  return { action, redirectTo, review };
}

import { applyTMDBMatchReviewAction } from '@pop-choice/shared';
import type { TMDBMatchReviewAction } from '@pop-choice/shared';

import {
  backofficeActionError,
  ensureBackofficeReady,
  parseOperatorActor,
} from './backofficeRuntime';

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

export async function applyTMDBReviewFormAction(
  reviewId: string,
  formData: FormData,
  headers: Headers,
): Promise<void> {
  await ensureBackofficeReady();

  const action = parseAction(formData.get('action'));
  const candidateId = parseCandidateId(formData.get('candidate_id'));
  const note = formData.get('note');

  assertCandidateIdForAction(action, candidateId);

  await applyTMDBMatchReviewAction({
    reviewId,
    action,
    actor: parseOperatorActor(headers),
    candidateId,
    note: typeof note === 'string' ? note : undefined,
  });
}

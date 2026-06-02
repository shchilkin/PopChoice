import type {
  TMDBMatchReview,
  TMDBMatchReviewReason,
  TMDBMatchReviewSort,
  TMDBMatchReviewStatus,
  TMDBReviewCandidate,
} from '@pop-choice/shared';

export type ReviewFilters = {
  status: TMDBMatchReviewStatus | 'all';
  reason: TMDBMatchReviewReason | 'all';
  sort: TMDBMatchReviewSort;
};

export function buildReviewPageHref({
  filters,
  page,
  pageSize,
}: {
  filters: ReviewFilters;
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

export function candidateConfidenceGap(candidates: TMDBReviewCandidate[]): number | null {
  const [best, runnerUp] = candidates;

  return best?.confidence !== null &&
    best?.confidence !== undefined &&
    runnerUp?.confidence !== null &&
    runnerUp?.confidence !== undefined
    ? best.confidence - runnerUp.confidence
    : null;
}

export function getCandidateWarning({
  candidate,
  review,
}: {
  candidate: Pick<TMDBReviewCandidate, 'confidence' | 'id' | 'releaseYear'>;
  review: Pick<TMDBMatchReview, 'movieYear'>;
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

export function canApplyCandidate({
  candidate,
  review,
}: {
  candidate: Pick<TMDBReviewCandidate, 'id'>;
  review: Pick<TMDBMatchReview, 'status'>;
}): boolean {
  return candidate.id !== null && (review.status === 'open' || review.status === 'deferred');
}

export function isCurrentCandidate({
  candidate,
  review,
}: {
  candidate: Pick<TMDBReviewCandidate, 'id'>;
  review: Pick<TMDBMatchReview, 'currentMovie'>;
}): boolean {
  return candidate.id !== null && candidate.id === review.currentMovie?.tmdb_id;
}

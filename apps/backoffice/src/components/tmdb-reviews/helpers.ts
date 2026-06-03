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

export type ReviewRiskSummary = {
  level: 'low' | 'medium' | 'high';
  items: string[];
  title: string;
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

export function buildReviewDetailHref(reviewId: string): string {
  return `/tmdb-reviews/${encodeURIComponent(reviewId)}`;
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

export function getReviewRiskSummary(review: TMDBMatchReview): ReviewRiskSummary {
  const items: string[] = [];
  const bestCandidate = review.candidates[0];
  const confidenceGap = candidateConfidenceGap(review.candidates);
  const candidateWarnings = review.candidates
    .map((candidate) => getCandidateWarning({ candidate, review }))
    .filter((warning): warning is string => Boolean(warning));

  if (review.reason === 'runtime_mismatch') {
    items.push('Runtime mismatch can indicate a wrong TMDB identity even when title/year match.');
  }
  if (review.currentMovie?.tmdb_id) {
    items.push(`Current catalog TMDB id is ${review.currentMovie.tmdb_id}; applying changes it.`);
  }
  if (bestCandidate?.id === null || bestCandidate === undefined) {
    items.push('No applyable TMDB candidate is available from captured metadata.');
  }
  if (bestCandidate?.confidence !== null && bestCandidate?.confidence !== undefined) {
    if (bestCandidate.confidence < 0.7) {
      items.push('Best candidate confidence is below the normal manual-apply threshold.');
    }
  } else {
    items.push('Best candidate confidence is unavailable.');
  }
  if (confidenceGap !== null && confidenceGap < 0.1) {
    items.push('Top candidates are close together; compare title, year, and runtime carefully.');
  }
  for (const warning of candidateWarnings.slice(0, 2)) {
    if (!items.includes(warning)) items.push(warning);
  }

  if (items.length === 0) {
    return {
      level: 'low',
      title: 'Low review risk',
      items: ['Top candidate looks consistent with the local movie snapshot.'],
    };
  }

  const level = review.reason === 'runtime_mismatch' || items.length >= 3 ? 'high' : 'medium';

  return {
    level,
    title: level === 'high' ? 'High review risk' : 'Medium review risk',
    items,
  };
}

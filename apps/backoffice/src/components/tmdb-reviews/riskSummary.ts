import { candidateConfidenceGap, getCandidateWarning } from './candidateReview';

import type { TMDBMatchReview } from '@pop-choice/shared';

type ReviewRiskSummary = {
  level: 'low' | 'medium' | 'high';
  items: string[];
  title: string;
};

function bestCandidateRiskItems(review: TMDBMatchReview): string[] {
  const bestCandidate = review.candidates[0];
  if (bestCandidate?.id === null || bestCandidate === undefined) {
    return ['No applyable TMDB candidate is available from captured metadata.'];
  }

  if (bestCandidate.confidence === null || bestCandidate.confidence === undefined) {
    return ['Best candidate confidence is unavailable.'];
  }

  return bestCandidate.confidence < 0.7
    ? ['Best candidate confidence is below the normal manual-apply threshold.']
    : [];
}

function candidateWarningItems(review: TMDBMatchReview): string[] {
  return review.candidates
    .map((candidate) => getCandidateWarning({ candidate, review }))
    .filter((warning): warning is string => Boolean(warning))
    .slice(0, 2);
}

function reviewRiskItems(review: TMDBMatchReview): string[] {
  const items: string[] = [];
  const confidenceGap = candidateConfidenceGap(review.candidates);

  if (review.reason === 'runtime_mismatch') {
    items.push('Runtime mismatch can indicate a wrong TMDB identity even when title/year match.');
  }
  if (review.currentMovie?.tmdb_id) {
    items.push(`Current catalog TMDB id is ${review.currentMovie.tmdb_id}; applying changes it.`);
  }
  items.push(...bestCandidateRiskItems(review));
  if (confidenceGap !== null && confidenceGap < 0.1) {
    items.push('Top candidates are close together; compare title, year, and runtime carefully.');
  }
  for (const warning of candidateWarningItems(review)) {
    if (!items.includes(warning)) items.push(warning);
  }

  return items;
}

export function getReviewRiskSummary(review: TMDBMatchReview): ReviewRiskSummary {
  const items = reviewRiskItems(review);

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

import { formatPercent } from '../shared';

import {
  canApplyCandidate,
  candidateConfidenceGap,
  getCandidateWarning,
  isCurrentCandidate,
} from './candidateReview';
import { buildReviewPageHref, type ReviewFilters } from './navigation';

import type {
  TMDBMatchReview,
  TMDBMatchReviewAction,
  TMDBReviewCandidate,
} from '@pop-choice/shared';

export interface ReviewPaginationViewModel {
  currentPage: number;
  nextHref: string | null;
  previousHref: string | null;
  summary: string;
  totalPages: number;
}

export interface CandidateSummaryViewModel {
  confidence: number | null;
  confidenceLabel: string;
  emptyText: string | null;
  headline: string | null;
  meta: string | null;
}

export interface CandidateCardViewModel {
  actionHref: string;
  applyCandidateId: string | null;
  className: string;
  confidence: number | null;
  facts: Array<{ label: string; value: string }>;
  flags: Array<{ className: string; label: string }>;
  title: string;
  warning: string | null;
}

export interface StatusActionViewModel {
  buttonClass: string;
  className: string;
  description: string;
  disabled: boolean;
  formAction: string;
  includeNextAction: boolean;
}

export function buildReviewPaginationViewModel({
  filters,
  page,
  pageSize,
  totalCount,
}: {
  filters: ReviewFilters;
  page: number;
  pageSize: number;
  totalCount: number;
}): ReviewPaginationViewModel {
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const currentPage = Math.max(page, 1);
  const isPastLastPage = currentPage > totalPages;
  const firstItem = totalCount === 0 || isPastLastPage ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = isPastLastPage ? 0 : Math.min(currentPage * pageSize, totalCount);

  return {
    currentPage,
    nextHref:
      currentPage < totalPages
        ? buildReviewPageHref({ filters, page: currentPage + 1, pageSize })
        : null,
    previousHref:
      currentPage > 1 ? buildReviewPageHref({ filters, page: currentPage - 1, pageSize }) : null,
    summary: getPaginationSummary({ currentPage, firstItem, isPastLastPage, lastItem, totalCount }),
    totalPages,
  };
}

export function buildCandidateSummaryViewModel(
  candidates: TMDBReviewCandidate[],
): CandidateSummaryViewModel {
  if (candidates.length === 0) {
    return {
      confidence: null,
      confidenceLabel: formatPercent(null),
      emptyText: 'No candidates captured',
      headline: null,
      meta: null,
    };
  }

  const [best] = candidates;
  const gap = candidateConfidenceGap(candidates);

  return {
    confidence: best?.confidence ?? null,
    confidenceLabel: formatPercent(best?.confidence ?? null),
    emptyText: null,
    headline: buildCandidateTitle(best),
    meta: `${candidates.length} candidate(s)${gap === null ? '' : `, gap ${formatPercent(gap)}`}`,
  };
}

export function buildCandidateCardViewModel({
  candidate,
  index,
  review,
}: {
  candidate: TMDBReviewCandidate;
  index: number;
  review: TMDBMatchReview;
}): CandidateCardViewModel {
  const isBest = index === 0;
  const isCurrent = isCurrentCandidate({ candidate, review });
  const warning = getCandidateWarning({ candidate, review });
  const canApply = canApplyCandidate({ candidate, review });

  return {
    actionHref: `/tmdb-reviews/${encodeURIComponent(review.id)}/actions`,
    applyCandidateId: canApply ? String(candidate.id) : null,
    className: ['candidate', isBest ? 'best' : '', isCurrent ? 'current' : '']
      .filter(Boolean)
      .join(' '),
    confidence: candidate.confidence,
    facts: [
      { label: 'TMDB', value: formatNullableValue(candidate.id) },
      { label: 'Original', value: candidate.originalTitle ?? '-' },
      { label: 'Year', value: formatNullableValue(candidate.releaseYear) },
      { label: 'Confidence', value: formatPercent(candidate.confidence) },
    ],
    flags: [
      isBest ? { className: 'pill good', label: 'Best candidate' } : null,
      isCurrent ? { className: 'pill repairable', label: 'Current TMDB' } : null,
      warning ? { className: 'pill warning', label: 'Needs check' } : null,
    ].filter((flag): flag is { className: string; label: string } => Boolean(flag)),
    title: candidate.title,
    warning,
  };
}

export function buildStatusActionViewModel({
  action,
  review,
}: {
  action: Exclude<TMDBMatchReviewAction, 'apply_candidate'>;
  review: Pick<TMDBMatchReview, 'id' | 'status'>;
}): StatusActionViewModel {
  const details = STATUS_ACTION_DETAILS[action];

  return {
    ...details,
    disabled:
      review.status === 'resolved' ||
      (action === 'reject' && review.status === 'ignored') ||
      (action === 'defer' && review.status === 'deferred') ||
      (action === 'reopen' && review.status === 'open'),
    formAction: `/tmdb-reviews/${encodeURIComponent(review.id)}/actions`,
    includeNextAction: action !== 'reopen',
  };
}

const STATUS_ACTION_DETAILS = {
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
} satisfies Record<
  Exclude<TMDBMatchReviewAction, 'apply_candidate'>,
  Pick<StatusActionViewModel, 'buttonClass' | 'className' | 'description'>
>;

function buildCandidateTitle(candidate: TMDBReviewCandidate | undefined): string {
  if (!candidate) return '';
  return candidate.releaseYear === null || candidate.releaseYear === undefined
    ? candidate.title
    : `${candidate.title} (${candidate.releaseYear})`;
}

function formatNullableValue(value: number | string | null | undefined): string {
  return value === null || value === undefined ? '-' : String(value);
}

function getPaginationSummary({
  currentPage,
  firstItem,
  isPastLastPage,
  lastItem,
  totalCount,
}: {
  currentPage: number;
  firstItem: number;
  isPastLastPage: boolean;
  lastItem: number;
  totalCount: number;
}): string {
  if (totalCount === 0) return 'No reviews';
  if (isPastLastPage) return `Page ${currentPage} is past ${totalCount} matching reviews`;
  return `Showing ${firstItem}-${lastItem} of ${totalCount} reviews`;
}

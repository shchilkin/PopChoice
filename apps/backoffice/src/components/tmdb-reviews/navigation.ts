import type {
  TMDBMatchReviewReason,
  TMDBMatchReviewSort,
  TMDBMatchReviewStatus,
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

export function buildReviewDetailHref(reviewId: string): string {
  return `/tmdb-reviews/${encodeURIComponent(reviewId)}`;
}

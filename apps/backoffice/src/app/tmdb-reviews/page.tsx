import { listTMDBMatchReviewPage } from '@pop-choice/shared';

import { BackofficeErrorPage, ReviewListPage } from '../../components/backoffice';
import {
  DEFAULT_REVIEW_PAGE_SIZE,
  ensureBackofficeReady,
  logBackofficeError,
  MAX_REVIEW_PAGE_SIZE,
  parsePositiveIntParam,
  parseTMDBReviewReason,
  parseTMDBReviewSort,
  parseTMDBReviewStatus,
} from '../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ReviewsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  try {
    await ensureBackofficeReady();
    const params = (await searchParams) ?? {};
    const filters = {
      status: parseTMDBReviewStatus(firstParam(params.status)),
      reason: parseTMDBReviewReason(firstParam(params.reason)),
      sort: parseTMDBReviewSort(firstParam(params.sort)),
    };
    const page = parsePositiveIntParam(firstParam(params.page), 1, { max: 10_000 });
    const pageSize = parsePositiveIntParam(firstParam(params.pageSize), DEFAULT_REVIEW_PAGE_SIZE, {
      max: MAX_REVIEW_PAGE_SIZE,
    });
    const reviewPage = await listTMDBMatchReviewPage({
      status: filters.status,
      reason: filters.reason,
      sort: filters.sort,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return (
      <ReviewListPage
        reviews={reviewPage.reviews}
        filters={filters}
        pagination={{
          page,
          pageSize,
          totalCount: reviewPage.totalCount,
        }}
      />
    );
  } catch (error) {
    logBackofficeError('Failed to render TMDB match review queue', error);
    return <BackofficeErrorPage error={error} />;
  }
}

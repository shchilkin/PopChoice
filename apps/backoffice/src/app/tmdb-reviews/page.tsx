import { listTMDBMatchReviews } from '@pop-choice/shared';

import { BackofficeErrorPage, ReviewListPage } from '../../components/backoffice';
import {
  ensureBackofficeReady,
  logBackofficeError,
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
    const reviews = await listTMDBMatchReviews({
      status: filters.status,
      reason: filters.reason,
      sort: filters.sort,
      limit: 200,
    });

    return <ReviewListPage reviews={reviews} filters={filters} />;
  } catch (error) {
    logBackofficeError('Failed to render TMDB match review queue', error);
    return <BackofficeErrorPage error={error} />;
  }
}

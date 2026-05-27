import { getTMDBMatchReview, listTMDBMatchReviewAudit } from '@pop-choice/shared';
import { notFound } from 'next/navigation';

import { BackofficeErrorPage, ReviewDetailPage } from '../../../components/backoffice';
import { ensureBackofficeReady, logBackofficeError } from '../../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ReviewDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewDetail({ params }: ReviewDetailPageProps) {
  const { id } = await params;
  let review: Awaited<ReturnType<typeof getTMDBMatchReview>>;

  try {
    await ensureBackofficeReady();
    review = await getTMDBMatchReview(id);
  } catch (error) {
    logBackofficeError('Failed to load TMDB match review detail', error);
    return <BackofficeErrorPage error={error} />;
  }

  if (!review) notFound();

  try {
    const audit = await listTMDBMatchReviewAudit(review.id);
    return <ReviewDetailPage review={review} audit={audit} />;
  } catch (error) {
    logBackofficeError('Failed to load TMDB match review audit', error);
    return <BackofficeErrorPage error={error} />;
  }
}

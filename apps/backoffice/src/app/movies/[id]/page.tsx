import { getCatalogMovieDetail } from '@pop-choice/shared';
import { notFound } from 'next/navigation';

import { BackofficeErrorPage, CatalogMovieDetailPage } from '../../../components/backoffice';
import { ensureBackofficeReady, logBackofficeError } from '../../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CatalogMovieDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function CatalogMovieDetailRoute({ params }: CatalogMovieDetailRouteProps) {
  const { id } = await params;
  let result: Awaited<ReturnType<typeof getCatalogMovieDetail>>;

  try {
    const config = await ensureBackofficeReady();
    result = await getCatalogMovieDetail({
      movieId: id,
      staleAfterDays: config.catalogHealthStaleDays,
    });
  } catch (error) {
    logBackofficeError('Failed to render catalog movie detail', error);
    return (
      <BackofficeErrorPage
        active="health"
        error={error}
        retryHref={`/movies/${encodeURIComponent(id)}`}
      />
    );
  }

  if (result.status === 'not_found') {
    notFound();
  }

  return <CatalogMovieDetailPage detail={result.detail} />;
}

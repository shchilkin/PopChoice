import { getCatalogMovieDetail } from '@pop-choice/shared';
import { notFound } from 'next/navigation';

import { BackofficeErrorPage, CatalogMovieDetailPage } from '../../../components/backoffice';
import { ensureBackofficeReady, logBackofficeError } from '../../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CatalogMovieDetailRouteProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParamValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function CatalogMovieDetailRoute({
  params,
  searchParams,
}: CatalogMovieDetailRouteProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const repairStatus = getParamValue(query.repair)?.trim() ?? null;
  const manualStatus = getParamValue(query.manual)?.trim() ?? null;
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

  return (
    <CatalogMovieDetailPage
      detail={result.detail}
      manualStatus={manualStatus}
      repairStatus={repairStatus}
    />
  );
}

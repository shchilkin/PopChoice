import { BackofficeErrorPage, CatalogSeedPage } from '../../components/backoffice';
import {
  ensureBackofficeReady,
  getCatalogSeedStatus,
  logBackofficeError,
} from '../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CatalogSeedPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }: CatalogSeedPageProps) {
  try {
    await ensureBackofficeReady();
    const params = (await searchParams) ?? {};

    return (
      <CatalogSeedPage actionStatus={firstParam(params.seed)} seedStatus={getCatalogSeedStatus()} />
    );
  } catch (error) {
    logBackofficeError('Failed to render catalog seed page', error);
    return <BackofficeErrorPage active="catalog-seed" error={error} retryHref="/catalog-seed" />;
  }
}

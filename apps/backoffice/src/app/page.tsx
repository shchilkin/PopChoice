import { BackofficeErrorPage, CatalogHealthPage } from '../components/backoffice';
import { ensureBackofficeReady, logBackofficeError } from '../lib/backoffice';
import { readCatalogHealthPageData } from '../lib/catalogHealthLiveServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParamValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  try {
    const config = await ensureBackofficeReady();
    const params = (await searchParams) ?? {};
    const repairStatus = getParamValue(params.repair)?.trim() ?? null;
    const { auditPage, issueMoviePage, liveData, report } = await readCatalogHealthPageData({
      config,
      searchParams: params,
    });

    return (
      <CatalogHealthPage
        report={report}
        auditPage={auditPage}
        initialLiveData={liveData}
        issueMoviePage={issueMoviePage}
        bullBoardUrl={config.bullBoardUrl}
        repairStatus={repairStatus}
      />
    );
  } catch (error) {
    logBackofficeError('Failed to render catalog health report', error);
    return <BackofficeErrorPage error={error} />;
  }
}

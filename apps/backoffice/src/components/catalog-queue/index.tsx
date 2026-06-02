import type { CatalogMaintenanceQueueJobPage } from '../../catalogMaintenanceQueue';
import { BackofficeLayout } from '../backoffice-layout';
import { CatalogMaintenanceQueueRealtime } from './realtime';

export function CatalogMaintenanceQueuePage({
  bullBoardUrl,
  jobPage,
}: {
  bullBoardUrl?: string;
  jobPage: CatalogMaintenanceQueueJobPage;
}) {
  return (
    <BackofficeLayout
      active="queue"
      title="Catalog Maintenance Queue"
      eyebrow="Worker operations"
      description="Queue state updates automatically while workers process catalog repairs."
      actions={
        bullBoardUrl ? (
          <a className="button" href={bullBoardUrl}>
            Open Bull Board
          </a>
        ) : null
      }
    >
      <CatalogMaintenanceQueueRealtime bullBoardUrl={bullBoardUrl} initialJobPage={jobPage} />
    </BackofficeLayout>
  );
}

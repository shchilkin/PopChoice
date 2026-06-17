import { BackofficeLayout } from '../backoffice-layout';
import { CatalogStat } from '../shared';

import type { CatalogSeedStatus } from '../../lib/backoffice';

function statusLabel(value: boolean): string {
  return value ? 'Configured' : 'Missing';
}

function statusState(value: boolean): 'healthy' | 'warning' {
  return value ? 'healthy' : 'warning';
}

function getFlashMessage(status: string | undefined): string | null {
  if (status === 'triggered') {
    return 'Movie seed queued. Watch the workers logs in Coolify.';
  }
  if (status === 'unavailable') {
    return 'REDIS_URL is not configured for this backoffice resource.';
  }
  if (status === 'failed') {
    return 'Movie seed failed to queue. Check backoffice logs before retrying.';
  }
  if (status === 'forbidden') return 'Request was rejected by same-origin protection.';
  return null;
}

export function CatalogSeedPage({
  actionStatus,
  seedStatus,
}: {
  actionStatus?: string;
  seedStatus: CatalogSeedStatus;
}) {
  const flashMessage = getFlashMessage(actionStatus);
  const canTrigger = seedStatus.queueConfigured;

  return (
    <BackofficeLayout
      active="catalog-seed"
      title="Catalog seed"
      eyebrow="One-shot catalog operation"
      description="Queue the curated movie seed job when an environment needs its base catalog populated."
    >
      {flashMessage ? (
        <div className={`queue-status ${actionStatus === 'triggered' ? '' : 'unavailable'}`}>
          <div className="queue-status-main">
            <div>
              <div className="queue-status-title">
                <span
                  className={`queue-dot ${actionStatus === 'triggered' ? 'neutral' : 'warning'}`}
                />
                <strong>{flashMessage}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="summary catalog-seed-summary">
        <CatalogStat
          label="Seed queue"
          value={statusLabel(seedStatus.queueConfigured)}
          meta={seedStatus.queueName}
          state={statusState(seedStatus.queueConfigured)}
        />
      </div>

      <section className="panel catalog-seed-panel">
        <div className="panel-header">
          <div>
            <h2>Run curated seed</h2>
            <div className="issue-hint">
              This queues a BullMQ job for the workers service. Backoffice does not run the seed
              process inline.
            </div>
          </div>
        </div>

        <form className="catalog-seed-form" action="/catalog-seed/actions" method="post">
          <input type="hidden" name="action" value="trigger_movie_seed" />
          <button className="button success" type="submit" disabled={!canTrigger}>
            Trigger movie seed
          </button>
          <p className="small-note">
            Use this after creating a fresh environment or when the catalog is unexpectedly empty.
            The seed job is idempotent, skips movies already present in the database, and dedupes
            concurrent clicks.
          </p>
        </form>

        {!canTrigger ? (
          <div className="next-action warning">
            <div className="next-action-title">Configuration required</div>
            <p>
              Add REDIS_URL to the backoffice environment so it can enqueue the movie-seed job for
              workers.
            </p>
          </div>
        ) : null}
      </section>
    </BackofficeLayout>
  );
}

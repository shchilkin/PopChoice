import { BackofficeLayout } from '../backoffice-layout';

import type { CatalogSeedStatus } from '../../lib/backoffice';

function statusLabel(value: boolean): string {
  return value ? 'Configured' : 'Missing';
}

function getFlashMessage(status: string | undefined): string | null {
  if (status === 'triggered') {
    return 'Catalog preparation queued. Check Bull Board for seed logs and repair batch progress.';
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
  const statusClassName = canTrigger ? 'healthy' : 'warning';

  return (
    <BackofficeLayout
      active="catalog-seed"
      title="Catalog seed"
      eyebrow="One-shot catalog operation"
      description="Queue the curated movie seed and follow-up catalog repair work when an environment needs its base movie set prepared."
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

      <section className={`catalog-seed-console ${statusClassName}`}>
        <div className="catalog-seed-state">
          <div className="catalog-seed-kicker">
            <span className={`queue-dot ${canTrigger ? '' : 'warning'}`} />
            Seed queue
          </div>
          <div className="catalog-seed-status-row">
            <h2>{statusLabel(seedStatus.queueConfigured)}</h2>
            <span className={`status ${statusClassName}`}>
              {canTrigger ? 'Ready' : 'Needs Redis'}
            </span>
          </div>
          <dl className="catalog-seed-facts">
            <div>
              <dt>Seed queue</dt>
              <dd>{seedStatus.queueName}</dd>
            </div>
            <div>
              <dt>Repair queue</dt>
              <dd>catalog-maintenance</dd>
            </div>
            <div>
              <dt>Seed job</dt>
              <dd>seed-movies</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>seed + catalog repair</dd>
            </div>
          </dl>
        </div>

        <div className="catalog-seed-action">
          <div>
            <h2>Prepare catalog</h2>
            <p>
              Queues the curated movie file, then asks catalog maintenance to backfill missing TMDB
              identities and posters. Existing movies are skipped, active runs are deduped, and each
              run stays visible in Bull Board.
            </p>
          </div>
          <form className="catalog-seed-form" action="/catalog-seed/actions" method="post">
            <input type="hidden" name="action" value="trigger_movie_seed" />
            <button
              className="button success catalog-seed-trigger"
              type="submit"
              disabled={!canTrigger}
            >
              Prepare catalog
            </button>
          </form>
        </div>

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

import { BackofficeLayout } from '../backoffice-layout';

import type { CatalogSeedStatus } from '../../lib/backoffice';

function statusLabel(value: boolean): string {
  return value ? 'Configured' : 'Missing';
}

function getFlashMessage(status: string | undefined): string | null {
  if (status === 'triggered') {
    return 'Movie seed queued. Check Bull Board for job logs and summary.';
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
              <dt>Queue</dt>
              <dd>{seedStatus.queueName}</dd>
            </div>
            <div>
              <dt>Worker job</dt>
              <dd>seed-movies</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>traceable runs</dd>
            </div>
          </dl>
        </div>

        <div className="catalog-seed-action">
          <div>
            <h2>Run curated seed</h2>
            <p>
              Queues the curated movie file for workers. Existing movies are skipped, so retrying is
              safe. Active runs are deduped; completed runs stay visible in Bull Board.
            </p>
          </div>
          <form className="catalog-seed-form" action="/catalog-seed/actions" method="post">
            <input type="hidden" name="action" value="trigger_movie_seed" />
            <button
              className="button success catalog-seed-trigger"
              type="submit"
              disabled={!canTrigger}
            >
              Trigger movie seed
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

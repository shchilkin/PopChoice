import type { CatalogMovieDetail } from '@pop-choice/shared';
import { Badge, Button, ButtonLink, type BadgeVariant } from '@pop-choice/ui';

import {
  normalizeRepairFlashStatus,
  repairableHealthFlags,
  repairFlashMessage,
  repairFlashTone,
} from './helpers';

function isQueuedRepairStatus(status: string | null): boolean {
  const normalized = normalizeRepairFlashStatus(status);
  return (
    normalized === 'queued' || normalized === 'deduped' || normalized === 'orchestration_queued'
  );
}

function repairPanelState({
  activeCount,
  repairableCount,
  repairQueued,
}: {
  activeCount: number;
  repairableCount: number;
  repairQueued: boolean;
}): { title: string; badgeVariant: BadgeVariant; badgeLabel: string } {
  if (repairQueued) {
    return { title: 'Repair queued', badgeVariant: 'accent', badgeLabel: 'Queued' };
  }

  if (repairableCount > 0) {
    return {
      title: 'Repair action',
      badgeVariant: 'accent',
      badgeLabel: `${repairableCount} repairable`,
    };
  }

  if (activeCount > 0) {
    return {
      title: 'Manual review needed',
      badgeVariant: 'warning',
      badgeLabel: `${activeCount} active`,
    };
  }

  return { title: 'No repair needed', badgeVariant: 'success', badgeLabel: 'Healthy' };
}

function QueuedRepairContent() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="m-0 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)]">
        The worker will refresh this row through the catalog maintenance queue. Verify the result
        there before applying manual fields.
      </p>
      <ButtonLink href="/queue" variant="quiet">
        Open queue
      </ButtonLink>
    </div>
  );
}

function RepairableForm({
  detail,
  repairableFlags,
}: {
  detail: CatalogMovieDetail;
  repairableFlags: ReturnType<typeof repairableHealthFlags>;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,640px)_minmax(260px,1fr)] xl:items-end">
      <form
        className="flex flex-wrap items-end gap-3"
        action="/catalog-health/actions"
        method="post"
      >
        <input type="hidden" name="action" value="enqueue_backfill" />
        <input type="hidden" name="movie_id" value={detail.movie.id} />
        <input
          type="hidden"
          name="return_to"
          value={`/movies/${encodeURIComponent(detail.movie.id)}`}
        />
        <input
          type="hidden"
          name="note"
          value={`Queued from movie detail for ${detail.movie.name}`}
        />
        <label className="min-w-[min(360px,100%)] text-xs font-extrabold text-[var(--muted)]">
          Issue to repair
          <select
            className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 font-extrabold text-[var(--text)]"
            name="issue_key"
            defaultValue={repairableFlags[0]?.key}
          >
            {repairableFlags.map((flag) => (
              <option key={flag.key} value={flag.key}>
                {flag.label}
              </option>
            ))}
          </select>
        </label>
        <Button className="min-h-11 px-4" type="submit" variant="primary">
          Queue repair
        </Button>
      </form>
      <p className="m-0 max-w-2xl text-sm font-bold leading-6 text-[var(--muted)] xl:pb-2">
        Start with the selected issue, then let the worker update TMDB-backed metadata before making
        manual corrections.
      </p>
    </div>
  );
}

function RepairPanelContent({
  detail,
  repairableFlags,
  repairQueued,
  activeCount,
}: {
  detail: CatalogMovieDetail;
  repairableFlags: ReturnType<typeof repairableHealthFlags>;
  repairQueued: boolean;
  activeCount: number;
}) {
  if (repairQueued) {
    return <QueuedRepairContent />;
  }

  if (repairableFlags.length > 0) {
    return <RepairableForm detail={detail} repairableFlags={repairableFlags} />;
  }

  if (activeCount > 0) {
    return (
      <p className="m-0 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)]">
        Active issues for this movie need operator review or duplicate-merge tooling before another
        repair job can help.
      </p>
    );
  }

  return (
    <p className="m-0 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)]">
      No active catalog-health flags need repair for this movie.
    </p>
  );
}

export function MovieRepairPanel({
  detail,
  repairStatus,
}: {
  detail: CatalogMovieDetail;
  repairStatus: string | null;
}) {
  const repairableFlags = repairableHealthFlags(detail.healthFlags);
  const activeFlags = detail.healthFlags.filter((flag) => flag.isActive);
  const flash = repairFlashMessage(repairStatus);
  const flashTone = repairFlashTone(repairStatus);
  const repairQueued = isQueuedRepairStatus(repairStatus);
  const { title, badgeLabel, badgeVariant } = repairPanelState({
    activeCount: activeFlags.length,
    repairableCount: repairableFlags.length,
    repairQueued,
  });

  return (
    <section className="grid gap-4 border-y border-[var(--border)] py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-medium text-[var(--text)]">{title}</h2>
          <div className="text-sm font-bold text-[var(--muted)]">
            Use one paced catalog-maintenance job per movie.
          </div>
        </div>
        <Badge variant={badgeVariant}>{badgeLabel}</Badge>
      </div>
      {flash ? <p className={`repair-message ${flashTone}`}>{flash}</p> : null}
      <RepairPanelContent
        detail={detail}
        repairableFlags={repairableFlags}
        repairQueued={repairQueued}
        activeCount={activeFlags.length}
      />
    </section>
  );
}

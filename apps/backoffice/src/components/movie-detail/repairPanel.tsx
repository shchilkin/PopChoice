import { Badge, Button, ButtonLink } from '@pop-choice/ui';

import {
  normalizeRepairFlashStatus,
  repairableHealthFlags,
  repairFlashMessage,
  repairFlashTone,
} from './helpers';

import type { CatalogMovieDetail } from '@pop-choice/shared';

function isQueuedRepairStatus(status: string | null): boolean {
  const normalized = normalizeRepairFlashStatus(status);
  return (
    normalized === 'queued' || normalized === 'deduped' || normalized === 'orchestration_queued'
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
  const hasRepairableFlags = repairableFlags.length > 0;
  const title = repairQueued
    ? 'Repair queued'
    : hasRepairableFlags
      ? 'Repair action'
      : activeFlags.length > 0
        ? 'Manual review needed'
        : 'No repair needed';
  const badgeVariant = repairQueued
    ? 'accent'
    : hasRepairableFlags
      ? 'accent'
      : activeFlags.length > 0
        ? 'warning'
        : 'success';
  const badgeLabel = repairQueued
    ? 'Queued'
    : hasRepairableFlags
      ? `${repairableFlags.length} repairable`
      : activeFlags.length > 0
        ? `${activeFlags.length} active`
        : 'Healthy';

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
      {repairQueued ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="m-0 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)]">
            The worker will refresh this row through the catalog maintenance queue. Verify the
            result there before applying manual fields.
          </p>
          <ButtonLink href="/queue" variant="quiet">
            Open queue
          </ButtonLink>
        </div>
      ) : hasRepairableFlags ? (
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
            Start with the selected issue, then let the worker update TMDB-backed metadata before
            making manual corrections.
          </p>
        </div>
      ) : activeFlags.length > 0 ? (
        <p className="m-0 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)]">
          Active issues for this movie need operator review or duplicate-merge tooling before
          another repair job can help.
        </p>
      ) : (
        <p className="m-0 max-w-3xl text-sm font-bold leading-6 text-[var(--muted)]">
          No active catalog-health flags need repair for this movie.
        </p>
      )}
    </section>
  );
}

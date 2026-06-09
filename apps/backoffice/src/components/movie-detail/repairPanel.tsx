import type { CatalogMovieDetail } from '@pop-choice/shared';
import { Badge, Button } from '@pop-choice/ui';

import { repairableHealthFlags, repairFlashMessage, repairFlashTone } from './helpers';

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

  return (
    <section className="panel movie-repair-panel">
      <div className="panel-header">
        <div>
          <h2>Focused repair</h2>
          <div className="issue-hint">
            Queue one catalog-maintenance job for this movie through the existing paced worker path.
          </div>
        </div>
        <Badge variant={repairableFlags.length > 0 ? 'accent' : 'muted'}>
          {repairableFlags.length > 0 ? `${repairableFlags.length} repairable` : 'No action'}
        </Badge>
      </div>
      {flash ? <p className={`repair-message ${flashTone}`}>{flash}</p> : null}
      {repairableFlags.length > 0 ? (
        <form className="movie-repair-form" action="/catalog-health/actions" method="post">
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
          <label>
            Repair reason
            <select name="issue_key" defaultValue={repairableFlags[0]?.key}>
              {repairableFlags.map((flag) => (
                <option key={flag.key} value={flag.key}>
                  {flag.label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="primary">
            Queue focused repair
          </Button>
        </form>
      ) : activeFlags.length > 0 ? (
        <p className="empty">
          Active issues for this movie need manual review or duplicate-merge tooling.
        </p>
      ) : (
        <p className="empty">No active catalog-health flags need repair for this movie.</p>
      )}
    </section>
  );
}

import type { CatalogMovieDetail } from '@pop-choice/shared';
import { Button, ButtonLink } from '@pop-choice/ui';

function manualStatusMessage(status: string | null): string | null {
  if (status === 'updated') return 'Manual metadata fields were applied.';
  if (status === 'failed') return 'Manual metadata update failed. Check logs before retrying.';
  if (status === 'forbidden') return 'Manual metadata update was rejected by request protection.';
  return null;
}

function manualStatusTone(status: string | null): string {
  if (status === 'updated') return 'good';
  return 'warn';
}

function currentValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'empty';
  return String(value);
}

export function ManualMovieMetadataPanel({
  detail,
  manualStatus,
}: {
  detail: CatalogMovieDetail;
  manualStatus: string | null;
}) {
  const { movie } = detail;
  const flash = manualStatusMessage(manualStatus);
  const searchQuery = encodeURIComponent(`${movie.name} ${movie.year}`);

  return (
    <section className="panel manual-metadata-panel">
      <div className="panel-header">
        <div>
          <h2>Manual metadata override</h2>
          <div className="issue-hint">
            Add only fields you have verified. Blank inputs leave the current movie row unchanged.
          </div>
        </div>
        <ButtonLink
          href={`https://www.themoviedb.org/search?query=${searchQuery}`}
          rel="noreferrer"
          target="_blank"
          variant="quiet"
        >
          Search TMDB
        </ButtonLink>
      </div>
      {flash ? <p className={`repair-message ${manualStatusTone(manualStatus)}`}>{flash}</p> : null}
      <form
        action={`/movies/${encodeURIComponent(movie.id)}/actions`}
        className="manual-metadata-form"
        method="post"
      >
        <input type="hidden" name="return_to" value={`/movies/${encodeURIComponent(movie.id)}`} />
        <input
          type="hidden"
          name="note"
          value={`Manual metadata override for ${movie.name} (${movie.year})`}
        />
        <label>
          TMDB id
          <span>Current: {currentValue(movie.tmdbId)}</span>
          <input inputMode="numeric" name="tmdb_id" placeholder="e.g. 475557" />
        </label>
        <label>
          Localized name
          <span>Current: {currentValue(movie.localizedName)}</span>
          <input name="localized_name" placeholder="Localized display title" />
        </label>
        <label>
          Poster URL
          <span>Current: {currentValue(movie.posterUrl)}</span>
          <input name="poster_url" placeholder="https://image.tmdb.org/t/p/w500/..." />
        </label>
        <label>
          Runtime
          <span>Current: {currentValue(movie.duration)}</span>
          <input inputMode="numeric" name="runtime" placeholder="Minutes" />
        </label>
        <label>
          Age rating
          <span>Current: {currentValue(movie.ageRating)}</span>
          <input name="age_rating" placeholder="PG-13" />
        </label>
        <Button type="submit" variant="primary">
          Apply manual fields
        </Button>
      </form>
    </section>
  );
}

'use client';

import type { CatalogMovieDetail } from '@pop-choice/shared';
import {
  Button,
  ButtonLink,
  buttonVariants,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@pop-choice/ui';

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
    <section className="border-t border-[rgba(139,151,170,0.22)] pt-4">
      <Dialog defaultOpen={manualStatus !== null}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <h3 className="text-base font-medium leading-tight text-[var(--text)]">
              Manual correction
            </h3>
            <p className="m-0 text-sm font-bold leading-5 text-[var(--muted)]">
              Edit verified metadata only when the automated repair path needs help.
            </p>
          </div>
          <DialogTrigger className={buttonVariants({ size: 'sm', variant: 'ghost' })} type="button">
            Edit fields
          </DialogTrigger>
        </div>
        {flash ? (
          <p className={`repair-message ${manualStatusTone(manualStatus)} mt-3`}>{flash}</p>
        ) : null}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit verified metadata</DialogTitle>
            <DialogDescription>
              Save only fields you have checked against a trusted source. Blank fields are ignored.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="m-0 max-w-2xl text-sm font-bold leading-5 text-[var(--muted)]">
              These values save directly to the movie row and are recorded in the repair audit.
            </p>
            <ButtonLink
              href={`https://www.themoviedb.org/search?query=${searchQuery}`}
              rel="noreferrer"
              target="_blank"
              variant="quiet"
            >
              Search TMDB
            </ButtonLink>
          </div>
          {flash ? (
            <p className={`repair-message ${manualStatusTone(manualStatus)}`}>{flash}</p>
          ) : null}
          <form
            action={`/movies/${encodeURIComponent(movie.id)}/actions`}
            className="grid gap-4"
            method="post"
          >
            <input
              type="hidden"
              name="return_to"
              value={`/movies/${encodeURIComponent(movie.id)}`}
            />
            <div className="flex flex-wrap gap-3">
              <label className="grid min-w-56 flex-1 gap-1 text-xs font-extrabold text-[var(--muted)]">
                TMDB id
                <span className="truncate text-[11px] font-bold text-[var(--muted-2)]">
                  Current: {currentValue(movie.tmdbId)}
                </span>
                <input
                  className="w-full min-w-0"
                  defaultValue={movie.tmdbId ?? ''}
                  inputMode="numeric"
                  name="tmdb_id"
                  placeholder="TMDB id"
                />
              </label>
              <label className="grid min-w-56 flex-1 gap-1 text-xs font-extrabold text-[var(--muted)]">
                Localized name
                <span className="truncate text-[11px] font-bold text-[var(--muted-2)]">
                  Current: {currentValue(movie.localizedName)}
                </span>
                <input
                  className="w-full min-w-0"
                  defaultValue={movie.localizedName ?? ''}
                  name="localized_name"
                  placeholder="Localized title"
                />
              </label>
              <label className="grid min-w-56 flex-1 gap-1 text-xs font-extrabold text-[var(--muted)]">
                Poster URL
                <span className="truncate text-[11px] font-bold text-[var(--muted-2)]">
                  Current: {currentValue(movie.posterUrl)}
                </span>
                <input
                  className="w-full min-w-0"
                  defaultValue={movie.posterUrl ?? ''}
                  name="poster_url"
                  placeholder="Poster URL or TMDB image path"
                />
              </label>
              <label className="grid min-w-56 flex-1 gap-1 text-xs font-extrabold text-[var(--muted)]">
                Runtime
                <span className="truncate text-[11px] font-bold text-[var(--muted-2)]">
                  Current: {currentValue(movie.duration)}
                </span>
                <input
                  className="w-full min-w-0"
                  defaultValue={movie.duration ?? ''}
                  inputMode="numeric"
                  name="runtime"
                  placeholder="Minutes"
                />
              </label>
              <label className="grid min-w-56 flex-1 gap-1 text-xs font-extrabold text-[var(--muted)]">
                Age rating
                <span className="truncate text-[11px] font-bold text-[var(--muted-2)]">
                  Current: {currentValue(movie.ageRating)}
                </span>
                <input
                  className="w-full min-w-0"
                  defaultValue={movie.ageRating ?? ''}
                  name="age_rating"
                  placeholder="Age rating"
                />
              </label>
            </div>
            <label className="grid gap-1 text-xs font-extrabold text-[var(--muted)]">
              Operator note
              <span className="truncate text-[11px] font-bold text-[var(--muted-2)]">
                Stored in the repair audit
              </span>
              <input
                className="w-full min-w-0"
                name="note"
                placeholder={`Verified source for ${movie.name} (${movie.year})`}
              />
            </label>
            <DialogFooter className="justify-start">
              <Button type="submit" variant="primary">
                Save fields
              </Button>
              <span className="text-xs font-bold text-[var(--muted-2)]">
                Blank fields are left unchanged.
              </span>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

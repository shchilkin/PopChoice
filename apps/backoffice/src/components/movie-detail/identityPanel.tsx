import type { CatalogMovieDetail } from '@pop-choice/shared';
import { Badge } from '@pop-choice/ui';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { formatDuration, formatPercent, moviePosterSrc } from '../shared';
import { ManualMovieMetadataPanel } from './manualFieldsPanel';

function MoviePoster({ posterUrl, title }: { posterUrl: string | null; title: string }) {
  const src = moviePosterSrc(posterUrl);

  if (!src) {
    return (
      <div
        className="grid aspect-[2/3] min-h-[320px] w-full place-items-center rounded-lg border border-[var(--border)] bg-[#101318] text-sm font-black uppercase tracking-normal text-[var(--muted)] sm:min-h-[420px] lg:min-h-0"
        aria-label="No poster stored"
      >
        No poster
      </div>
    );
  }

  return (
    <img
      className="block aspect-[2/3] w-full rounded-lg border border-[var(--border)] bg-[#101318] object-cover"
      src={src}
      alt={`${title} poster`}
      loading="lazy"
    />
  );
}

function TMDBMovieLink({ tmdbId }: { tmdbId: number | null }) {
  if (tmdbId === null) return <span className="data-pill neutral">-</span>;

  return (
    <a href={`https://www.themoviedb.org/movie/${tmdbId}`} rel="noreferrer" target="_blank">
      {tmdbId}
    </a>
  );
}

export function MovieIdentityPanel({
  detail,
  manualStatus,
}: {
  detail: CatalogMovieDetail;
  manualStatus: string | null;
}) {
  const { movie } = detail;
  const activeFlags = detail.healthFlags.filter((flag) => flag.isActive);
  const metricClassName =
    'min-w-[170px] flex-1 border-t border-[rgba(139,151,170,0.22)] pt-3 text-sm font-extrabold text-[var(--text)]';

  return (
    <section className="flex flex-col gap-8 border-b border-[var(--border)] pb-8 lg:flex-row lg:items-start">
      <div className="w-full max-w-[300px] shrink-0">
        <MoviePoster posterUrl={movie.posterUrl} title={movie.name} />
      </div>
      <div className="grid min-w-0 flex-1 content-start gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-[var(--subtle)]">Movie #{movie.id}</span>
          <Badge variant={activeFlags.length > 0 ? 'warning' : 'success'}>
            {activeFlags.length > 0 ? `${activeFlags.length} active issue(s)` : 'Healthy'}
          </Badge>
        </div>
        <h2 className="sr-only">{movie.name}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-extrabold text-[var(--muted)]">
          {movie.localizedName ? <span>{movie.localizedName}</span> : null}
          <span>{movie.year}</span>
          <span>{formatDuration(movie.duration)}</span>
          <span>{movie.ageRating || '-'}</span>
        </div>
        <p className="m-0 max-w-3xl text-base leading-7 text-[var(--muted)]">
          {movie.description || 'No local description stored.'}
        </p>
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-4">
          <div className={metricClassName}>
            <dt className="mb-1 text-xs font-extrabold text-[var(--muted)]">TMDB</dt>
            <dd>
              <TMDBMovieLink tmdbId={movie.tmdbId} />
            </dd>
          </div>
          <div className={metricClassName}>
            <dt className="mb-1 text-xs font-extrabold text-[var(--muted)]">Match confidence</dt>
            <dd>{formatPercent(movie.tmdbMatchConfidence)}</dd>
          </div>
          <div className={metricClassName}>
            <dt className="mb-1 text-xs font-extrabold text-[var(--muted)]">Match source</dt>
            <dd>{movie.tmdbMatchSource ?? '-'}</dd>
          </div>
          <div className={metricClassName}>
            <dt className="mb-1 text-xs font-extrabold text-[var(--muted)]">Matched at</dt>
            <dd>{formatBackofficeDateTime(movie.tmdbMatchedAt)}</dd>
          </div>
          <div className={metricClassName}>
            <dt className="mb-1 text-xs font-extrabold text-[var(--muted)]">Metadata refreshed</dt>
            <dd>{formatBackofficeDateTime(movie.tmdbMetadataRefreshedAt)}</dd>
          </div>
        </dl>
        <ManualMovieMetadataPanel detail={detail} manualStatus={manualStatus} />
      </div>
    </section>
  );
}

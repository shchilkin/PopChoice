import type { CatalogMovieDetail } from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { formatDuration, formatPercent, moviePosterSrc } from '../shared';

function MoviePoster({ posterUrl, title }: { posterUrl: string | null; title: string }) {
  const src = moviePosterSrc(posterUrl);

  if (!src) {
    return (
      <div className="movie-poster-placeholder" aria-label="No poster stored">
        No poster
      </div>
    );
  }

  return <img className="movie-poster" src={src} alt={`${title} poster`} loading="lazy" />;
}

function TMDBMovieLink({ tmdbId }: { tmdbId: number | null }) {
  if (tmdbId === null) return <span className="data-pill neutral">-</span>;

  return (
    <a href={`https://www.themoviedb.org/movie/${tmdbId}`} rel="noreferrer" target="_blank">
      {tmdbId}
    </a>
  );
}

export function MovieIdentityPanel({ detail }: { detail: CatalogMovieDetail }) {
  const { movie } = detail;
  const activeFlags = detail.healthFlags.filter((flag) => flag.isActive);

  return (
    <section className="movie-identity panel">
      <MoviePoster posterUrl={movie.posterUrl} title={movie.name} />
      <div className="movie-identity-copy">
        <div className="movie-title-line">
          <span className="small-note">Movie #{movie.id}</span>
          <span className={activeFlags.length > 0 ? 'pill warning' : 'pill healthy'}>
            {activeFlags.length > 0 ? `${activeFlags.length} active issue(s)` : 'Healthy'}
          </span>
        </div>
        <h2>{movie.name}</h2>
        <div className="movie-subtitle">
          {movie.localizedName ? <span>{movie.localizedName}</span> : null}
          <span>{movie.year}</span>
          <span>{formatDuration(movie.duration)}</span>
          <span>{movie.ageRating || '-'}</span>
        </div>
        <p>{movie.description || 'No local description stored.'}</p>
        <dl className="identity-metrics">
          <div>
            <dt>TMDB</dt>
            <dd>
              <TMDBMovieLink tmdbId={movie.tmdbId} />
            </dd>
          </div>
          <div>
            <dt>Match confidence</dt>
            <dd>{formatPercent(movie.tmdbMatchConfidence)}</dd>
          </div>
          <div>
            <dt>Match source</dt>
            <dd>{movie.tmdbMatchSource ?? '-'}</dd>
          </div>
          <div>
            <dt>Matched at</dt>
            <dd>{formatBackofficeDateTime(movie.tmdbMatchedAt)}</dd>
          </div>
          <div>
            <dt>Metadata refreshed</dt>
            <dd>{formatBackofficeDateTime(movie.tmdbMetadataRefreshedAt)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

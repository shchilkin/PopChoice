import type {
  CatalogMovieDetail,
  CatalogMovieDetailPersonCredit,
  CatalogMovieDetailTaxonomyItem,
  CatalogMovieDetailTMDBReview,
} from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { ReasonBadge, StatusBadge } from '../tmdb-reviews/reviewPresentation';
import {
  CountPill,
  formatDuration,
  formatPercent,
  formatTMDBMetadataValue,
  moviePosterSrc,
} from '../shared';
import {
  duplicatePeerCount,
  repairableHealthFlags,
  repairFlashMessage,
  repairFlashTone,
  splitHealthFlags,
} from './helpers';

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

export function HealthFlagsPanel({ detail }: { detail: CatalogMovieDetail }) {
  const { activeFlags, resolvedFlags } = splitHealthFlags(detail.healthFlags);

  return (
    <article className={`panel ${activeFlags.length > 0 ? 'needs-work' : 'healthy'}`}>
      <div className="panel-header">
        <div>
          <h2>Health flags</h2>
          <div className="issue-hint">
            Same predicates as Catalog Health, scoped to this movie row.
          </div>
        </div>
        <CountPill
          count={activeFlags.length}
          state={activeFlags.length > 0 ? 'warning' : 'healthy'}
        />
      </div>
      <div className="flag-list">
        {activeFlags.length === 0 ? (
          <span className="pill healthy">No active flags</span>
        ) : (
          activeFlags.map((flag) => (
            <span key={flag.key} className="pill warning">
              {flag.label}
            </span>
          ))
        )}
      </div>
      <details className="compact-details">
        <summary>Resolved checks ({resolvedFlags.length})</summary>
        <div className="flag-list">
          {resolvedFlags.map((flag) => (
            <span key={flag.key} className="pill">
              {flag.label}
            </span>
          ))}
        </div>
      </details>
    </article>
  );
}

export function TaxonomyList({
  emptyLabel,
  items,
}: {
  emptyLabel: string;
  items: CatalogMovieDetailTaxonomyItem[];
}) {
  if (items.length === 0) return <p className="empty">{emptyLabel}</p>;

  return (
    <div className="tag-list">
      {items.map((item) => (
        <span key={`${item.id}-${item.name}`} className="data-pill neutral">
          {item.name}
        </span>
      ))}
    </div>
  );
}

export function PeopleTable({
  emptyLabel,
  people,
}: {
  emptyLabel: string;
  people: CatalogMovieDetailPersonCredit[];
}) {
  if (people.length === 0) return <p className="empty">{emptyLabel}</p>;

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>TMDB</th>
            <th>Order</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id}>
              <td>
                <strong>{person.name}</strong>
                {person.characterName ? <div className="muted">{person.characterName}</div> : null}
              </td>
              <td>{person.job ?? person.role}</td>
              <td>{person.tmdbId ?? '-'}</td>
              <td>{person.billingOrder ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PeerList({
  peers,
}: {
  peers: { id: string; name: string; year: number; tmdbId: number | null }[];
}) {
  if (peers.length === 0) return <p className="empty compact">No peers found.</p>;

  return (
    <ul className="peer-list">
      {peers.map((peer) => (
        <li key={peer.id}>
          <a href={`/movies/${encodeURIComponent(peer.id)}`}>#{peer.id}</a>
          <span>{peer.name}</span>
          <span className="muted">
            {peer.year}
            {peer.tmdbId === null ? '' : ` · TMDB ${peer.tmdbId}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DuplicatePeersPanel({ detail }: { detail: CatalogMovieDetail }) {
  const { duplicateContext } = detail;
  const total = duplicatePeerCount(duplicateContext);

  return (
    <article className={`panel ${total > 0 ? 'needs-work' : 'healthy'}`}>
      <div className="panel-header">
        <div>
          <h2>Duplicate context</h2>
          <div className="issue-hint">
            Peer rows with matching TMDB id or normalized title/year.
          </div>
        </div>
        <CountPill count={total} state={total > 0 ? 'warning' : 'healthy'} />
      </div>
      <div className="duplicate-context">
        <div>
          <h3>Same TMDB id</h3>
          <PeerList peers={duplicateContext.tmdbIdPeers} />
        </div>
        <div>
          <h3>Same normalized title/year</h3>
          <PeerList peers={duplicateContext.normalizedTitleYearPeers} />
        </div>
      </div>
    </article>
  );
}

export function RelatedReviewsPanel({ reviews }: { reviews: CatalogMovieDetailTMDBReview[] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Related TMDB reviews</h2>
          <div className="issue-hint">
            Open or historical identity review rows tied to this movie.
          </div>
        </div>
        <span className="count">{reviews.length}</span>
      </div>
      {reviews.length === 0 ? (
        <p className="empty">No TMDB review rows are attached to this movie.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Review</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Candidates</th>
                <th>Updated</th>
                <th>Audit</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td>
                    <a href={`/tmdb-reviews/${encodeURIComponent(review.id)}`}>#{review.id}</a>
                  </td>
                  <td>
                    <ReasonBadge reason={review.reason} />
                  </td>
                  <td>
                    <StatusBadge status={review.status} />
                  </td>
                  <td>{review.candidates.length}</td>
                  <td>{formatBackofficeDateTime(review.updatedAt)}</td>
                  <td>{review.audit.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function LocalFactsPanel({ detail }: { detail: CatalogMovieDetail }) {
  const { movie } = detail;

  return (
    <article className="panel">
      <div className="panel-header">
        <h2>Local facts</h2>
      </div>
      <dl className="facts">
        <div>
          <dt>Local id</dt>
          <dd>{movie.id}</dd>
        </div>
        <div>
          <dt>Name</dt>
          <dd>{movie.name}</dd>
        </div>
        <div>
          <dt>Localized</dt>
          <dd>{movie.localizedName ?? '-'}</dd>
        </div>
        <div>
          <dt>Year</dt>
          <dd>{movie.year}</dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd>{formatDuration(movie.duration)}</dd>
        </div>
        <div>
          <dt>Age rating</dt>
          <dd>{movie.ageRating || '-'}</dd>
        </div>
        <div>
          <dt>Score</dt>
          <dd>{movie.scoreRating}</dd>
        </div>
        <div>
          <dt>Poster</dt>
          <dd>{movie.posterUrl ?? '-'}</dd>
        </div>
      </dl>
    </article>
  );
}

export function MetadataOverviewPanel({ detail }: { detail: CatalogMovieDetail }) {
  const { movie } = detail;
  const metadata = movie.tmdbMetadata;

  return (
    <article className="panel">
      <div className="panel-header">
        <h2>TMDB metadata overview</h2>
      </div>
      <dl className="facts">
        <div>
          <dt>Original title</dt>
          <dd>{formatTMDBMetadataValue(metadata.original_title)}</dd>
        </div>
        <div>
          <dt>Release date</dt>
          <dd>{formatTMDBMetadataValue(metadata.release_date)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{formatTMDBMetadataValue(metadata.status)}</dd>
        </div>
        <div>
          <dt>Vote average</dt>
          <dd>{formatTMDBMetadataValue(metadata.vote_average)}</dd>
        </div>
        <div>
          <dt>Popularity</dt>
          <dd>{formatTMDBMetadataValue(metadata.popularity)}</dd>
        </div>
        <div>
          <dt>Tagline</dt>
          <dd>{formatTMDBMetadataValue(metadata.tagline)}</dd>
        </div>
      </dl>
    </article>
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

  return (
    <section className="panel movie-repair-panel">
      <div className="panel-header">
        <div>
          <h2>Focused repair</h2>
          <div className="issue-hint">
            Queue one catalog-maintenance job for this movie through the existing paced worker path.
          </div>
        </div>
        <span className={repairableFlags.length > 0 ? 'pill repairable' : 'pill'}>
          {repairableFlags.length > 0 ? `${repairableFlags.length} repairable` : 'No action'}
        </span>
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
          <button className="button primary" type="submit">
            Queue focused repair
          </button>
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

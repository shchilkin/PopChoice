import type { CatalogMovieDetail, CatalogMovieDetailTMDBReview } from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { formatDuration, formatTMDBMetadataValue } from '../shared';
import { ReasonBadge, StatusBadge } from '../tmdb-reviews/reviewPresentation';

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

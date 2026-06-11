import type { CatalogMovieDetail, CatalogMovieDetailTMDBReview } from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import {
  DataTable,
  EmptyState,
  PanelHeader,
  formatDuration,
  formatTMDBMetadataValue,
} from '../shared';
import { ReasonBadge, StatusBadge } from '../tmdb-reviews/reviewPresentation';

export function RelatedReviewsPanel({ reviews }: { reviews: CatalogMovieDetailTMDBReview[] }) {
  return (
    <section className="panel">
      <PanelHeader
        title="Related TMDB reviews"
        hint="Open or historical identity review rows tied to this movie."
        count={reviews.length}
      />
      {reviews.length === 0 ? (
        <EmptyState>No TMDB review rows are attached to this movie.</EmptyState>
      ) : (
        <DataTable columns={['Review', 'Reason', 'Status', 'Candidates', 'Updated', 'Audit']}>
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
        </DataTable>
      )}
    </section>
  );
}

export function LocalFactsPanel({ detail }: { detail: CatalogMovieDetail }) {
  const { movie } = detail;
  const factClassName =
    'grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-[rgba(139,151,170,0.16)] py-2 last:border-b-0';

  return (
    <article className="grid gap-3 border-t border-[var(--border)] pt-5">
      <h2 className="text-base font-medium text-[var(--text)]">Local facts</h2>
      <dl className="grid gap-0">
        <div className={factClassName}>
          <dt>Local id</dt>
          <dd>{movie.id}</dd>
        </div>
        <div className={factClassName}>
          <dt>Name</dt>
          <dd>{movie.name}</dd>
        </div>
        <div className={factClassName}>
          <dt>Localized</dt>
          <dd>{movie.localizedName ?? '-'}</dd>
        </div>
        <div className={factClassName}>
          <dt>Year</dt>
          <dd>{movie.year}</dd>
        </div>
        <div className={factClassName}>
          <dt>Runtime</dt>
          <dd>{formatDuration(movie.duration)}</dd>
        </div>
        <div className={factClassName}>
          <dt>Age rating</dt>
          <dd>{movie.ageRating || '-'}</dd>
        </div>
        <div className={factClassName}>
          <dt>Score</dt>
          <dd>{movie.scoreRating}</dd>
        </div>
        <div className={factClassName}>
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
      <PanelHeader title="TMDB metadata overview" />
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

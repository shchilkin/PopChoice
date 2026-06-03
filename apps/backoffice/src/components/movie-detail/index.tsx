import type { CatalogMovieDetail } from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { RepairAuditRows } from '../catalog-repair-audit';
import { EmptyState, PanelHeader, renderMetadataSnapshot } from '../shared';
import {
  DuplicatePeersPanel,
  HealthFlagsPanel,
  LocalFactsPanel,
  MetadataOverviewPanel,
  MovieIdentityPanel,
  MovieRepairPanel,
  PeopleTable,
  RelatedReviewsPanel,
  TaxonomyList,
} from './panels';

export function CatalogMovieDetailPage({
  detail,
  repairStatus,
}: {
  detail: CatalogMovieDetail;
  repairStatus: string | null;
}) {
  const { movie } = detail;

  return (
    <BackofficeLayout
      active="health"
      title={movie.name}
      eyebrow="Catalog movie"
      description={
        <div className="toolbar-summary">
          <span>Movie #{movie.id}</span>
          <span>{movie.year}</span>
          <span>Metadata {formatBackofficeDateTime(movie.tmdbMetadataRefreshedAt)}</span>
        </div>
      }
      actions={
        <>
          <a className="button" href="/">
            Back to health
          </a>
          {movie.tmdbId === null ? null : (
            <a
              className="button quiet"
              href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
              rel="noreferrer"
              target="_blank"
            >
              TMDB
            </a>
          )}
        </>
      }
    >
      <MovieIdentityPanel detail={detail} />
      <MovieRepairPanel detail={detail} repairStatus={repairStatus} />
      <section className="detail-grid">
        <LocalFactsPanel detail={detail} />
        <HealthFlagsPanel detail={detail} />
        <MetadataOverviewPanel detail={detail} />
        <DuplicatePeersPanel detail={detail} />
      </section>
      <section className="detail-grid">
        <article className="panel">
          <PanelHeader title="Genres" count={detail.genres.length} />
          <TaxonomyList emptyLabel="No genres stored." items={detail.genres} />
        </article>
        <article className="panel">
          <PanelHeader title="Keywords" count={detail.keywords.length} />
          <TaxonomyList emptyLabel="No keywords stored." items={detail.keywords} />
        </article>
      </section>
      <section className="detail-grid">
        <article className="panel">
          <PanelHeader title="Directors" count={detail.directors.length} />
          <PeopleTable emptyLabel="No directors stored." people={detail.directors} />
        </article>
        <article className="panel">
          <PanelHeader title="Top cast" count={detail.cast.length} />
          <PeopleTable emptyLabel="No cast credits stored." people={detail.cast} />
        </article>
      </section>
      <RelatedReviewsPanel reviews={detail.relatedReviews} />
      <section className="panel">
        <PanelHeader
          title="Repair audit"
          hint="Recent audited repair attempts for this movie."
          count={detail.repairAudit.length}
        />
        <RepairAuditRows audit={detail.repairAudit} />
      </section>
      <section className="panel">
        <PanelHeader title="TMDB metadata snapshot" />
        {renderMetadataSnapshot(movie.tmdbMetadata)}
      </section>
    </BackofficeLayout>
  );
}

export function CatalogMovieNotFoundPage() {
  return (
    <BackofficeLayout
      active="health"
      title="Movie Not Found"
      eyebrow="Catalog movie"
      description="No catalog movie exists for this id in the current backoffice database."
      actions={
        <a className="button" href="/">
          Back to health
        </a>
      }
    >
      <section className="panel">
        <EmptyState>
          The movie may belong to another environment or may not be seeded yet.
        </EmptyState>
      </section>
    </BackofficeLayout>
  );
}

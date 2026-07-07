import { ButtonLink } from '@pop-choice/ui';

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

import type { CatalogMovieDetail } from '@pop-choice/shared';

export function CatalogMovieDetailPage({
  detail,
  manualStatus,
  repairStatus,
}: {
  detail: CatalogMovieDetail;
  manualStatus: string | null;
  repairStatus: string | null;
}) {
  const { movie } = detail;

  return (
    <BackofficeLayout
      active="health"
      title={movie.name}
      eyebrow="Catalog movie"
      breadcrumbs={[
        { href: '/', label: 'Backoffice' },
        { href: '/catalog-health', label: 'Catalog health' },
        { label: movie.name },
      ]}
      description={
        <div className="toolbar-summary">
          <span>Movie #{movie.id}</span>
          <span>{movie.year}</span>
          <span>Metadata {formatBackofficeDateTime(movie.tmdbMetadataRefreshedAt)}</span>
        </div>
      }
      actions={
        <>
          <ButtonLink href="/catalog-health">Catalog health</ButtonLink>
          {movie.tmdbId === null ? null : (
            <ButtonLink
              href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
              rel="noreferrer"
              target="_blank"
              variant="quiet"
            >
              Open in TMDB
            </ButtonLink>
          )}
        </>
      }
    >
      <section className="grid gap-5" aria-label="Movie workspace">
        <MovieIdentityPanel detail={detail} manualStatus={manualStatus} />
        <MovieRepairPanel detail={detail} repairStatus={repairStatus} />
      </section>
      <section className="my-8 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] xl:items-start">
        <HealthFlagsPanel detail={detail} />
        <LocalFactsPanel detail={detail} />
      </section>
      <section className="detail-grid">
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
      breadcrumbs={[
        { href: '/', label: 'Backoffice' },
        { href: '/catalog-health', label: 'Catalog health' },
        { label: 'Movie not found' },
      ]}
      description="No catalog movie exists for this id in the current backoffice database."
      actions={<ButtonLink href="/catalog-health">Back to health</ButtonLink>}
    >
      <section className="panel">
        <EmptyState>
          The movie may belong to another environment or may not be seeded yet.
        </EmptyState>
      </section>
    </BackofficeLayout>
  );
}

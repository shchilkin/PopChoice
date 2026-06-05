'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { useLanguage } from '@/i18n';

import {
  AvailableMoviesError,
  AvailableMoviesHeader,
  MoviesFilterForm,
  MoviesPagination,
  MoviesResultPanel,
} from './availableMoviesComponents';
import {
  buildMoviesCacheKey,
  cloneEmptyMovieFilters,
  fetchMoviesOutcome,
  getMoviesPageSummary,
  normalizeMovieFilters,
  toggleAgeRatingFilter,
} from './availableMoviesViewModel';

import type { MovieFilters } from './availableMoviesViewModel';
import type { Movie, MoviesResponse } from '@/features/movies/catalog';

export default function AvailableMoviesPage() {
  const { t } = useLanguage();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [draftFilters, setDraftFilters] = useState<MovieFilters>(cloneEmptyMovieFilters);
  const [appliedFilters, setAppliedFilters] = useState<MovieFilters>(cloneEmptyMovieFilters);
  const pageSize = 50;

  // Client-side cache: page/filter key → response data. Avoids redundant fetches
  // when navigating back to a previously loaded page.
  const cache = useRef<Map<string, MoviesResponse>>(new Map());
  // AbortController for the in-flight fetch – cancelled when a newer page is requested.
  const abortRef = useRef<AbortController | null>(null);

  const fetchMovies = useCallback(
    async (page: number, filters: MovieFilters) => {
      const cacheKey = buildMoviesCacheKey(page, filters);
      // Serve from cache when available.
      const cached = cache.current.get(cacheKey);
      if (cached) {
        // Cancel any in-flight request before applying cached state.
        abortRef.current?.abort();
        abortRef.current = null;
        setError(null);
        setMovies(cached.movies);
        setTotalPages(cached.totalPages);
        setTotalCount(cached.totalCount);
        setCurrentPage(cached.page);
        setLoading(false);
        return;
      }

      // Cancel any in-flight request for a different page.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      const outcome = await fetchMoviesOutcome(page, pageSize, filters, controller.signal);
      if (controller.signal.aborted) return;

      if (outcome.ok) {
        const { data } = outcome;
        cache.current.set(cacheKey, data);
        setMovies(data.movies);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
        setCurrentPage(data.page);
      } else {
        setError(outcome.errorMessage);
      }
      setLoading(false);
    },
    [pageSize],
  );

  useEffect(() => {
    fetchMovies(currentPage, appliedFilters);
    // Abort any in-flight request when the effect re-runs (new page) or the
    // component unmounts, so stale responses can't call setState.
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [appliedFilters, fetchMovies, currentPage]);

  const applyFilters = (filters: MovieFilters) => {
    setAppliedFilters(normalizeMovieFilters(filters));
    setCurrentPage(1);
  };

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyFilters(draftFilters);
  };

  const handleClearFilters = () => {
    setDraftFilters(cloneEmptyMovieFilters());
    setAppliedFilters(cloneEmptyMovieFilters());
    setCurrentPage(1);
  };

  const handleAgeRatingToggle = (rating: string) => {
    const nextFilters = toggleAgeRatingFilter(draftFilters, rating);
    setDraftFilters(nextFilters);
    applyFilters(nextFilters);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (error) {
    return (
      <AvailableMoviesError
        error={error}
        labels={t.moviesPage}
        onRetry={() => fetchMovies(currentPage, appliedFilters)}
      />
    );
  }

  return (
    <section className="flex-1 flex flex-col px-4 md:px-8 py-10 max-w-5xl mx-auto w-full">
      <AvailableMoviesHeader
        labels={t.moviesPage}
        summary={getMoviesPageSummary({
          currentPage,
          loading,
          noMoviesFoundText: t.moviesPage.noMoviesFound,
          pageSize,
          showingText: t.moviesPage.showing,
          totalCount,
        })}
      />

      <MoviesFilterForm
        draftFilters={draftFilters}
        labels={t.moviesPage}
        onAgeRatingToggle={handleAgeRatingToggle}
        onClearFilters={handleClearFilters}
        onDraftFiltersChange={setDraftFilters}
        onFilterSubmit={handleFilterSubmit}
        onImmediateFilterChange={applyFilters}
      />

      <MoviesResultPanel
        appliedFilters={appliedFilters}
        loading={loading}
        movies={movies}
        onClearFilters={handleClearFilters}
      />

      <MoviesPagination
        currentPage={currentPage}
        labels={t.moviesPage}
        onPageChange={handlePageChange}
        totalPages={totalPages}
      />
    </section>
  );
}

'use client';

import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { MoviesTable, MoviesTableSkeleton } from '@/components';
import { useLanguage } from '@/i18n';
import { getCsrfToken } from '@/lib/csrfClient';

import type { Movie, MovieDurationFilter, MoviesResponse } from '@/features/movies/catalog';

interface MovieFilters {
  query: string;
  yearFrom: string;
  yearTo: string;
  duration: '' | MovieDurationFilter;
  minScore: string;
  ageRatings: string[];
}

const AGE_RATING_FILTERS = ['G', 'PG', 'PG-13', 'R', 'NR', '12+', '15', '16+', '18+'];

const emptyFilters: MovieFilters = {
  query: '',
  yearFrom: '',
  yearTo: '',
  duration: '',
  minScore: '',
  ageRatings: [],
};

function buildCacheKey(page: number, filters: MovieFilters): string {
  return JSON.stringify([
    page,
    filters.query.trim(),
    filters.yearFrom.trim(),
    filters.yearTo.trim(),
    filters.duration,
    filters.minScore.trim(),
    filters.ageRatings,
  ]);
}

function buildMoviesUrl(page: number, pageSize: number, filters: MovieFilters): string {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const query = filters.query.trim();
  const yearFrom = filters.yearFrom.trim();
  const yearTo = filters.yearTo.trim();
  const minScore = filters.minScore.trim();

  if (query) params.set('query', query);
  if (yearFrom) params.set('yearFrom', yearFrom);
  if (yearTo) params.set('yearTo', yearTo);
  if (filters.duration) params.set('duration', filters.duration);
  if (minScore) params.set('minScore', minScore);
  if (filters.ageRatings.length > 0) params.set('ageRatings', filters.ageRatings.join(','));

  return `/api/movies?${params.toString()}`;
}

function hasActiveMovieFilters(filters: MovieFilters): boolean {
  return Boolean(
    filters.query.trim() ||
    filters.yearFrom.trim() ||
    filters.yearTo.trim() ||
    filters.duration ||
    filters.minScore.trim() ||
    filters.ageRatings.length > 0,
  );
}

function normalizeMovieFilters(filters: MovieFilters): MovieFilters {
  return {
    query: filters.query.trim(),
    yearFrom: filters.yearFrom.trim(),
    yearTo: filters.yearTo.trim(),
    duration: filters.duration,
    minScore: filters.minScore.trim(),
    ageRatings: filters.ageRatings,
  };
}

export default function AvailableMoviesPage() {
  const { t } = useLanguage();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [draftFilters, setDraftFilters] = useState<MovieFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<MovieFilters>(emptyFilters);
  const pageSize = 50;

  // Client-side cache: page/filter key → response data. Avoids redundant fetches
  // when navigating back to a previously loaded page.
  const cache = useRef<Map<string, MoviesResponse>>(new Map());
  // AbortController for the in-flight fetch – cancelled when a newer page is requested.
  const abortRef = useRef<AbortController | null>(null);

  const fetchMovies = useCallback(
    async (page: number, filters: MovieFilters) => {
      const cacheKey = buildCacheKey(page, filters);
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

      try {
        const response = await fetch(buildMoviesUrl(page, pageSize, filters), {
          signal: controller.signal,
          headers: { 'X-CSRF-Token': getCsrfToken() },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch movies: ${response.statusText}`);
        }

        const data: MoviesResponse = await response.json();
        if (controller.signal.aborted) return;
        cache.current.set(cacheKey, data);
        setMovies(data.movies);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
        setCurrentPage(data.page);
      } catch (err) {
        // fetch() rejects with a DOMException (not always an Error subclass) on abort.
        // Guard on the signal instead of relying on instanceof Error.
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
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
    setDraftFilters({ ...emptyFilters });
    setAppliedFilters({ ...emptyFilters });
    setCurrentPage(1);
  };

  const handleAgeRatingToggle = (rating: string) => {
    const ageRatings = draftFilters.ageRatings.includes(rating)
      ? draftFilters.ageRatings.filter((value) => value !== rating)
      : [...draftFilters.ageRatings, rating];
    const nextFilters = { ...draftFilters, ageRatings };
    setDraftFilters(nextFilters);
    applyFilters(nextFilters);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const generatePageNumbers = () => {
    const delta = 2;
    const rangeWithDots: (number | '...')[] = [];

    if (totalPages <= 1) return rangeWithDots;

    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    rangeWithDots.push(1);

    if (start > 2) rangeWithDots.push('...');

    for (let i = start; i <= end; i++) {
      rangeWithDots.push(i);
    }

    if (end < totalPages - 1) rangeWithDots.push('...');

    if (totalPages > 1) rangeWithDots.push(totalPages);

    return rangeWithDots;
  };

  if (error) {
    return (
      <section className="flex-1 flex flex-col items-center justify-center px-5 py-16 text-center">
        <p className="text-sm mb-4" style={{ color: 'var(--rating-mature-text)' }}>
          {error}
        </p>
        <button
          onClick={() => fetchMovies(currentPage, appliedFilters)}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
        >
          {t.moviesPage.tryAgain}
        </button>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col px-4 md:px-8 py-10 max-w-5xl mx-auto w-full">
      {/* Page header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-2"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            color: 'var(--pc-t1)',
          }}
        >
          {t.moviesPage.title}
        </h1>
        <p className="text-sm" style={{ color: 'var(--pc-t3)' }}>
          {!loading &&
            (totalCount > 0
              ? t.moviesPage.showing
                  .replace('{start}', String((currentPage - 1) * pageSize + 1))
                  .replace('{end}', String(Math.min(currentPage * pageSize, totalCount)))
                  .replace('{total}', String(totalCount))
              : t.moviesPage.noMoviesFound)}
        </p>
      </div>

      <form onSubmit={handleFilterSubmit} className="mb-6 flex flex-col gap-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_9rem_8rem_auto_auto] lg:items-end">
          <label
            className="flex flex-col gap-1.5 text-xs font-semibold"
            style={{ color: 'var(--pc-t3)' }}
          >
            {t.moviesPage.searchLabel}
            <span
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{
                background: 'var(--pc-surface)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t2)',
              }}
            >
              <Search size={16} aria-hidden="true" />
              <input
                value={draftFilters.query}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, query: event.target.value }))
                }
                maxLength={80}
                placeholder={t.moviesPage.searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-70"
                style={{ color: 'var(--pc-t1)' }}
              />
            </span>
          </label>

          <label
            className="flex flex-col gap-1.5 text-xs font-semibold"
            style={{ color: 'var(--pc-t3)' }}
          >
            {t.moviesPage.yearFrom}
            <input
              value={draftFilters.yearFrom}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, yearFrom: event.target.value }))
              }
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              className="h-10 rounded-lg px-3 text-sm outline-none"
              style={{
                background: 'var(--pc-surface)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t1)',
              }}
            />
          </label>

          <label
            className="flex flex-col gap-1.5 text-xs font-semibold"
            style={{ color: 'var(--pc-t3)' }}
          >
            {t.moviesPage.yearTo}
            <input
              value={draftFilters.yearTo}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, yearTo: event.target.value }))
              }
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              className="h-10 rounded-lg px-3 text-sm outline-none"
              style={{
                background: 'var(--pc-surface)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t1)',
              }}
            />
          </label>

          <label
            className="flex flex-col gap-1.5 text-xs font-semibold"
            style={{ color: 'var(--pc-t3)' }}
          >
            {t.moviesPage.durationFilter}
            <select
              value={draftFilters.duration}
              onChange={(event) => {
                const nextFilters = {
                  ...draftFilters,
                  duration: event.target.value as MovieFilters['duration'],
                };
                setDraftFilters(nextFilters);
                applyFilters(nextFilters);
              }}
              className="h-10 rounded-lg px-3 text-sm outline-none"
              style={{
                background: 'var(--pc-surface)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t1)',
              }}
            >
              <option value="">{t.moviesPage.anyFilter}</option>
              <option value="under-90">{t.moviesPage.durationOptions.under90}</option>
              <option value="90-120">{t.moviesPage.durationOptions.between90And120}</option>
              <option value="over-120">{t.moviesPage.durationOptions.over120}</option>
            </select>
          </label>

          <label
            className="flex flex-col gap-1.5 text-xs font-semibold"
            style={{ color: 'var(--pc-t3)' }}
          >
            {t.moviesPage.scoreFilter}
            <select
              value={draftFilters.minScore}
              onChange={(event) => {
                const nextFilters = { ...draftFilters, minScore: event.target.value };
                setDraftFilters(nextFilters);
                applyFilters(nextFilters);
              }}
              className="h-10 rounded-lg px-3 text-sm outline-none"
              style={{
                background: 'var(--pc-surface)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t1)',
              }}
            >
              <option value="">{t.moviesPage.anyFilter}</option>
              <option value="7">7.0+</option>
              <option value="8">8.0+</option>
              <option value="9">9.0+</option>
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
            style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
          >
            <Search size={16} aria-hidden="true" />
            {t.moviesPage.applyFilters}
          </button>

          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
            style={{
              background: 'var(--pc-surface)',
              border: '1px solid var(--pc-bd2)',
              color: 'var(--pc-t2)',
            }}
          >
            <X size={16} aria-hidden="true" />
            {t.moviesPage.clearFilters}
          </button>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-semibold" style={{ color: 'var(--pc-t3)' }}>
            {t.moviesPage.ageRatingFilter}
          </legend>
          <div className="flex flex-wrap gap-2">
            {AGE_RATING_FILTERS.map((rating) => {
              const selected = draftFilters.ageRatings.includes(rating);
              return (
                <label
                  key={rating}
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors duration-150"
                  style={
                    selected
                      ? {
                          background: 'var(--pc-gold-subtle)',
                          border: '1px solid var(--pc-gold)',
                          color: 'var(--pc-gold-text)',
                        }
                      : {
                          background: 'var(--pc-surface)',
                          border: '1px solid var(--pc-bd2)',
                          color: 'var(--pc-t2)',
                        }
                  }
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleAgeRatingToggle(rating)}
                    className="h-3.5 w-3.5 accent-[var(--pc-gold)]"
                  />
                  {rating}
                </label>
              );
            })}
          </div>
        </fieldset>
      </form>

      {/* Table / Cards */}
      {loading ? (
        <MoviesTableSkeleton />
      ) : (
        <MoviesTable
          movies={movies}
          hasActiveFilters={hasActiveMovieFilters(appliedFilters)}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'var(--pc-surface)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t2)',
              }}
            >
              <ChevronLeft size={14} /> {t.moviesPage.prev}
            </button>

            {generatePageNumbers().map((page, index) =>
              page === '...' ? (
                <span
                  key={`dots-${index}`}
                  className="px-2 py-2 text-sm"
                  style={{ color: 'var(--pc-t4)' }}
                >
                  …
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className="w-9 h-9 rounded-xl text-sm font-medium transition-colors duration-150"
                  style={
                    page === currentPage
                      ? { background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }
                      : {
                          background: 'var(--pc-surface)',
                          border: '1px solid var(--pc-bd2)',
                          color: 'var(--pc-t2)',
                        }
                  }
                >
                  {page}
                </button>
              ),
            )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'var(--pc-surface)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t2)',
              }}
            >
              {t.moviesPage.next} <ChevronRight size={14} />
            </button>
          </div>

          <span className="text-xs" style={{ color: 'var(--pc-t4)' }}>
            {t.moviesPage.pageOf
              .replace('{current}', String(currentPage))
              .replace('{total}', String(totalPages))}
          </span>
        </div>
      )}
    </section>
  );
}

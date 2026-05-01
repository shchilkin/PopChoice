'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MovieSearch, MoviesTable, MoviesTableSkeleton, type SearchFilters } from '@/components';
import { useLanguage } from '@/i18n';
import { getCsrfToken } from '@/lib/csrfClient';

import type { Movie, MoviesResponse } from '../api/movies/route';

const EMPTY_FILTERS: SearchFilters = {
  title: '',
  yearFrom: '',
  yearTo: '',
};

function getCacheKey(page: number, filters: SearchFilters): string {
  return JSON.stringify({ page, ...filters });
}

export default function AvailableMoviesPage() {
  const { t } = useLanguage();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const pageSize = 50;

  // Client-side cache: (page + filters) => response data.
  const cache = useRef<Map<string, MoviesResponse>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const fetchMovies = useCallback(
    async (page: number, filters: SearchFilters) => {
      const cacheKey = getCacheKey(page, filters);

      const cached = cache.current.get(cacheKey);
      if (cached) {
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

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        });

        if (filters.title) params.append('title', filters.title);
        if (filters.yearFrom) params.append('yearFrom', filters.yearFrom);
        if (filters.yearTo) params.append('yearTo', filters.yearTo);

        const response = await fetch(`/api/movies?${params.toString()}`, {
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
    fetchMovies(currentPage, searchFilters);
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [fetchMovies, currentPage, searchFilters]);

  const handleSearch = useCallback((filters: SearchFilters) => {
    setSearchFilters(filters);
    setCurrentPage(1);
  }, []);

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
          onClick={() => fetchMovies(currentPage, searchFilters)}
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

      {/* Search */}
      <MovieSearch onSearch={handleSearch} loading={loading} />

      {/* Table / Cards */}
      {loading ? <MoviesTableSkeleton /> : <MoviesTable movies={movies} />}

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

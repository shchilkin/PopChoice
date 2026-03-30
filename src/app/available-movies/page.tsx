'use client';

import { useCallback, useEffect, useState } from 'react';

import { MovieSearch, MoviesTable, TopNavigation, type SearchFilters } from '@/components';

import type { Movie, MoviesResponse } from '../api/movies/route';

export default function AvailableMoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    title: '',
    yearFrom: '',
    yearTo: '',
  });
  const pageSize = 50;

  const fetchMovies = useCallback(
    async (page: number, filters: SearchFilters) => {
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

        const response = await fetch(`/api/movies?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch movies: ${response.statusText}`);
        }

        const data: MoviesResponse = await response.json();
        setMovies(data.movies);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
        setCurrentPage(data.page);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    fetchMovies(currentPage, searchFilters);
  }, [fetchMovies, currentPage, searchFilters]);

  const handleSearch = useCallback((filters: SearchFilters) => {
    setSearchFilters(filters);
    setCurrentPage(1);
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const generatePageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    // Always include first page
    range.push(1);

    // Calculate start and end of range around current page
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    if (start > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        rangeWithDots.push(i);
      }
    }

    if (end < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    // Remove duplicates
    return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col w-full items-center max-w-7xl mx-auto">
          <TopNavigation logoSize={60} />
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
            <p className="text-lg text-[var(--muted-foreground)]">Loading movies...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col w-full items-center max-w-7xl mx-auto">
          <TopNavigation logoSize={60} />
          <div className="text-center py-8">
            <p className="text-lg text-[var(--rating-mature-text)] mb-4">Error: {error}</p>
            <button
              onClick={() => fetchMovies(currentPage, searchFilters)}
              className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:bg-[var(--primary)]/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col w-full items-center max-w-7xl mx-auto">
        <TopNavigation logoSize={60} />

        {/* Header */}
        <div className="w-full mb-6">
          <h1 className="text-3xl font-bold text-center mb-4 text-[var(--foreground)]">
            Available Movies
          </h1>
        </div>

        {/* Search */}
        <MovieSearch onSearch={handleSearch} loading={loading} />

        {/* Results Summary */}
        <div className="w-full mb-4">
          <p className="text-center text-[var(--muted-foreground)]">
            Showing {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} movies
          </p>
        </div>

        {/* Table */}
        <MoviesTable movies={movies} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between w-full mt-8">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm bg-[var(--card)] border border-[var(--border)] rounded-md text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex items-center space-x-1">
                {generatePageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => (typeof page === 'number' ? handlePageChange(page) : undefined)}
                    disabled={page === '...'}
                    className={`px-3 py-2 text-sm rounded-md ${
                      page === currentPage
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : page === '...'
                          ? 'text-[var(--muted-foreground)] cursor-default'
                          : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm bg-[var(--card)] border border-[var(--border)] rounded-md text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>

            <div className="text-sm text-[var(--muted-foreground)]">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

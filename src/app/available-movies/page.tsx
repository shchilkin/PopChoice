'use client';

import { useCallback, useEffect, useState } from 'react';

import { MoviesTable } from '@/components';

import type { Movie, MoviesResponse } from '../api/movies/route';

export default function AvailableMoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  const fetchMovies = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/movies?page=${page}&pageSize=${pageSize}`);

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
    fetchMovies(currentPage);
  }, [fetchMovies, currentPage]);

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
      <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20">
        <main className="flex flex-col w-full items-center max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--pc-gold)] mx-auto mb-4"></div>
            <p className="text-lg text-[var(--pc-t3)]">Loading movies...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20">
        <main className="flex flex-col w-full items-center max-w-7xl mx-auto">
          <div className="text-center py-8">
            <p className="text-lg text-[var(--rating-mature-text)] mb-4">Error: {error}</p>
            <button
              onClick={() => fetchMovies(currentPage)}
              className="px-4 py-2 text-[var(--pc-cta-text)] rounded-lg transition-colors"
              style={{ background: 'var(--pc-cta)' }}
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-8 sm:p-20">
      <main className="flex flex-col w-full items-center max-w-7xl mx-auto">
        {/* Header */}
        <div className="w-full mb-8">
          <h1 className="text-3xl font-bold text-center mb-4 text-[var(--pc-t1)]">
            Available Movies
          </h1>
          <p className="text-center text-[var(--pc-t3)]">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
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
                className="px-3 py-2 text-sm bg-[var(--pc-surface)] border border-[var(--pc-bd2)] rounded-md text-[var(--pc-t1)] hover:bg-[var(--pc-bd1)] disabled:opacity-50 disabled:cursor-not-allowed"
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
                        ? 'text-[var(--pc-cta-text)]'
                        : page === '...'
                          ? 'text-[var(--pc-t3)] cursor-default'
                          : 'bg-[var(--pc-surface)] border border-[var(--pc-bd2)] text-[var(--pc-t1)] hover:bg-[var(--pc-bd1)]'
                    }`}
                    style={page === currentPage ? { background: 'var(--pc-cta)' } : undefined}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm bg-[var(--pc-surface)] border border-[var(--pc-bd2)] rounded-md text-[var(--pc-t1)] hover:bg-[var(--pc-bd1)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>

            <div className="text-sm text-[var(--pc-t3)]">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

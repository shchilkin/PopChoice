'use client';

import { useState, useEffect, useRef } from 'react';

export interface SearchFilters {
  title: string;
  yearFrom: string;
  yearTo: string;
}

export interface MovieSearchProps {
  onSearch: (filters: SearchFilters) => void;
  loading?: boolean;
}

const EMPTY_FILTERS: SearchFilters = {
  title: '',
  yearFrom: '',
  yearTo: '',
};

export function MovieSearch({ onSearch, loading = false }: MovieSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const isFirstRender = useRef(true);

  // Debounce search to avoid too many API calls.
  // Skip the initial mount to prevent an unnecessary fetch on load.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      onSearch(filters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, onSearch]);

  const handleInputChange = (field: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Only update state; the debounced onSearch effect will handle the fetch,
  // avoiding a duplicate request from calling onClear() directly.
  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
  };

  const hasActiveFilters = filters.title || filters.yearFrom || filters.yearTo;

  return (
    <div className="w-full mb-6 bg-[var(--card)] rounded-lg shadow-md p-6 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Search Movies</h2>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="px-3 py-1 text-sm text-[var(--rating-mature-text)] bg-[var(--rating-mature-bg)]/10 border border-[var(--rating-mature-bg)]/30 rounded-md hover:bg-[var(--rating-mature-bg)]/20 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-[var(--muted-foreground)] mb-1"
          >
            Movie Title
          </label>
          <input
            type="text"
            id="title"
            value={filters.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Search by title..."
            disabled={loading}
            className="w-full px-3 py-2 border border-[var(--input)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--ring)] bg-[var(--card)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="yearFrom"
            className="block text-sm font-medium text-[var(--muted-foreground)] mb-1"
          >
            Year From
          </label>
          <input
            type="number"
            id="yearFrom"
            value={filters.yearFrom}
            onChange={(e) => handleInputChange('yearFrom', e.target.value)}
            placeholder="e.g., 2000"
            min="1900"
            max={new Date().getFullYear()}
            disabled={loading}
            className="w-full px-3 py-2 border border-[var(--input)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--ring)] bg-[var(--card)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="yearTo"
            className="block text-sm font-medium text-[var(--muted-foreground)] mb-1"
          >
            Year To
          </label>
          <input
            type="number"
            id="yearTo"
            value={filters.yearTo}
            onChange={(e) => handleInputChange('yearTo', e.target.value)}
            placeholder="e.g., 2023"
            min="1900"
            max={new Date().getFullYear()}
            disabled={loading}
            className="w-full px-3 py-2 border border-[var(--input)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--ring)] bg-[var(--card)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] disabled:opacity-50"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center mt-4 text-[var(--muted-foreground)]">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--primary)] mr-2"></div>
          Searching...
        </div>
      )}

      {hasActiveFilters && !loading && (
        <div className="flex flex-wrap items-center gap-2 mt-4 text-sm text-[var(--muted-foreground)]">
          <span>Active filters:</span>
          {filters.title && (
            <span className="bg-[var(--secondary)] text-[var(--secondary-foreground)] px-2 py-1 rounded">
              Title: {filters.title}
            </span>
          )}
          {(filters.yearFrom || filters.yearTo) && (
            <span className="bg-[var(--secondary)] text-[var(--secondary-foreground)] px-2 py-1 rounded">
              Year: {filters.yearFrom || '...'} - {filters.yearTo || '...'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

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

  // Only update state; the debounced onSearch effect handles the fetch,
  // avoiding a duplicate request from calling a separate clear callback.
  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
  };

  const hasActiveFilters = filters.title || filters.yearFrom || filters.yearTo;

  return (
    <div
      className="w-full mb-6 rounded-xl p-6"
      style={{
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--pc-t1)' }}>
          Search Movies
        </h2>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="px-3 py-1 text-sm rounded-lg transition-colors"
            style={{
              background: 'var(--pc-bd2)',
              color: 'var(--pc-t2)',
              border: '1px solid var(--pc-bd3)',
            }}
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="title" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--pc-t3)' }}>
            Movie Title
          </label>
          <input
            type="text"
            id="title"
            value={filters.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Search by title..."
            disabled={loading}
            className="w-full px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 outline-none"
            style={{
              background: 'var(--pc-surface-deep)',
              border: '1px solid var(--pc-bd3)',
              color: 'var(--pc-t1)',
            }}
          />
        </div>

        <div>
          <label htmlFor="yearFrom" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--pc-t3)' }}>
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
            className="w-full px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 outline-none"
            style={{
              background: 'var(--pc-surface-deep)',
              border: '1px solid var(--pc-bd3)',
              color: 'var(--pc-t1)',
            }}
          />
        </div>

        <div>
          <label htmlFor="yearTo" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--pc-t3)' }}>
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
            className="w-full px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 outline-none"
            style={{
              background: 'var(--pc-surface-deep)',
              border: '1px solid var(--pc-bd3)',
              color: 'var(--pc-t1)',
            }}
          />
        </div>
      </div>

      {hasActiveFilters && !loading && (
        <div className="flex flex-wrap items-center gap-2 mt-4 text-xs" style={{ color: 'var(--pc-t3)' }}>
          <span>Active filters:</span>
          {filters.title && (
            <span
              className="px-2 py-0.5 rounded-full"
              style={{ background: 'var(--pc-bd2)', color: 'var(--pc-t2)' }}
            >
              Title: {filters.title}
            </span>
          )}
          {(filters.yearFrom || filters.yearTo) && (
            <span
              className="px-2 py-0.5 rounded-full"
              style={{ background: 'var(--pc-bd2)', color: 'var(--pc-t2)' }}
            >
              Year: {filters.yearFrom || '...'}&ndash;{filters.yearTo || '...'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

export interface SearchFilters {
  title: string;
  yearFrom: string;
  yearTo: string;
}

export interface MovieSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
  loading?: boolean;
}

const EMPTY_FILTERS: SearchFilters = {
  title: '',
  yearFrom: '',
  yearTo: '',
};

export function MovieSearch({ onSearch, onClear, loading = false }: MovieSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);

  // Debounce search to avoid too many API calls
  useEffect(() => {
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

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    onClear();
  };

  const hasActiveFilters = filters.title || filters.yearFrom || filters.yearTo;

  return (
    <div className="w-full mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Search Movies</h2>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="yearFrom"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="yearTo"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center mt-4 text-gray-600 dark:text-gray-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
          Searching...
        </div>
      )}

      {hasActiveFilters && !loading && (
        <div className="flex flex-wrap items-center gap-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Active filters:</span>
          {filters.title && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
              Title: {filters.title}
            </span>
          )}
          {(filters.yearFrom || filters.yearTo) && (
            <span className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-1 rounded">
              Year: {filters.yearFrom || '...'} - {filters.yearTo || '...'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

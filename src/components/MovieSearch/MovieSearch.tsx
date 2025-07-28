'use client';

import { useState, useEffect } from 'react';

export interface SearchFilters {
  title: string;
  cast: string;
  director: string;
  genres: string[];
  yearFrom: string;
  yearTo: string;
}

export interface MovieSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
  loading?: boolean;
  searchCapabilities?: {
    supportsBasicSearch: boolean;
    supportsAdvancedSearch: boolean;
  };
}

const AVAILABLE_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Crime',
  'Drama',
  'Family',
  'Fantasy',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'War',
];

export function MovieSearch({ 
  onSearch, 
  onClear, 
  loading = false, 
  searchCapabilities = { supportsBasicSearch: true, supportsAdvancedSearch: true } 
}: MovieSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    title: '',
    cast: '',
    director: '',
    genres: [],
    yearFrom: '',
    yearTo: '',
  });

  const [isExpanded, setIsExpanded] = useState(false);

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

  const handleGenreToggle = (genre: string) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const handleClear = () => {
    const clearedFilters = {
      title: '',
      cast: searchCapabilities.supportsAdvancedSearch ? '' : filters.cast,
      director: searchCapabilities.supportsAdvancedSearch ? '' : filters.director,
      genres: searchCapabilities.supportsAdvancedSearch ? [] : filters.genres,
      yearFrom: '',
      yearTo: '',
    };
    setFilters(clearedFilters);
    onClear();
  };

  const hasActiveFilters =
    filters.title ||
    (searchCapabilities.supportsAdvancedSearch && filters.cast) ||
    (searchCapabilities.supportsAdvancedSearch && filters.director) ||
    (searchCapabilities.supportsAdvancedSearch && filters.genres.length > 0) ||
    filters.yearFrom ||
    filters.yearTo;

  return (
    <div className="w-full mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Search Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Search Movies</h2>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={handleClear}
              className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Clear All
            </button>
          )}
          {searchCapabilities.supportsAdvancedSearch && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              {isExpanded ? 'Simple Search' : 'Advanced Search'}
            </button>
          )}
        </div>
      </div>

      {/* Basic Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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

      {/* Advanced Search Not Available Message */}
      {!searchCapabilities.supportsAdvancedSearch && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Limited Search Available
              </h3>
              <div className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                <p>
                  Advanced search features (cast, director, genres) are not available because the database doesn&apos;t contain this information. Only title and year range search are supported.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Search */}
      {isExpanded && searchCapabilities.supportsAdvancedSearch && (
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="cast"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Cast Member
              </label>
              <input
                type="text"
                id="cast"
                value={filters.cast}
                onChange={(e) => handleInputChange('cast', e.target.value)}
                placeholder="Search by actor name..."
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="director"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Director
              </label>
              <input
                type="text"
                id="director"
                value={filters.director}
                onChange={(e) => handleInputChange('director', e.target.value)}
                placeholder="Search by director name..."
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Genres
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => handleGenreToggle(genre)}
                  disabled={loading}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors disabled:opacity-50 ${
                    filters.genres.includes(genre)
                      ? 'bg-blue-500 text-white border-blue-500 dark:bg-blue-600 dark:border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
            {filters.genres.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Selected: {filters.genres.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Search Status */}
      {loading && (
        <div className="flex items-center justify-center mt-4 text-gray-600 dark:text-gray-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
          Searching...
        </div>
      )}

      {hasActiveFilters && !loading && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Active filters:
          {filters.title && (
            <span className="ml-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
              Title: {filters.title}
            </span>
          )}
          {searchCapabilities.supportsAdvancedSearch && filters.cast && (
            <span className="ml-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
              Cast: {filters.cast}
            </span>
          )}
          {searchCapabilities.supportsAdvancedSearch && filters.director && (
            <span className="ml-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
              Director: {filters.director}
            </span>
          )}
          {searchCapabilities.supportsAdvancedSearch && filters.genres.length > 0 && (
            <span className="ml-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
              Genres: {filters.genres.length}
            </span>
          )}
          {(filters.yearFrom || filters.yearTo) && (
            <span className="ml-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded">
              Year: {filters.yearFrom || '?'}-{filters.yearTo || '?'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

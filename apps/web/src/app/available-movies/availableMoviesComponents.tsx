import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

import { MoviesTable, MoviesTableSkeleton } from '@/components';

import {
  AGE_RATING_FILTERS,
  generatePageNumbers,
  hasActiveMovieFilters,
} from './availableMoviesViewModel';

import type { MovieFilters } from './availableMoviesViewModel';
import type { Movie } from '@/features/movies/catalog';
import type { useLanguage } from '@/i18n';
import type { FormEvent, ReactNode } from 'react';

type MoviesPageLabels = ReturnType<typeof useLanguage>['t']['moviesPage'];

type FilterUpdater = (updater: (current: MovieFilters) => MovieFilters) => void;

const inputStyle = {
  background: 'var(--pc-surface)',
  border: '1px solid var(--pc-bd2)',
  color: 'var(--pc-t1)',
};

interface AvailableMoviesHeaderProps {
  labels: MoviesPageLabels;
  summary: string;
}

export function AvailableMoviesHeader({ labels, summary }: AvailableMoviesHeaderProps) {
  return (
    <div className="mb-8">
      <h1
        className="text-3xl font-bold mb-2"
        style={{
          fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
          color: 'var(--pc-t1)',
        }}
      >
        {labels.title}
      </h1>
      <p className="text-sm" style={{ color: 'var(--pc-t3)' }}>
        {summary}
      </p>
    </div>
  );
}

interface AvailableMoviesErrorProps {
  error: string;
  labels: MoviesPageLabels;
  onRetry: () => void;
}

export function AvailableMoviesError({ error, labels, onRetry }: AvailableMoviesErrorProps) {
  return (
    <section className="flex-1 flex flex-col items-center justify-center px-5 py-16 text-center">
      <p className="text-sm mb-4" style={{ color: 'var(--rating-mature-text)' }}>
        {error}
      </p>
      <button
        onClick={onRetry}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
      >
        {labels.tryAgain}
      </button>
    </section>
  );
}

interface MoviesFilterFormProps {
  draftFilters: MovieFilters;
  labels: MoviesPageLabels;
  onAgeRatingToggle: (rating: string) => void;
  onClearFilters: () => void;
  onDraftFiltersChange: FilterUpdater;
  onFilterSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onImmediateFilterChange: (filters: MovieFilters) => void;
}

export function MoviesFilterForm({
  draftFilters,
  labels,
  onAgeRatingToggle,
  onClearFilters,
  onDraftFiltersChange,
  onFilterSubmit,
  onImmediateFilterChange,
}: MoviesFilterFormProps) {
  return (
    <form onSubmit={onFilterSubmit} className="mb-6 flex flex-col gap-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_9rem_8rem_auto_auto] lg:items-end">
        <SearchFilterInput
          filters={draftFilters}
          labels={labels}
          onDraftFiltersChange={onDraftFiltersChange}
        />
        <YearFilterInput
          field="yearFrom"
          label={labels.yearFrom}
          value={draftFilters.yearFrom}
          onDraftFiltersChange={onDraftFiltersChange}
        />
        <YearFilterInput
          field="yearTo"
          label={labels.yearTo}
          value={draftFilters.yearTo}
          onDraftFiltersChange={onDraftFiltersChange}
        />
        <DurationFilterSelect
          filters={draftFilters}
          labels={labels}
          onDraftFiltersChange={onDraftFiltersChange}
          onImmediateFilterChange={onImmediateFilterChange}
        />
        <ScoreFilterSelect
          filters={draftFilters}
          labels={labels}
          onDraftFiltersChange={onDraftFiltersChange}
          onImmediateFilterChange={onImmediateFilterChange}
        />
        <FilterButton icon={<Search size={16} aria-hidden="true" />} label={labels.applyFilters} />
        <FilterButton
          icon={<X size={16} aria-hidden="true" />}
          label={labels.clearFilters}
          onClick={onClearFilters}
          variant="secondary"
        />
      </div>
      <AgeRatingFilterGroup
        filters={draftFilters}
        labels={labels}
        onAgeRatingToggle={onAgeRatingToggle}
      />
    </form>
  );
}

function SearchFilterInput({
  filters,
  labels,
  onDraftFiltersChange,
}: {
  filters: MovieFilters;
  labels: MoviesPageLabels;
  onDraftFiltersChange: FilterUpdater;
}) {
  return (
    <label
      className="flex flex-col gap-1.5 text-xs font-semibold"
      style={{ color: 'var(--pc-t3)' }}
    >
      {labels.searchLabel}
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
          value={filters.query}
          onChange={(event) =>
            onDraftFiltersChange((current) => ({ ...current, query: event.target.value }))
          }
          maxLength={80}
          placeholder={labels.searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-70"
          style={{ color: 'var(--pc-t1)' }}
        />
      </span>
    </label>
  );
}

function YearFilterInput({
  field,
  label,
  onDraftFiltersChange,
  value,
}: {
  field: 'yearFrom' | 'yearTo';
  label: string;
  onDraftFiltersChange: FilterUpdater;
  value: string;
}) {
  return (
    <label
      className="flex flex-col gap-1.5 text-xs font-semibold"
      style={{ color: 'var(--pc-t3)' }}
    >
      {label}
      <input
        value={value}
        onChange={(event) =>
          onDraftFiltersChange((current) => ({ ...current, [field]: event.target.value }))
        }
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        className="h-10 rounded-lg px-3 text-sm outline-none"
        style={inputStyle}
      />
    </label>
  );
}

function DurationFilterSelect({
  filters,
  labels,
  onDraftFiltersChange,
  onImmediateFilterChange,
}: {
  filters: MovieFilters;
  labels: MoviesPageLabels;
  onDraftFiltersChange: FilterUpdater;
  onImmediateFilterChange: (filters: MovieFilters) => void;
}) {
  return (
    <label
      className="flex flex-col gap-1.5 text-xs font-semibold"
      style={{ color: 'var(--pc-t3)' }}
    >
      {labels.durationFilter}
      <select
        value={filters.duration}
        onChange={(event) => {
          const nextFilters = {
            ...filters,
            duration: event.target.value as MovieFilters['duration'],
          };
          onDraftFiltersChange(() => nextFilters);
          onImmediateFilterChange(nextFilters);
        }}
        className="h-10 rounded-lg px-3 text-sm outline-none"
        style={inputStyle}
      >
        <option value="">{labels.anyFilter}</option>
        <option value="under-90">{labels.durationOptions.under90}</option>
        <option value="90-120">{labels.durationOptions.between90And120}</option>
        <option value="over-120">{labels.durationOptions.over120}</option>
      </select>
    </label>
  );
}

function ScoreFilterSelect({
  filters,
  labels,
  onDraftFiltersChange,
  onImmediateFilterChange,
}: {
  filters: MovieFilters;
  labels: MoviesPageLabels;
  onDraftFiltersChange: FilterUpdater;
  onImmediateFilterChange: (filters: MovieFilters) => void;
}) {
  return (
    <label
      className="flex flex-col gap-1.5 text-xs font-semibold"
      style={{ color: 'var(--pc-t3)' }}
    >
      {labels.scoreFilter}
      <select
        value={filters.minScore}
        onChange={(event) => {
          const nextFilters = { ...filters, minScore: event.target.value };
          onDraftFiltersChange(() => nextFilters);
          onImmediateFilterChange(nextFilters);
        }}
        className="h-10 rounded-lg px-3 text-sm outline-none"
        style={inputStyle}
      >
        <option value="">{labels.anyFilter}</option>
        <option value="7">7.0+</option>
        <option value="8">8.0+</option>
        <option value="9">9.0+</option>
      </select>
    </label>
  );
}

function FilterButton({
  icon,
  label,
  onClick,
  variant = 'primary',
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const style =
    variant === 'primary'
      ? { background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }
      : {
          background: 'var(--pc-surface)',
          border: '1px solid var(--pc-bd2)',
          color: 'var(--pc-t2)',
        };

  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
      style={style}
    >
      {icon}
      {label}
    </button>
  );
}

function AgeRatingFilterGroup({
  filters,
  labels,
  onAgeRatingToggle,
}: {
  filters: MovieFilters;
  labels: MoviesPageLabels;
  onAgeRatingToggle: (rating: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-semibold" style={{ color: 'var(--pc-t3)' }}>
        {labels.ageRatingFilter}
      </legend>
      <div className="flex flex-wrap gap-2">
        {AGE_RATING_FILTERS.map((rating) => (
          <AgeRatingOption
            key={rating}
            rating={rating}
            selected={filters.ageRatings.includes(rating)}
            onAgeRatingToggle={onAgeRatingToggle}
          />
        ))}
      </div>
    </fieldset>
  );
}

function AgeRatingOption({
  onAgeRatingToggle,
  rating,
  selected,
}: {
  onAgeRatingToggle: (rating: string) => void;
  rating: string;
  selected: boolean;
}) {
  const style = selected
    ? {
        background: 'var(--pc-gold-subtle)',
        border: '1px solid var(--pc-gold)',
        color: 'var(--pc-gold-text)',
      }
    : {
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
        color: 'var(--pc-t2)',
      };

  return (
    <label
      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors duration-150"
      style={style}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onAgeRatingToggle(rating)}
        className="h-3.5 w-3.5 accent-[var(--pc-gold)]"
      />
      {rating}
    </label>
  );
}

interface MoviesResultPanelProps {
  appliedFilters: MovieFilters;
  loading: boolean;
  movies: Movie[];
  onClearFilters: () => void;
}

export function MoviesResultPanel({
  appliedFilters,
  loading,
  movies,
  onClearFilters,
}: MoviesResultPanelProps) {
  return loading ? (
    <MoviesTableSkeleton />
  ) : (
    <MoviesTable
      movies={movies}
      hasActiveFilters={hasActiveMovieFilters(appliedFilters)}
      onClearFilters={onClearFilters}
    />
  );
}

interface MoviesPaginationProps {
  currentPage: number;
  labels: MoviesPageLabels;
  onPageChange: (page: number) => void;
  totalPages: number;
}

export function MoviesPagination({
  currentPage,
  labels,
  onPageChange,
  totalPages,
}: MoviesPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-8 gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 flex-wrap">
        <PaginationButton
          disabled={currentPage === 1}
          label={labels.prev}
          onClick={() => onPageChange(currentPage - 1)}
          prefix={<ChevronLeft size={14} />}
        />
        {generatePageNumbers(currentPage, totalPages).map((page, index) => (
          <PaginationPageButton
            key={page === '...' ? `dots-${index}` : page}
            currentPage={currentPage}
            onPageChange={onPageChange}
            page={page}
          />
        ))}
        <PaginationButton
          disabled={currentPage === totalPages}
          label={labels.next}
          onClick={() => onPageChange(currentPage + 1)}
          suffix={<ChevronRight size={14} />}
        />
      </div>

      <span className="text-xs" style={{ color: 'var(--pc-t4)' }}>
        {labels.pageOf
          .replace('{current}', String(currentPage))
          .replace('{total}', String(totalPages))}
      </span>
    </div>
  );
}

function PaginationButton({
  disabled,
  label,
  onClick,
  prefix,
  suffix,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
        color: 'var(--pc-t2)',
      }}
    >
      {prefix}
      {label}
      {suffix}
    </button>
  );
}

function PaginationPageButton({
  currentPage,
  onPageChange,
  page,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  page: number | '...';
}) {
  if (page === '...') {
    return (
      <span className="px-2 py-2 text-sm" style={{ color: 'var(--pc-t4)' }}>
        …
      </span>
    );
  }

  return (
    <button
      onClick={() => onPageChange(page)}
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
  );
}

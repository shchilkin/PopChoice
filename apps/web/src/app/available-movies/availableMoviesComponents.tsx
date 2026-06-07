import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button, MoviesTable, MoviesTableSkeleton } from '@/components';

import {
  AGE_RATING_FILTERS,
  applyQuickMovieFilter,
  cloneEmptyMovieFilters,
  getActiveMovieFilterCount,
  generatePageNumbers,
  hasActiveMovieFilters,
  isQuickMovieFilterActive,
  normalizeMovieFilters,
} from './availableMoviesViewModel';

import type { MovieFilters, QuickMovieFilterId } from './availableMoviesViewModel';
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
    <div className="mb-6">
      <h1
        className="mb-2 text-3xl font-bold text-pretty"
        style={{
          fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
          color: 'var(--pc-t1)',
        }}
      >
        {labels.title}
      </h1>
      <p className="text-sm tabular-nums" style={{ color: 'var(--pc-t3)' }}>
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
      <Button variant="cta" size="md" type="button" onClick={onRetry}>
        {labels.tryAgain}
      </Button>
    </section>
  );
}

interface MoviesFilterFormProps {
  draftFilters: MovieFilters;
  labels: MoviesPageLabels;
  onAgeRatingToggle: (rating: string) => void;
  onClearFilters: () => void;
  onCommitFilters: (filters: MovieFilters) => void;
  onDraftFiltersChange: FilterUpdater;
  onFilterSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onImmediateFilterChange: (filters: MovieFilters) => void;
}

export function MoviesFilterForm({
  draftFilters,
  labels,
  onAgeRatingToggle,
  onClearFilters,
  onCommitFilters,
  onDraftFiltersChange,
  onFilterSubmit,
  onImmediateFilterChange,
}: MoviesFilterFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const activeFilterCount = getActiveMovieFilterCount(draftFilters);
  const activeFilterLabel = getFilterToggleLabel(activeFilterCount, labels);

  const commitFilters = (filters: MovieFilters) => onCommitFilters(normalizeMovieFilters(filters));

  return (
    <form onSubmit={onFilterSubmit} className="mb-6">
      <div
        className="rounded-2xl p-3 md:p-4"
        style={{
          background: 'var(--pc-ghost)',
          border: '1px solid var(--pc-bd2)',
        }}
      >
        <div className="flex flex-col gap-3 md:flex-row">
          <SearchFilterInput
            filters={draftFilters}
            labels={labels}
            onClearQuery={() => commitFilters({ ...draftFilters, query: '' })}
            onDraftFiltersChange={onDraftFiltersChange}
          />
          <Button
            variant="ghost"
            size="lg"
            type="button"
            onClick={() => setAdvancedOpen((current) => !current)}
            aria-expanded={advancedOpen}
            className={getFilterToggleClassName(advancedOpen)}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            {activeFilterLabel}
            <ChevronDown
              size={15}
              aria-hidden="true"
              className={`transition-transform duration-150 ${advancedOpen ? 'rotate-180' : ''}`}
            />
          </Button>
          <FilterButton
            icon={<Search size={17} aria-hidden="true" />}
            label={labels.searchButton}
          />
        </div>

        <QuickFilterRow
          filters={draftFilters}
          labels={labels}
          onQuickFilterToggle={(id) => commitFilters(applyQuickMovieFilter(draftFilters, id))}
        />

        <ActiveFilterRow
          filters={draftFilters}
          labels={labels}
          onClearFilters={onClearFilters}
          onCommitFilters={commitFilters}
        />

        {advancedOpen && (
          <AdvancedFiltersPanel
            filters={draftFilters}
            labels={labels}
            onAgeRatingToggle={onAgeRatingToggle}
            onClearFilters={onClearFilters}
            onDraftFiltersChange={onDraftFiltersChange}
            onImmediateFilterChange={onImmediateFilterChange}
          />
        )}
      </div>
    </form>
  );
}

function getFilterToggleLabel(activeFilterCount: number, labels: MoviesPageLabels): string {
  if (activeFilterCount === 0) return labels.filterToggle;
  return labels.filterToggleActive.replace('{count}', String(activeFilterCount));
}

function getFilterToggleClassName(advancedOpen: boolean): string {
  if (!advancedOpen) return 'bg-[var(--pc-surface)] md:w-auto';
  return 'border-[var(--pc-gold)] bg-[var(--pc-gold-subtle)] text-[var(--pc-gold-text)] hover:brightness-105 md:w-auto';
}

function SearchFilterInput({
  filters,
  labels,
  onClearQuery,
  onDraftFiltersChange,
}: {
  filters: MovieFilters;
  labels: MoviesPageLabels;
  onClearQuery: () => void;
  onDraftFiltersChange: FilterUpdater;
}) {
  return (
    <label className="min-w-0 flex-1">
      <span className="sr-only">{labels.searchLabel}</span>
      <span className="flex h-12 items-center gap-3 rounded-2xl border border-[var(--pc-bd2)] bg-[var(--pc-surface)] px-4 text-[var(--pc-t2)] transition-colors duration-150 hover:border-[var(--pc-bd3)] focus-within:border-[var(--pc-gold)] focus-within:shadow-[var(--pc-gold-ring)]">
        <Search size={18} aria-hidden="true" />
        <input
          name="query"
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={filters.query}
          onChange={(event) =>
            onDraftFiltersChange((current) => ({ ...current, query: event.target.value }))
          }
          maxLength={80}
          placeholder={labels.searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:opacity-70"
          style={{ color: 'var(--pc-t1)' }}
        />
        {filters.query.trim() && (
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={onClearQuery}
            aria-label={labels.clearSearch}
            className="h-7 w-7 border-0 text-[var(--pc-t3)] hover:bg-[var(--pc-surface-hover)] hover:text-[var(--pc-t1)]"
          >
            <X size={16} aria-hidden="true" />
          </Button>
        )}
      </span>
    </label>
  );
}

function QuickFilterRow({
  filters,
  labels,
  onQuickFilterToggle,
}: {
  filters: MovieFilters;
  labels: MoviesPageLabels;
  onQuickFilterToggle: (id: QuickMovieFilterId) => void;
}) {
  const options = useMemo(
    () =>
      [
        { id: 'topRated' as const, label: labels.quickFilters.topRated },
        { id: 'short' as const, label: labels.quickFilters.short },
        { id: 'classic' as const, label: labels.quickFilters.classic },
        { id: 'recent' as const, label: labels.quickFilters.recent },
        { id: 'family' as const, label: labels.quickFilters.family },
      ] satisfies { id: QuickMovieFilterId; label: string }[],
    [labels],
  );

  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={labels.quickFiltersLabel}>
      {options.map((option) => {
        const selected = isQuickMovieFilterActive(filters, option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onQuickFilterToggle(option.id)}
            aria-pressed={selected}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)] ${
              selected
                ? 'border-[var(--pc-gold)] bg-[var(--pc-gold-subtle)] text-[var(--pc-gold-text)] hover:brightness-105'
                : 'border-[var(--pc-bd2)] bg-[var(--pc-surface)] text-[var(--pc-t3)] hover:border-[var(--pc-bd3)] hover:bg-[var(--pc-surface-hover)] hover:text-[var(--pc-t1)]'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface ActiveFilterChip {
  id: string;
  label: string;
  remove: (filters: MovieFilters) => MovieFilters;
}

function getActiveFilterChips(filters: MovieFilters, labels: MoviesPageLabels): ActiveFilterChip[] {
  const normalized = normalizeMovieFilters(filters);

  return [
    getQueryFilterChip(normalized, labels),
    getYearFilterChip(normalized, labels),
    getDurationFilterChip(normalized, labels),
    getScoreFilterChip(normalized, labels),
    ...getAgeRatingFilterChips(normalized.ageRatings),
  ].filter((chip): chip is ActiveFilterChip => Boolean(chip));
}

function getDurationFilterLabel(
  duration: Exclude<MovieFilters['duration'], ''>,
  labels: MoviesPageLabels,
): string {
  if (duration === 'under-90') return labels.durationOptions.under90;
  if (duration === '90-120') return labels.durationOptions.between90And120;
  return labels.durationOptions.over120;
}

function getQueryFilterChip(
  filters: MovieFilters,
  labels: MoviesPageLabels,
): ActiveFilterChip | null {
  if (!filters.query) return null;

  return {
    id: 'query',
    label: labels.activeQuery.replace('{value}', filters.query),
    remove: (current) => ({ ...current, query: '' }),
  };
}

function getYearFilterLabel(filters: MovieFilters, labels: MoviesPageLabels): string {
  if (filters.yearFrom && filters.yearTo) {
    return labels.activeYearRange
      .replace('{from}', filters.yearFrom)
      .replace('{to}', filters.yearTo);
  }
  if (filters.yearFrom) return labels.activeYearFrom.replace('{value}', filters.yearFrom);
  return labels.activeYearTo.replace('{value}', filters.yearTo);
}

function getYearFilterChip(
  filters: MovieFilters,
  labels: MoviesPageLabels,
): ActiveFilterChip | null {
  if (!filters.yearFrom && !filters.yearTo) return null;

  return {
    id: 'years',
    label: getYearFilterLabel(filters, labels),
    remove: (current) => ({ ...current, yearFrom: '', yearTo: '' }),
  };
}

function getDurationFilterChip(
  filters: MovieFilters,
  labels: MoviesPageLabels,
): ActiveFilterChip | null {
  if (!filters.duration) return null;

  return {
    id: 'duration',
    label: getDurationFilterLabel(filters.duration, labels),
    remove: (current) => ({ ...current, duration: '' }),
  };
}

function getScoreFilterChip(
  filters: MovieFilters,
  labels: MoviesPageLabels,
): ActiveFilterChip | null {
  if (!filters.minScore) return null;

  return {
    id: 'score',
    label: labels.activeScore.replace('{value}', filters.minScore),
    remove: (current) => ({ ...current, minScore: '' }),
  };
}

function getAgeRatingFilterChips(ageRatings: string[]): ActiveFilterChip[] {
  return ageRatings.map((rating) => ({
    id: `rating-${rating}`,
    label: rating,
    remove: (current) => ({
      ...current,
      ageRatings: current.ageRatings.filter((value) => value !== rating),
    }),
  }));
}

function ActiveFilterRow({
  filters,
  labels,
  onClearFilters,
  onCommitFilters,
}: {
  filters: MovieFilters;
  labels: MoviesPageLabels;
  onClearFilters: () => void;
  onCommitFilters: (filters: MovieFilters) => void;
}) {
  const chips = getActiveFilterChips(filters, labels);
  if (chips.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold" style={{ color: 'var(--pc-t4)' }}>
        {labels.activeFiltersLabel}
      </span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onCommitFilters(chip.remove(filters))}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--pc-bd2)] bg-[var(--pc-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--pc-t2)] transition-colors duration-150 hover:border-[var(--pc-bd3)] hover:bg-[var(--pc-surface-hover)] hover:text-[var(--pc-t1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
        >
          {chip.label}
          <X size={12} aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearFilters}
        className="rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--pc-gold-text)] transition-colors duration-150 hover:bg-[var(--pc-gold-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
      >
        {labels.clearAllFilters}
      </button>
    </div>
  );
}

function AdvancedFiltersPanel({
  filters,
  labels,
  onAgeRatingToggle,
  onClearFilters,
  onDraftFiltersChange,
  onImmediateFilterChange,
}: {
  filters: MovieFilters;
  labels: MoviesPageLabels;
  onAgeRatingToggle: (rating: string) => void;
  onClearFilters: () => void;
  onDraftFiltersChange: FilterUpdater;
  onImmediateFilterChange: (filters: MovieFilters) => void;
}) {
  return (
    <div
      className="mt-4 rounded-2xl p-3"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd1)' }}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--pc-t4)]">
        {labels.advancedFilters}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[6.5rem_6.5rem_9rem_8rem_auto_auto] lg:items-end">
        <YearFilterInput
          field="yearFrom"
          label={labels.yearFrom}
          value={filters.yearFrom}
          onDraftFiltersChange={onDraftFiltersChange}
        />
        <YearFilterInput
          field="yearTo"
          label={labels.yearTo}
          value={filters.yearTo}
          onDraftFiltersChange={onDraftFiltersChange}
        />
        <DurationFilterSelect
          filters={filters}
          labels={labels}
          onDraftFiltersChange={onDraftFiltersChange}
          onImmediateFilterChange={onImmediateFilterChange}
        />
        <ScoreFilterSelect
          filters={filters}
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
        filters={filters}
        labels={labels}
        onAgeRatingToggle={onAgeRatingToggle}
      />
    </div>
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
        name={field}
        autoComplete="off"
        value={value}
        onChange={(event) =>
          onDraftFiltersChange((current) => ({ ...current, [field]: event.target.value }))
        }
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        placeholder={field === 'yearFrom' ? '1990' : '2026'}
        className="h-10 rounded-lg px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
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
      className="col-span-2 flex flex-col gap-1.5 text-xs font-semibold lg:col-span-1"
      style={{ color: 'var(--pc-t3)' }}
    >
      {labels.durationFilter}
      <select
        name="duration"
        value={filters.duration}
        onChange={(event) => {
          const nextFilters = {
            ...filters,
            duration: event.target.value as MovieFilters['duration'],
          };
          onDraftFiltersChange(() => nextFilters);
          onImmediateFilterChange(nextFilters);
        }}
        className="h-10 rounded-lg px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
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
      className="col-span-2 flex flex-col gap-1.5 text-xs font-semibold lg:col-span-1"
      style={{ color: 'var(--pc-t3)' }}
    >
      {labels.scoreFilter}
      <select
        name="minScore"
        value={filters.minScore}
        onChange={(event) => {
          const nextFilters = { ...filters, minScore: event.target.value };
          onDraftFiltersChange(() => nextFilters);
          onImmediateFilterChange(nextFilters);
        }}
        className="h-10 rounded-lg px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
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
  return (
    <Button
      variant={variant === 'primary' ? 'cta' : 'ghost'}
      size="md"
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      className={`col-span-2 lg:col-span-1 ${variant === 'secondary' ? 'bg-[var(--pc-ghost)]' : ''}`}
    >
      {icon}
      {label}
    </Button>
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
    <fieldset className="mt-4 flex flex-col gap-2">
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
  return (
    <label
      className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors duration-150 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--pc-gold)] ${
        selected
          ? 'border-[var(--pc-gold)] bg-[var(--pc-gold-subtle)] text-[var(--pc-gold-text)] hover:brightness-105'
          : 'border-[var(--pc-bd2)] bg-[var(--pc-ghost)] text-[var(--pc-t2)] hover:border-[var(--pc-bd3)] hover:bg-[var(--pc-surface-hover)] hover:text-[var(--pc-t1)]'
      }`}
    >
      <input
        name={`ageRating-${rating}`}
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
  labels: MoviesPageLabels;
  loading: boolean;
  movies: Movie[];
  onApplyFilters: (filters: MovieFilters) => void;
  onClearFilters: () => void;
}

export function MoviesResultPanel({
  appliedFilters,
  labels,
  loading,
  movies,
  onApplyFilters,
  onClearFilters,
}: MoviesResultPanelProps) {
  if (loading) return <MoviesTableSkeleton />;

  if (movies.length === 0) {
    return (
      <MoviesEmptyState
        filters={appliedFilters}
        labels={labels}
        onApplyFilters={onApplyFilters}
        onClearFilters={onClearFilters}
      />
    );
  }

  return <MoviesTable movies={movies} />;
}

function MoviesEmptyState({
  filters,
  labels,
  onApplyFilters,
  onClearFilters,
}: {
  filters: MovieFilters;
  labels: MoviesPageLabels;
  onApplyFilters: (filters: MovieFilters) => void;
  onClearFilters: () => void;
}) {
  const hasActiveFilters = hasActiveMovieFilters(filters);
  const normalized = normalizeMovieFilters(filters);
  const copy = getMoviesEmptyStateCopy(filters, labels);
  const suggestions = getMoviesEmptyStateSuggestions(labels);

  return (
    <section
      className="rounded-2xl px-5 py-10 text-center"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
    >
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: 'var(--pc-gold-subtle)', color: 'var(--pc-gold-text)' }}
        aria-hidden="true"
      >
        <Sparkles size={22} strokeWidth={1.8} />
      </div>
      <h2 className="text-lg font-semibold text-pretty" style={{ color: 'var(--pc-t1)' }}>
        {copy.title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6" style={{ color: 'var(--pc-t3)' }}>
        {copy.body}
      </p>

      <MoviesEmptyStateRecoveryActions
        hasActiveFilters={hasActiveFilters}
        labels={labels}
        normalizedFilters={normalized}
        onApplyFilters={onApplyFilters}
        onClearFilters={onClearFilters}
      />
      <MoviesEmptyStateSuggestions
        label={labels.emptySuggestionsLabel}
        onApplyFilters={onApplyFilters}
        suggestions={suggestions}
      />
    </section>
  );
}

function getMoviesEmptyStateCopy(filters: MovieFilters, labels: MoviesPageLabels) {
  const hasActiveFilters = hasActiveMovieFilters(filters);
  const normalized = normalizeMovieFilters(filters);

  return {
    title: getMoviesEmptyStateTitle(hasActiveFilters, normalized.query, labels),
    body: getMoviesEmptyStateBody(hasActiveFilters, getActiveMovieFilterCount(filters), labels),
  };
}

function getMoviesEmptyStateTitle(
  hasActiveFilters: boolean,
  query: string,
  labels: MoviesPageLabels,
) {
  if (hasActiveFilters && query) return labels.emptySearchTitle.replace('{query}', query);
  if (hasActiveFilters) return labels.emptyFilteredTitle;
  return labels.emptyCatalogTitle;
}

function getMoviesEmptyStateBody(
  hasActiveFilters: boolean,
  activeFilterCount: number,
  labels: MoviesPageLabels,
) {
  if (!hasActiveFilters) return labels.emptyCatalogBody;
  if (activeFilterCount > 1) return labels.emptyNarrowBody;
  return labels.emptyFilteredBody;
}

function getMoviesEmptyStateSuggestions(labels: MoviesPageLabels) {
  return [
    {
      label: labels.emptySuggestionDirector,
      filters: { ...cloneEmptyMovieFilters(), query: 'Tarantino' },
    },
    {
      label: labels.emptySuggestionGenre,
      filters: { ...cloneEmptyMovieFilters(), query: 'thriller' },
    },
    { label: labels.emptySuggestionScore, filters: { ...cloneEmptyMovieFilters(), minScore: '8' } },
  ];
}

function MoviesEmptyStateRecoveryActions({
  hasActiveFilters,
  labels,
  normalizedFilters,
  onApplyFilters,
  onClearFilters,
}: {
  hasActiveFilters: boolean;
  labels: MoviesPageLabels;
  normalizedFilters: MovieFilters;
  onApplyFilters: (filters: MovieFilters) => void;
  onClearFilters: () => void;
}) {
  if (!hasActiveFilters) return null;

  return (
    <div className="mt-5 flex flex-wrap justify-center gap-2">
      <Button variant="cta" size="md" type="button" onClick={onClearFilters}>
        {labels.clearAllFilters}
      </Button>
      <ClearSearchRecoveryAction
        labels={labels}
        normalizedFilters={normalizedFilters}
        onApplyFilters={onApplyFilters}
      />
      <ClearYearRecoveryAction
        labels={labels}
        normalizedFilters={normalizedFilters}
        onApplyFilters={onApplyFilters}
      />
    </div>
  );
}

function ClearSearchRecoveryAction({
  labels,
  normalizedFilters,
  onApplyFilters,
}: {
  labels: MoviesPageLabels;
  normalizedFilters: MovieFilters;
  onApplyFilters: (filters: MovieFilters) => void;
}) {
  if (!normalizedFilters.query) return null;

  return (
    <Button
      variant="ghost"
      size="md"
      type="button"
      onClick={() => onApplyFilters({ ...normalizedFilters, query: '' })}
      className="bg-[var(--pc-ghost)]"
    >
      {labels.clearSearch}
    </Button>
  );
}

function ClearYearRecoveryAction({
  labels,
  normalizedFilters,
  onApplyFilters,
}: {
  labels: MoviesPageLabels;
  normalizedFilters: MovieFilters;
  onApplyFilters: (filters: MovieFilters) => void;
}) {
  if (!normalizedFilters.yearFrom && !normalizedFilters.yearTo) return null;

  return (
    <Button
      variant="ghost"
      size="md"
      type="button"
      onClick={() => onApplyFilters({ ...normalizedFilters, yearFrom: '', yearTo: '' })}
      className="bg-[var(--pc-ghost)]"
    >
      {labels.removeYearFilters}
    </Button>
  );
}

function MoviesEmptyStateSuggestions({
  label,
  onApplyFilters,
  suggestions,
}: {
  label: string;
  onApplyFilters: (filters: MovieFilters) => void;
  suggestions: { label: string; filters: MovieFilters }[];
}) {
  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--pc-t4)]">{label}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.label}
            type="button"
            onClick={() => onApplyFilters(suggestion.filters)}
            className="rounded-full border border-[var(--pc-bd2)] bg-[var(--pc-ghost)] px-3 py-1.5 text-xs font-semibold text-[var(--pc-t2)] transition-colors duration-150 hover:border-[var(--pc-bd3)] hover:bg-[var(--pc-surface-hover)] hover:text-[var(--pc-t1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
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
          prefix={<ChevronLeft size={14} aria-hidden="true" />}
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
          suffix={<ChevronRight size={14} aria-hidden="true" />}
        />
      </div>

      <span className="text-xs tabular-nums" style={{ color: 'var(--pc-t4)' }}>
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
    <Button
      variant="ghost"
      size="md"
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="bg-[var(--pc-surface)]"
    >
      {prefix}
      {label}
      {suffix}
    </Button>
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
    <Button
      variant={page === currentPage ? 'cta' : 'ghost'}
      size="icon"
      type="button"
      onClick={() => onPageChange(page)}
      className={`h-9 w-9 rounded-xl text-sm ${page === currentPage ? '' : 'bg-[var(--pc-surface)]'}`}
    >
      {page}
    </Button>
  );
}

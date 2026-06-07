'use client';

import { ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type RefObject } from 'react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import { ExpandedSuggestion } from './ExpandedSuggestion';
import { SmallSuggestionCard } from './SmallSuggestionCard';

import type { MovieRecommendation } from '@/utils/client';

type CarouselDirection = 'left' | 'right';
type MorePicksLens = 'popular' | 'cozier' | 'bolder' | 'shorter';
type MorePicksViewState = 'hidden' | 'completed' | 'stalled' | 'loading' | 'ready';

type SuggestionSectionTitleProps = {
  label: string;
  gradient: string;
};

export type LocalSuggestionsSectionProps = {
  activeSuggestion: number | null;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  carouselRef: RefObject<HTMLDivElement | null>;
  isGroupResult: boolean;
  movies: MovieRecommendation[];
  onScroll: () => void;
  onScrollCarousel: (direction: CarouselDirection) => void;
  onToggleSuggestion: (id: number) => void;
};

function SuggestionSectionTitle({ label, gradient }: SuggestionSectionTitleProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-5 rounded-full" style={{ background: gradient }} />
      <span className="uppercase tracking-widest text-xs" style={{ color: 'var(--pc-t2)' }}>
        {label}
      </span>
    </div>
  );
}

function CarouselArrowButton({
  direction,
  enabled,
  label,
  onScrollCarousel,
}: {
  direction: CarouselDirection;
  enabled: boolean;
  label: string;
  onScrollCarousel: (direction: CarouselDirection) => void;
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  const enabledStyle = {
    background: 'var(--pc-bd2)',
    border: '1px solid var(--pc-bd2)',
    color: 'var(--pc-t1)',
    cursor: 'pointer',
  };
  const disabledStyle = {
    background: 'var(--pc-bd1)',
    border: '1px solid var(--pc-bd2)',
    color: 'var(--pc-t4)',
    cursor: 'not-allowed',
  };

  return (
    <button
      type="button"
      onClick={() => onScrollCarousel(direction)}
      disabled={!enabled}
      aria-label={label}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
      style={enabled ? enabledStyle : disabledStyle}
    >
      <Icon size={15} />
    </button>
  );
}

function LocalCarouselHeader({
  canScrollLeft,
  canScrollRight,
  onScrollCarousel,
  scrollLeftLabel,
  scrollRightLabel,
  title,
}: {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScrollCarousel: (direction: CarouselDirection) => void;
  scrollLeftLabel: string;
  scrollRightLabel: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <SuggestionSectionTitle
        label={title}
        gradient={`linear-gradient(180deg, ${palette.purple}, ${palette.teal})`}
      />
      <div className="flex items-center gap-2">
        <CarouselArrowButton
          direction="left"
          enabled={canScrollLeft}
          label={scrollLeftLabel}
          onScrollCarousel={onScrollCarousel}
        />
        <CarouselArrowButton
          direction="right"
          enabled={canScrollRight}
          label={scrollRightLabel}
          onScrollCarousel={onScrollCarousel}
        />
      </div>
    </div>
  );
}

function SuggestionCarousel({
  activeSuggestion,
  carouselRef,
  movies,
  onScroll,
  onToggleSuggestion,
}: {
  activeSuggestion: number | null;
  carouselRef: RefObject<HTMLDivElement | null>;
  movies: MovieRecommendation[];
  onScroll?: () => void;
  onToggleSuggestion: (id: number) => void;
}) {
  return (
    <div
      ref={carouselRef}
      onScroll={onScroll}
      className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
    >
      {movies.map((movie) => (
        <SmallSuggestionCard
          key={movie.id}
          movie={movie}
          active={activeSuggestion === movie.id}
          onClick={() => onToggleSuggestion(movie.id)}
        />
      ))}
    </div>
  );
}

function CarouselEdgeFade({ isVisible, side }: { isVisible: boolean; side: 'left' | 'right' }) {
  const className =
    side === 'left'
      ? 'absolute left-0 top-0 bottom-4 w-6 pointer-events-none'
      : 'absolute right-0 top-0 bottom-4 w-10 pointer-events-none';
  const background =
    side === 'left'
      ? 'linear-gradient(to right, var(--pc-bg), transparent)'
      : 'linear-gradient(to left, var(--pc-bg), transparent)';

  return (
    <div
      className={className}
      style={{
        background,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s',
      }}
    />
  );
}

function SuggestionDot({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const activeStyle = {
    width: 16,
    height: 6,
    background: `linear-gradient(90deg, ${palette.gold}, ${palette.amber})`,
  };
  const inactiveStyle = {
    width: 6,
    height: 6,
    background: 'var(--pc-bd3)',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="rounded-full transition-[background,width] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
      style={active ? activeStyle : inactiveStyle}
    />
  );
}

function SuggestionDots({
  activeSuggestion,
  movies,
  showDetailsLabel,
  onToggleSuggestion,
}: {
  activeSuggestion: number | null;
  movies: MovieRecommendation[];
  showDetailsLabel: string;
  onToggleSuggestion: (id: number) => void;
}) {
  return (
    <div className="flex justify-center gap-1.5 mt-2">
      {movies.map((movie) => (
        <SuggestionDot
          key={movie.id}
          active={activeSuggestion === movie.id}
          label={showDetailsLabel.replace('{name}', movie.localizedName ?? movie.name)}
          onClick={() => onToggleSuggestion(movie.id)}
        />
      ))}
    </div>
  );
}

function SelectedSuggestionDetails({
  isGroupResult,
  movie,
}: {
  isGroupResult: boolean;
  movie?: MovieRecommendation;
}) {
  if (!movie) return null;

  return (
    <AnimatePresence>
      <ExpandedSuggestion movie={movie} isGroup={isGroupResult} />
    </AnimatePresence>
  );
}

function LocalSuggestionCarousel({
  activeSuggestion,
  canScrollLeft,
  canScrollRight,
  carouselRef,
  movies,
  onScroll,
  onToggleSuggestion,
}: {
  activeSuggestion: number | null;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  carouselRef: RefObject<HTMLDivElement | null>;
  movies: MovieRecommendation[];
  onScroll: () => void;
  onToggleSuggestion: (id: number) => void;
}) {
  return (
    <div className="relative">
      <SuggestionCarousel
        activeSuggestion={activeSuggestion}
        carouselRef={carouselRef}
        movies={movies}
        onScroll={onScroll}
        onToggleSuggestion={onToggleSuggestion}
      />
      <CarouselEdgeFade side="left" isVisible={canScrollLeft} />
      <CarouselEdgeFade side="right" isVisible={canScrollRight} />
    </div>
  );
}

export function LocalSuggestionsSection({
  activeSuggestion,
  canScrollLeft,
  canScrollRight,
  carouselRef,
  isGroupResult,
  movies,
  onScroll,
  onScrollCarousel,
  onToggleSuggestion,
}: LocalSuggestionsSectionProps) {
  const { t } = useLanguage();
  const selectedMovie = movies.find((movie) => movie.id === activeSuggestion);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <LocalCarouselHeader
        canScrollLeft={canScrollLeft}
        canScrollRight={canScrollRight}
        onScrollCarousel={onScrollCarousel}
        scrollLeftLabel={t.results.scrollLeft}
        scrollRightLabel={t.results.scrollRight}
        title={t.results.foundInDb}
      />

      <LocalSuggestionCarousel
        activeSuggestion={activeSuggestion}
        canScrollLeft={canScrollLeft}
        canScrollRight={canScrollRight}
        carouselRef={carouselRef}
        movies={movies}
        onScroll={onScroll}
        onToggleSuggestion={onToggleSuggestion}
      />

      <SuggestionDots
        activeSuggestion={activeSuggestion}
        movies={movies}
        showDetailsLabel={t.results.showDetails}
        onToggleSuggestion={onToggleSuggestion}
      />

      <SelectedSuggestionDetails movie={selectedMovie} isGroupResult={isGroupResult} />
    </motion.div>
  );
}

function TmdbMovies({
  activeSuggestion,
  carouselRef,
  isGroupResult,
  movies,
  onToggleSuggestion,
}: {
  activeSuggestion: number | null;
  carouselRef: RefObject<HTMLDivElement | null>;
  isGroupResult: boolean;
  movies: MovieRecommendation[];
  onToggleSuggestion: (id: number) => void;
}) {
  const selectedMovie = movies.find((movie) => movie.id === activeSuggestion);

  if (movies.length === 0) return null;

  return (
    <>
      <SuggestionCarousel
        activeSuggestion={activeSuggestion}
        carouselRef={carouselRef}
        movies={movies}
        onToggleSuggestion={onToggleSuggestion}
      />
      <SelectedSuggestionDetails movie={selectedMovie} isGroupResult={isGroupResult} />
    </>
  );
}

function MorePicksButtonContent({
  isLoading,
  label,
  loadingLabel,
}: {
  isLoading: boolean;
  label: string;
  loadingLabel: string;
}) {
  if (isLoading) {
    return (
      <>
        <Loader2 size={14} className="animate-spin" />
        {loadingLabel}
      </>
    );
  }

  return (
    <>
      <Sparkles size={14} />
      {label}
    </>
  );
}

function isMorePicksLoading(isFetchingMore: boolean, morePicksStatus?: string | null) {
  return isFetchingMore || morePicksStatus === 'pending' || morePicksStatus === 'processing';
}

function getMorePicksViewState({
  isFetchingMore,
  morePicksStatus,
  morePicksTimedOut,
  noMorePicks,
}: {
  isFetchingMore: boolean;
  morePicksStatus?: string | null;
  morePicksTimedOut?: boolean;
  noMorePicks: boolean;
}): MorePicksViewState {
  const orderedStates: [boolean, MorePicksViewState][] = [
    [noMorePicks, 'hidden'],
    [morePicksStatus === 'completed', 'completed'],
    [Boolean(morePicksTimedOut), 'stalled'],
    [isMorePicksLoading(isFetchingMore, morePicksStatus), 'loading'],
  ];

  return orderedStates.find(([matches]) => matches)?.[1] ?? 'ready';
}

function MorePicksStalledMessage({ label }: { label: string }) {
  return (
    <div className="mt-5 flex justify-center">
      <p className="text-sm" style={{ color: 'var(--pc-t4)', fontStyle: 'italic' }}>
        {label}
      </p>
    </div>
  );
}

function MorePicksButton({
  isLoading,
  label,
  loadingLabel,
  onMorePicks,
}: {
  isLoading: boolean;
  label: string;
  loadingLabel: string;
  onMorePicks: () => Promise<void>;
}) {
  const buttonStyle = {
    background: `linear-gradient(135deg, ${palette.teal}22, ${palette.blue}22)`,
    border: `1px solid ${palette.teal}55`,
    color: palette.teal,
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: isLoading ? 'wait' : 'pointer',
    opacity: isLoading ? 0.7 : 1,
  };

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => void onMorePicks()}
        disabled={isLoading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-colors duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
        style={buttonStyle}
      >
        <MorePicksButtonContent isLoading={isLoading} label={label} loadingLabel={loadingLabel} />
      </button>
    </div>
  );
}

function getMorePicksLensOptions(results: ReturnType<typeof useLanguage>['t']['results']) {
  return [
    { value: 'popular' as const, label: results.morePicksLensPopular },
    { value: 'cozier' as const, label: results.morePicksLensCozier },
    { value: 'bolder' as const, label: results.morePicksLensBolder },
    { value: 'shorter' as const, label: results.morePicksLensShorter },
  ];
}

function MorePicksCompletedMessage({ label }: { label: string }) {
  return (
    <div
      className="mt-5 rounded-2xl px-4 py-3 text-sm"
      style={{
        background: 'var(--pc-ghost)',
        border: '1px solid var(--pc-bd2)',
        color: 'var(--pc-t3)',
      }}
    >
      {label}
    </div>
  );
}

function getSelectedMorePicksLens(
  lensOptions: ReturnType<typeof getMorePicksLensOptions>,
  lens: MorePicksLens,
) {
  return lensOptions.find((option) => option.value === lens) ?? lensOptions[0];
}

function getMorePicksStaticContent(
  viewState: MorePicksViewState,
  results: ReturnType<typeof useLanguage>['t']['results'],
) {
  const staticContent = {
    completed: <MorePicksCompletedMessage label={results.morePicksCompleted} />,
    hidden: null,
    stalled: <MorePicksStalledMessage label={results.morePicksStalled} />,
  };

  return viewState in staticContent
    ? staticContent[viewState as keyof typeof staticContent]
    : undefined;
}

function MorePicksControl({
  isFetchingMore,
  morePicksStatus,
  morePicksTimedOut,
  noMorePicks,
  onMorePicks,
  results,
}: {
  isFetchingMore: boolean;
  morePicksStatus?: string | null;
  morePicksTimedOut?: boolean;
  noMorePicks: boolean;
  onMorePicks: () => Promise<void>;
  results: ReturnType<typeof useLanguage>['t']['results'];
}) {
  const [lens, setLens] = useState<MorePicksLens>('popular');
  const viewState = getMorePicksViewState({
    isFetchingMore,
    morePicksStatus,
    morePicksTimedOut,
    noMorePicks,
  });
  const staticContent = getMorePicksStaticContent(viewState, results);

  if (staticContent !== undefined) return staticContent;

  const lensOptions = getMorePicksLensOptions(results);
  const selectedLens = getSelectedMorePicksLens(lensOptions, lens);
  const buttonLabel = results.morePicksButton.replace('{lens}', selectedLens.label);

  return (
    <div
      className="mt-5 rounded-2xl p-4"
      style={{
        background: 'var(--pc-ghost)',
        border: '1px solid var(--pc-bd2)',
      }}
    >
      <div className="flex flex-col gap-4">
        <div>
          <p
            className="uppercase tracking-widest"
            style={{ color: 'var(--pc-t2)', fontSize: '0.68rem' }}
          >
            {results.morePicksTitle}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--pc-t4)' }}>
            {results.morePicksHint}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lensOptions.map((option) => {
            const isSelected = option.value === lens;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setLens(option.value)}
                aria-pressed={isSelected}
                disabled={viewState === 'loading'}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)] disabled:opacity-60"
                style={{
                  background: isSelected ? 'var(--pc-gold-subtle)' : 'transparent',
                  border: '1px solid var(--pc-bd2)',
                  color: isSelected ? 'var(--pc-gold-text)' : 'var(--pc-t3)',
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <MorePicksButton
          isLoading={viewState === 'loading'}
          label={buttonLabel}
          loadingLabel={results.morePicksLoading}
          onMorePicks={onMorePicks}
        />
      </div>
    </div>
  );
}

export function TmdbSuggestionsSection({
  activeSuggestion,
  isFetchingMore,
  isGroupResult,
  morePicksStatus,
  morePicksTimedOut,
  movies,
  noMorePicks,
  onMorePicks,
  onToggleSuggestion,
  tmdbCarouselRef,
}: {
  activeSuggestion: number | null;
  isFetchingMore: boolean;
  isGroupResult: boolean;
  morePicksStatus?: string | null;
  morePicksTimedOut?: boolean;
  movies: MovieRecommendation[];
  noMorePicks: boolean;
  onMorePicks: () => Promise<void>;
  onToggleSuggestion: (id: number) => void;
  tmdbCarouselRef: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.45 }}
      className="mt-8"
    >
      <div className="mb-4">
        <SuggestionSectionTitle
          label={t.results.foundOnTmdb}
          gradient={`linear-gradient(180deg, ${palette.teal}, ${palette.blue})`}
        />
      </div>

      <TmdbMovies
        activeSuggestion={activeSuggestion}
        carouselRef={tmdbCarouselRef}
        isGroupResult={isGroupResult}
        movies={movies}
        onToggleSuggestion={onToggleSuggestion}
      />

      <MorePicksControl
        isFetchingMore={isFetchingMore}
        morePicksStatus={morePicksStatus}
        morePicksTimedOut={morePicksTimedOut}
        noMorePicks={noMorePicks}
        onMorePicks={onMorePicks}
        results={t.results}
      />
    </motion.div>
  );
}

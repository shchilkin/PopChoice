'use client';

import { ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type RefObject } from 'react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import { ExpandedSuggestion } from './ExpandedSuggestion';
import { SmallSuggestionCard } from './SmallSuggestionCard';

import type { MovieRecommendation } from '@/utils/client';

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
}: {
  activeSuggestion: number | null;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  carouselRef: RefObject<HTMLDivElement | null>;
  isGroupResult: boolean;
  movies: MovieRecommendation[];
  onScroll: () => void;
  onScrollCarousel: (direction: 'left' | 'right') => void;
  onToggleSuggestion: (id: number) => void;
}) {
  const { t } = useLanguage();
  const selectedMovie = activeSuggestion
    ? movies.find((movie) => movie.id === activeSuggestion)
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-5 rounded-full"
            style={{
              background: `linear-gradient(180deg, ${palette.purple}, ${palette.teal})`,
            }}
          />
          <span className="uppercase tracking-widest text-xs" style={{ color: 'var(--pc-t2)' }}>
            {t.results.foundInDb}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onScrollCarousel('left')}
            disabled={!canScrollLeft}
            aria-label={t.results.scrollLeft}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: canScrollLeft ? 'var(--pc-bd2)' : 'var(--pc-bd1)',
              border: '1px solid var(--pc-bd2)',
              color: canScrollLeft ? 'var(--pc-t1)' : 'var(--pc-t4)',
              cursor: canScrollLeft ? 'pointer' : 'not-allowed',
            }}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => onScrollCarousel('right')}
            disabled={!canScrollRight}
            aria-label={t.results.scrollRight}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: canScrollRight ? 'var(--pc-bd2)' : 'var(--pc-bd1)',
              border: '1px solid var(--pc-bd2)',
              color: canScrollRight ? 'var(--pc-t1)' : 'var(--pc-t4)',
              cursor: canScrollRight ? 'pointer' : 'not-allowed',
            }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="relative">
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
        <div
          className="absolute left-0 top-0 bottom-4 w-6 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, var(--pc-bg), transparent)',
            opacity: canScrollLeft ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-4 w-10 pointer-events-none"
          style={{
            background: 'linear-gradient(to left, var(--pc-bg), transparent)',
            opacity: canScrollRight ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />
      </div>

      <div className="flex justify-center gap-1.5 mt-2">
        {movies.map((movie) => (
          <button
            key={movie.id}
            type="button"
            onClick={() => onToggleSuggestion(movie.id)}
            aria-label={t.results.showDetails.replace('{name}', movie.localizedName ?? movie.name)}
            aria-pressed={activeSuggestion === movie.id}
            className="rounded-full transition-all duration-200"
            style={{
              width: activeSuggestion === movie.id ? 16 : 6,
              height: 6,
              background:
                activeSuggestion === movie.id
                  ? `linear-gradient(90deg, ${palette.gold}, ${palette.amber})`
                  : 'var(--pc-bd3)',
            }}
          />
        ))}
      </div>

      <AnimatePresence>
        {selectedMovie && (
          <ExpandedSuggestion
            key={activeSuggestion}
            movie={selectedMovie}
            isGroup={isGroupResult}
          />
        )}
      </AnimatePresence>
    </motion.div>
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
  const selectedMovie = activeSuggestion
    ? movies.find((movie) => movie.id === activeSuggestion)
    : undefined;
  const isLoading =
    isFetchingMore || morePicksStatus === 'pending' || morePicksStatus === 'processing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.45 }}
      className="mt-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-1.5 h-5 rounded-full"
          style={{ background: `linear-gradient(180deg, ${palette.teal}, ${palette.blue})` }}
        />
        <span className="uppercase tracking-widest text-xs" style={{ color: 'var(--pc-t2)' }}>
          {t.results.foundOnTmdb}
        </span>
      </div>

      {movies.length > 0 && (
        <>
          <div ref={tmdbCarouselRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {movies.map((movie) => (
              <SmallSuggestionCard
                key={movie.id}
                movie={movie}
                active={activeSuggestion === movie.id}
                onClick={() => onToggleSuggestion(movie.id)}
              />
            ))}
          </div>

          <AnimatePresence>
            {selectedMovie && (
              <ExpandedSuggestion
                key={activeSuggestion}
                movie={selectedMovie}
                isGroup={isGroupResult}
              />
            )}
          </AnimatePresence>
        </>
      )}

      {!noMorePicks && morePicksStatus !== 'completed' && (
        <div className="mt-5 flex justify-center">
          {morePicksTimedOut ? (
            <p className="text-sm" style={{ color: 'var(--pc-t4)', fontStyle: 'italic' }}>
              {t.results.morePicksStalled}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void onMorePicks()}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-200 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${palette.teal}22, ${palette.blue}22)`,
                border: `1px solid ${palette.teal}55`,
                color: palette.teal,
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t.results.morePicksLoading}
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  {t.results.morePicksButton}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

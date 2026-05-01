'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, RotateCcw, Sparkles, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/i18n';
import { getCsrfToken } from '@/lib/csrfClient';
import { palette } from '@/styles/designTokens';
import { enhanceMoviesWithPosters, type MovieRecommendation } from '@/utils/client';

import { ExpandedSuggestion, MainMovieCard, SmallSuggestionCard } from '../components';

import type { RecommendationWithMovies } from '@/lib/db/recommendations';

// ---------------------------------------------------------------------------
// Polling hook
// ---------------------------------------------------------------------------

function useRecommendation(id: string) {
  return useQuery<RecommendationWithMovies>({
    queryKey: ['recommendation', id],
    queryFn: async () => {
      const res = await fetch(`/api/recommendations/${id}`, {
        headers: {
          'X-CSRF-Token': getCsrfToken(),
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json() as Promise<RecommendationWithMovies>;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return 2000;
    },
    staleTime: Infinity,
    retry: 3,
  });
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

function LoadingState() {
  const { t } = useLanguage();
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="text-4xl mb-4">🎬</div>
        <p style={{ color: 'var(--pc-t2)' }}>{t.results.loading}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error / failed state
// ---------------------------------------------------------------------------

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-5">
      <div className="text-4xl mb-4">😕</div>
      <h2
        className="mb-2"
        style={{
          fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
          fontWeight: '600',
          textTransform: 'uppercase',
          fontSize: '1.8rem',
          color: 'var(--pc-t1)',
        }}
      >
        {t.results.noResultsTitle}
      </h2>
      <p className="mb-6" style={{ color: 'var(--pc-t3)', fontSize: '0.9rem' }}>
        {t.results.noResultsHint}
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-3 rounded-2xl"
        style={{
          background: 'var(--pc-cta)',
          color: 'var(--pc-cta-text)',
          fontWeight: 700,
        }}
      >
        {t.results.tryAgain}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results view (shared with /results/page.tsx layout)
// ---------------------------------------------------------------------------

function ResultsView({
  movies,
  usedBroaderSearch,
  dbMovieCount,
  quizData,
}: {
  movies: MovieRecommendation[];
  usedBroaderSearch: boolean;
  dbMovieCount?: number;
  quizData?: unknown;
}) {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [noMorePicks, setNoMorePicks] = useState(false);
  const [extraMovies, setExtraMovies] = useState<MovieRecommendation[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const tmdbCarouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const allMovies = [...movies, ...extraMovies];
  const mainMovie = allMovies.find((m) => m.isMainRecommendation) || allMovies[0];
  const otherMovies = allMovies.filter((m) => m !== mainMovie);
  const localOtherMovies = otherMovies.filter((m) => !m.fromTMDB);
  const tmdbOtherMovies = otherMovies.filter((m) => m.fromTMDB);

  const scrollCarousel = useCallback((dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({
      left: dir === 'left' ? -240 : 240,
      behavior: 'smooth',
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
  }, []);

  useEffect(() => {
    if (movies.length === 0) return;
    const raf = requestAnimationFrame(handleScroll);
    window.addEventListener('resize', handleScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleScroll);
    };
  }, [movies, handleScroll]);

  useEffect(() => {
    if (movies.length === 0) return;
    const raf = requestAnimationFrame(handleScroll);
    const onResize = () => handleScroll();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [movies, handleScroll]);

  function toggleSuggestion(id: number) {
    setActiveSuggestion((prev) => (prev === id ? null : id));
  }

  const handleMorePicks = useCallback(async () => {
    if (isFetchingMore || !quizData) return;
    setIsFetchingMore(true);
    try {
      const currentTmdbIds = tmdbOtherMovies.map((m) => m.id);
      const res = await fetch('/api/more-tmdb-picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': locale,
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({
          quizData,
          page: 2,
          excludeIds: currentTmdbIds,
        }),
      });

      if (!res.ok) {
        if (res.status !== 429) setNoMorePicks(true);
        return;
      }

      const data = (await res.json()) as {
        movies: {
          id: number;
          name: string;
          year: number;
          similarity: number;
          age_rating?: string;
          duration?: number;
          score_rating?: number;
          posterURL?: string;
          aiDescription?: string;
          fromTMDB: boolean;
        }[];
      };

      if (!data.movies || data.movies.length === 0) {
        setNoMorePicks(true);
        return;
      }

      const newMovies: MovieRecommendation[] = data.movies.map((m) => ({
        id: m.id,
        name: m.name,
        year: m.year,
        similarity: m.similarity,
        age_rating: m.age_rating,
        duration: m.duration,
        score_rating: m.score_rating,
        posterURL: m.posterURL,
        description: m.aiDescription,
        fromTMDB: true,
      }));

      setExtraMovies((prev) => [...prev, ...newMovies]);
      setNoMorePicks(true);
      requestAnimationFrame(() => {
        if (tmdbCarouselRef.current) {
          tmdbCarouselRef.current.scrollTo({
            left: tmdbCarouselRef.current.scrollWidth,
            behavior: 'smooth',
          });
        }
      });
    } catch {
      setNoMorePicks(true);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, locale, quizData, tmdbOtherMovies]);

  if (!mainMovie) return null;

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs mb-4 uppercase tracking-widest"
          style={{
            background: 'var(--pc-gold-subtle)',
            border: '1px solid',
            borderColor: 'var(--pc-gold-bd-subtle)',
            color: 'var(--pc-gold-text)',
          }}
        >
          <Sparkles size={11} /> {t.results.badge}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
            lineHeight: 1.1,
          }}
        >
          {t.results.title}
        </h1>
        <p className="mt-2" style={{ color: 'var(--pc-t3)', fontSize: '0.88rem' }}>
          {t.results.subtitle.replace(
            '{count}',
            dbMovieCount !== null && dbMovieCount !== undefined
              ? new Intl.NumberFormat(locale).format(dbMovieCount)
              : '…',
          )}
        </p>
      </motion.div>

      {/* Broader search indicator */}
      {usedBroaderSearch && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs"
          style={{
            background: 'var(--pc-ghost)',
            border: '1px solid var(--pc-bd2)',
            color: 'var(--pc-t3)',
          }}
        >
          <Sparkles size={11} />
          {t.results.broaderSearch}
        </motion.div>
      )}

      {/* Main recommendation */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-1.5 h-5 rounded-full"
            style={{
              background: 'linear-gradient(180deg, var(--pc-gold), var(--pc-amber))',
            }}
          />
          <span
            className="uppercase tracking-widest text-xs"
            style={{ color: 'var(--pc-gold-text)' }}
          >
            {t.results.topPick}
          </span>
        </div>
        <MainMovieCard movie={mainMovie} />
      </div>

      {/* Additional suggestions — local DB */}
      {localOtherMovies.length > 0 && (
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
                onClick={() => scrollCarousel('left')}
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
                onClick={() => scrollCarousel('right')}
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
              onScroll={handleScroll}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
            >
              {localOtherMovies.map((movie) => (
                <SmallSuggestionCard
                  key={movie.id}
                  movie={movie}
                  active={activeSuggestion === movie.id}
                  onClick={() => toggleSuggestion(movie.id)}
                />
              ))}
            </div>
            {/* Fade edges */}
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

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-2">
            {localOtherMovies.map((movie) => (
              <button
                key={movie.id}
                onClick={() => toggleSuggestion(movie.id)}
                aria-label={t.results.showDetails.replace(
                  '{name}',
                  movie.localizedName ?? movie.name,
                )}
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
            {activeSuggestion !== null &&
              localOtherMovies.some((m) => m.id === activeSuggestion) && (
                <ExpandedSuggestion
                  key={activeSuggestion}
                  movie={localOtherMovies.find((m) => m.id === activeSuggestion)!}
                />
              )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Additional suggestions — from TMDB */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45 }}
        className="mt-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-1.5 h-5 rounded-full"
            style={{
              background: `linear-gradient(180deg, ${palette.teal}, ${palette.blue})`,
            }}
          />
          <span className="uppercase tracking-widest text-xs" style={{ color: 'var(--pc-t2)' }}>
            {t.results.foundOnTmdb}
          </span>
        </div>

        {tmdbOtherMovies.length > 0 && (
          <>
            <div ref={tmdbCarouselRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {tmdbOtherMovies.map((movie) => (
                <SmallSuggestionCard
                  key={movie.id}
                  movie={movie}
                  active={activeSuggestion === movie.id}
                  onClick={() => toggleSuggestion(movie.id)}
                />
              ))}
            </div>

            <AnimatePresence>
              {activeSuggestion !== null &&
                tmdbOtherMovies.some((m) => m.id === activeSuggestion) && (
                  <ExpandedSuggestion
                    key={activeSuggestion}
                    movie={tmdbOtherMovies.find((m) => m.id === activeSuggestion)!}
                  />
                )}
            </AnimatePresence>
          </>
        )}

        {/* More picks button */}
        {!noMorePicks && (
          <div className="mt-5 flex justify-center">
            <button
              onClick={() => void handleMorePicks()}
              disabled={isFetchingMore}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-200 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${palette.teal}22, ${palette.blue}22)`,
                border: `1px solid ${palette.teal}55`,
                color: palette.teal,
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: isFetchingMore ? 'wait' : 'pointer',
                opacity: isFetchingMore ? 0.7 : 1,
              }}
            >
              {isFetchingMore ? (
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
          </div>
        )}
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <button
          onClick={() => router.push('/quiz')}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--pc-ghost)',
            border: '1px solid var(--pc-bd2)',
            color: 'var(--pc-t2)',
            fontSize: '0.9rem',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--pc-t1)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--pc-bd4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--pc-t2)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--pc-bd2)';
          }}
        >
          <RotateCcw size={15} /> {t.results.tryAgain}
        </button>

        <button
          onClick={() => router.push('/quiz')}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-200 active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${palette.purple}, #6D28D9)`,
            color: '#F8F8FF',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <Users size={15} /> {t.results.tryWithFriends}
        </button>
      </motion.div>

      <p className="mt-8 text-center" style={{ color: 'var(--pc-t5)', fontSize: '0.72rem' }}>
        {t.results.disclaimer}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function ResultsIdPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const { data, isError } = useRecommendation(id);

  // Map DB movies to MovieRecommendation format + optionally enhance missing posters
  const [movies, setMovies] = useState<MovieRecommendation[]>([]);
  const [moviesReady, setMoviesReady] = useState(false);

  useEffect(() => {
    if (data?.status !== 'completed' || !data.movies || moviesReady) return;

    const movies = data.movies;

    async function prepareMovies() {
      const mapped: MovieRecommendation[] = movies.map((m) => ({
        id: m.id,
        name: m.name,
        year: m.year,
        similarity: m.similarity ?? 0,
        age_rating: m.age_rating,
        duration: m.duration,
        score_rating: m.score_rating,
        posterURL: m.posterURL,
        description: m.aiDescription,
        localizedName: m.localizedName,
        isMainRecommendation: m.isMainRecommendation,
        fromTMDB: m.fromTMDB,
      }));

      const needPosters = mapped.filter((m) => !m.posterURL);
      if (needPosters.length > 0) {
        const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        try {
          const enhanced = await enhanceMoviesWithPosters(needPosters, tmdbApiKey);
          const final = mapped.map((m) => enhanced.find((em) => em.id === m.id) || m);
          setMovies(final);
        } catch {
          setMovies(mapped);
        }
      } else {
        setMovies(mapped);
      }
      setMoviesReady(true);
    }

    void prepareMovies();
  }, [data, moviesReady]);

  if (!id) {
    router.replace('/quiz');
    return null;
  }

  const status = data?.status;

  if (isError || status === 'failed') {
    return <ErrorState onRetry={() => router.push('/quiz')} />;
  }

  if (!data || status === 'pending' || status === 'processing' || !moviesReady) {
    return <LoadingState />;
  }

  return (
    <ResultsView
      movies={movies}
      usedBroaderSearch={data.usedBroaderSearch ?? false}
      dbMovieCount={data.dbMovieCount}
      quizData={undefined}
    />
  );
}

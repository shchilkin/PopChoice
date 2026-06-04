'use client';

import { RotateCcw, Sparkles, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/i18n';
import { getCsrfToken } from '@/lib/csrfClient';
import { navigateToFreshQuiz } from '@/lib/quizNavigation';
import { palette } from '@/styles/designTokens';
import { type MovieRecommendation } from '@/utils/client';

import {
  GroupMatchBrief,
  LocalSuggestionsSection,
  MainMovieCard,
  RecommendationFeedbackPanel,
  ResultsHeader,
  TmdbSuggestionsSection,
  type FeedbackKind,
  type FeedbackState,
  type ShareState,
} from '../components';

import type { GroupResultInsights } from '@/features/recommendation/groupResultInsights';

export function RecommendationResultsView({
  movies,
  usedBroaderSearch,
  dbMovieCount,
  peopleCount = 1,
  hasActorSignal = false,
  groupInsights,
  recommendationSlug,
  morePicksStatus,
  morePicksTimedOut,
  viewerCanRate = false,
  isSharedResult = false,
  onMorePicksRequested,
}: {
  movies: MovieRecommendation[];
  usedBroaderSearch: boolean;
  dbMovieCount?: number;
  peopleCount?: number;
  hasActorSignal?: boolean;
  groupInsights?: GroupResultInsights | null;
  recommendationSlug?: string;
  morePicksStatus?: string | null;
  morePicksTimedOut?: boolean;
  viewerCanRate?: boolean;
  isSharedResult?: boolean;
  onMorePicksRequested?: () => Promise<unknown>;
}) {
  const { t, locale } = useLanguage();
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [noMorePicks, setNoMorePicks] = useState(false);
  const [shareState, setShareState] = useState<ShareState>('idle');
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackKind | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const tmdbCarouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const mainMovie = movies.find((movie) => movie.isMainRecommendation) || movies[0];
  const isDuoResult = peopleCount === 2;
  const isGroupResult = peopleCount > 1;
  const otherMovies = movies.filter((movie) => movie !== mainMovie);
  const localOtherMovies = otherMovies.filter((movie) => !movie.fromTMDB);
  const tmdbOtherMovies = otherMovies.filter((movie) => movie.fromTMDB);

  const scrollCarousel = useCallback((direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -240 : 240,
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
    const frame = requestAnimationFrame(handleScroll);
    window.addEventListener('resize', handleScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleScroll);
    };
  }, [movies, handleScroll]);

  const toggleSuggestion = useCallback((id: number) => {
    setActiveSuggestion((current) => (current === id ? null : id));
  }, []);

  const handleMorePicks = useCallback(async () => {
    if (isFetchingMore || !recommendationSlug) return;
    setIsFetchingMore(true);
    try {
      const res = await fetch(`/api/recommendations/${recommendationSlug}/more-picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
      });

      if (res.ok) {
        await onMorePicksRequested?.();
      } else if (res.status === 409) {
        setNoMorePicks(true);
      }
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, recommendationSlug, onMorePicksRequested]);

  if (!mainMovie) return null;

  const mainMovieName = mainMovie.localizedName ?? mainMovie.name;
  const soloDecisionNote = hasActorSignal
    ? t.results.soloDecisionNoteWithActor
    : t.results.soloDecisionNote;
  const audienceBadge = isDuoResult
    ? t.results.duoBadge
    : isGroupResult
      ? t.results.groupBadge
      : t.results.badge;
  const audienceTitle = isDuoResult
    ? t.results.duoTitle
    : isGroupResult
      ? t.results.groupTitle
      : t.results.title;
  const audienceSubtitle = isDuoResult
    ? t.results.duoSubtitle
    : isGroupResult
      ? t.results.groupSubtitle
      : t.results.subtitle;
  const decisionNote = (
    isDuoResult
      ? t.results.duoDecisionNote
      : isGroupResult
        ? t.results.groupDecisionNote
        : soloDecisionNote
  )
    .replace('{name}', mainMovieName)
    .replace('{people}', new Intl.NumberFormat(locale).format(peopleCount));

  const handleShare = async () => {
    const url = window.location.href;
    const title = t.results.shareTitle.replace('{name}', mainMovieName);
    const text = t.results.shareText.replace('{name}', mainMovieName);

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 2200);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      await navigator.clipboard.writeText(url);
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 2200);
    }
  };

  const handleFeedback = async (kind: FeedbackKind) => {
    if (!recommendationSlug || !viewerCanRate || feedbackState === 'saving') return;
    setSelectedFeedback(kind);
    setFeedbackState('saving');

    try {
      const res = await fetch(`/api/recommendations/${recommendationSlug}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ kind }),
      });

      setFeedbackState(res.ok ? 'saved' : 'error');
    } catch {
      setFeedbackState('error');
    }
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto w-full">
      <ResultsHeader
        audienceBadge={audienceBadge}
        audienceTitle={audienceTitle}
        audienceSubtitle={audienceSubtitle}
        dbMovieCount={dbMovieCount}
        decisionNote={decisionNote}
        isGroupResult={isGroupResult}
        isSharedResult={isSharedResult}
        onShare={handleShare}
        peopleCount={peopleCount}
        shareState={shareState}
        usedBroaderSearch={usedBroaderSearch}
      />

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

      {isGroupResult && groupInsights && <GroupMatchBrief insights={groupInsights} />}

      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-1.5 h-5 rounded-full"
            style={{ background: 'linear-gradient(180deg, var(--pc-gold), var(--pc-amber))' }}
          />
          <span
            className="uppercase tracking-widest text-xs"
            style={{ color: 'var(--pc-gold-text)' }}
          >
            {t.results.topPick}
          </span>
        </div>
        <MainMovieCard movie={mainMovie} isGroup={isGroupResult} />
      </div>

      <RecommendationFeedbackPanel
        feedbackState={feedbackState}
        isSharedResult={isSharedResult}
        onFeedback={handleFeedback}
        recommendationSlug={recommendationSlug}
        selectedFeedback={selectedFeedback}
        viewerCanRate={viewerCanRate}
      />

      {localOtherMovies.length > 0 && (
        <LocalSuggestionsSection
          activeSuggestion={activeSuggestion}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          carouselRef={carouselRef}
          isGroupResult={isGroupResult}
          movies={localOtherMovies}
          onScroll={handleScroll}
          onScrollCarousel={scrollCarousel}
          onToggleSuggestion={toggleSuggestion}
        />
      )}

      <TmdbSuggestionsSection
        activeSuggestion={activeSuggestion}
        isFetchingMore={isFetchingMore}
        isGroupResult={isGroupResult}
        morePicksStatus={morePicksStatus}
        morePicksTimedOut={morePicksTimedOut}
        movies={tmdbOtherMovies}
        noMorePicks={noMorePicks}
        onMorePicks={handleMorePicks}
        onToggleSuggestion={toggleSuggestion}
        tmdbCarouselRef={tmdbCarouselRef}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <button
          onClick={navigateToFreshQuiz}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--pc-ghost)',
            border: '1px solid var(--pc-bd2)',
            color: 'var(--pc-t2)',
            fontSize: '0.9rem',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.color = 'var(--pc-t1)';
            event.currentTarget.style.borderColor = 'var(--pc-bd4)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.color = 'var(--pc-t2)';
            event.currentTarget.style.borderColor = 'var(--pc-bd2)';
          }}
        >
          <RotateCcw size={15} /> {t.results.tryAgain}
        </button>

        <button
          onClick={navigateToFreshQuiz}
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

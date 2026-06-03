'use client';

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Frown,
  Lightbulb,
  Loader2,
  RotateCcw,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/i18n';
import { getCsrfToken } from '@/lib/csrfClient';
import { navigateToFreshQuiz } from '@/lib/quizNavigation';
import { palette } from '@/styles/designTokens';
import { type MovieRecommendation } from '@/utils/client';

import {
  ExpandedSuggestion,
  GroupMatchBrief,
  MainMovieCard,
  SmallSuggestionCard,
} from '../components';

import type { GroupResultInsights } from '@/features/recommendation/groupResultInsights';

type FeedbackKind =
  | 'useful'
  | 'already_watched'
  | 'wrong_mood'
  | 'too_obvious'
  | 'too_obscure'
  | 'close';

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
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const [feedbackState, setFeedbackState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
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

  const feedbackOptions: {
    kind: FeedbackKind;
    label: string;
    icon: typeof Check;
  }[] = [
    { kind: 'useful', label: t.results.feedbackUseful, icon: Check },
    { kind: 'already_watched', label: t.results.feedbackSeen, icon: Eye },
    { kind: 'wrong_mood', label: t.results.feedbackWrongMood, icon: Frown },
    { kind: 'too_obvious', label: t.results.feedbackTooObvious, icon: Lightbulb },
    { kind: 'too_obscure', label: t.results.feedbackTooObscure, icon: Sparkles },
    { kind: 'close', label: t.results.feedbackClose, icon: RotateCcw },
  ];

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto w-full">
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
          {isGroupResult ? <Users size={11} /> : <Sparkles size={11} />}
          {audienceBadge}
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
          {audienceTitle}
        </h1>
        <p className="mt-2" style={{ color: 'var(--pc-t3)', fontSize: '0.88rem' }}>
          {audienceSubtitle
            .replace('{people}', new Intl.NumberFormat(locale).format(peopleCount))
            .replace(
              '{count}',
              dbMovieCount !== null && dbMovieCount !== undefined
                ? new Intl.NumberFormat(locale).format(dbMovieCount)
                : '…',
            )}
        </p>
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-200 active:scale-95"
            style={{
              background: 'var(--pc-ghost)',
              border: '1px solid var(--pc-bd2)',
              color: shareState === 'copied' ? 'var(--pc-gold-text)' : 'var(--pc-t2)',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            {shareState === 'copied' ? <Check size={13} /> : <Share2 size={13} />}
            {shareState === 'copied' ? t.results.shareCopied : t.results.shareResult}
          </button>
        </div>
        {isSharedResult && (
          <div className="mt-3 flex justify-center">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                background: 'var(--pc-ghost)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t3)',
              }}
            >
              <Share2 size={12} />
              {t.results.sharedResultNotice}
            </div>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="mx-auto mt-5 max-w-xl rounded-2xl px-4 py-3 text-left"
          style={{
            background: 'var(--pc-ghost)',
            border: '1px solid var(--pc-bd2)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{
                background: 'var(--pc-gold-subtle)',
                color: 'var(--pc-gold-text)',
              }}
            >
              {isGroupResult ? <Users size={14} /> : <Sparkles size={14} />}
            </div>
            <div>
              <div
                className="uppercase tracking-widest"
                style={{ color: 'var(--pc-gold-text)', fontSize: '0.62rem' }}
              >
                {t.results.decisionNoteLabel}
              </div>
              <p
                className="mt-1"
                style={{ color: 'var(--pc-t2)', fontSize: '0.86rem', lineHeight: 1.6 }}
              >
                {decisionNote}
              </p>
              {usedBroaderSearch && (
                <p
                  className="mt-2"
                  style={{ color: 'var(--pc-t4)', fontSize: '0.76rem', lineHeight: 1.55 }}
                >
                  {t.results.expandedDecisionNote}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

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

      {viewerCanRate ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-10 rounded-2xl px-4 py-4"
          style={{
            background: 'var(--pc-ghost)',
            border: '1px solid var(--pc-bd2)',
          }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p
                className="uppercase tracking-widest"
                style={{ color: 'var(--pc-gold-text)', fontSize: '0.68rem' }}
              >
                {t.results.feedbackPrompt}
              </p>
              <p className="mt-1" style={{ color: 'var(--pc-t4)', fontSize: '0.78rem' }}>
                {feedbackState === 'saved'
                  ? t.results.feedbackThanks
                  : feedbackState === 'error'
                    ? t.results.feedbackError
                    : t.results.feedbackHint}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {feedbackOptions.map(({ kind, label, icon: Icon }) => {
                const isSelected = selectedFeedback === kind;
                const isBusy = feedbackState === 'saving' && isSelected;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => void handleFeedback(kind)}
                    disabled={feedbackState === 'saving' || !recommendationSlug}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200 active:scale-95"
                    style={{
                      background: isSelected ? 'var(--pc-gold-subtle)' : 'transparent',
                      border: '1px solid var(--pc-bd2)',
                      color: isSelected ? 'var(--pc-gold-text)' : 'var(--pc-t3)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor:
                        feedbackState === 'saving' || !recommendationSlug ? 'wait' : 'pointer',
                    }}
                  >
                    {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      ) : isSharedResult ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-10 rounded-2xl px-4 py-4 text-center"
          style={{
            background: 'var(--pc-ghost)',
            border: '1px solid var(--pc-bd2)',
            color: 'var(--pc-t4)',
            fontSize: '0.78rem',
          }}
        >
          {t.results.sharedFeedbackHint}
        </motion.div>
      ) : null}

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
              localOtherMovies.some((movie) => movie.id === activeSuggestion) && (
                <ExpandedSuggestion
                  key={activeSuggestion}
                  movie={localOtherMovies.find((movie) => movie.id === activeSuggestion)!}
                  isGroup={isGroupResult}
                />
              )}
          </AnimatePresence>
        </motion.div>
      )}

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
                tmdbOtherMovies.some((movie) => movie.id === activeSuggestion) && (
                  <ExpandedSuggestion
                    key={activeSuggestion}
                    movie={tmdbOtherMovies.find((movie) => movie.id === activeSuggestion)!}
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
                onClick={() => void handleMorePicks()}
                disabled={
                  isFetchingMore ||
                  morePicksStatus === 'pending' ||
                  morePicksStatus === 'processing'
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-200 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${palette.teal}22, ${palette.blue}22)`,
                  border: `1px solid ${palette.teal}55`,
                  color: palette.teal,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor:
                    isFetchingMore ||
                    morePicksStatus === 'pending' ||
                    morePicksStatus === 'processing'
                      ? 'wait'
                      : 'pointer',
                  opacity:
                    isFetchingMore ||
                    morePicksStatus === 'pending' ||
                    morePicksStatus === 'processing'
                      ? 0.7
                      : 1,
                }}
              >
                {isFetchingMore ||
                morePicksStatus === 'pending' ||
                morePicksStatus === 'processing' ? (
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

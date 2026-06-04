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
  type LocalSuggestionsSectionProps,
  type ShareState,
} from '../components';

import type { GroupResultInsights } from '@/features/recommendation/groupResultInsights';

type ResultsCopy = ReturnType<typeof useLanguage>['t']['results'];

type AudienceCopy = {
  badge: string;
  title: string;
  subtitle: string;
  decisionNoteTemplate: string;
};

type MorePicksResult = 'requested' | 'empty' | 'ignored';

function getAudienceCopy({
  hasActorSignal,
  isDuoResult,
  isGroupResult,
  results,
}: {
  hasActorSignal: boolean;
  isDuoResult: boolean;
  isGroupResult: boolean;
  results: ResultsCopy;
}): AudienceCopy {
  if (isDuoResult) {
    return {
      badge: results.duoBadge,
      title: results.duoTitle,
      subtitle: results.duoSubtitle,
      decisionNoteTemplate: results.duoDecisionNote,
    };
  }

  if (isGroupResult) {
    return {
      badge: results.groupBadge,
      title: results.groupTitle,
      subtitle: results.groupSubtitle,
      decisionNoteTemplate: results.groupDecisionNote,
    };
  }

  return {
    badge: results.badge,
    title: results.title,
    subtitle: results.subtitle,
    decisionNoteTemplate: hasActorSignal
      ? results.soloDecisionNoteWithActor
      : results.soloDecisionNote,
  };
}

function formatDecisionNote({
  locale,
  mainMovieName,
  peopleCount,
  template,
}: {
  locale: string;
  mainMovieName: string;
  peopleCount: number;
  template: string;
}) {
  return template
    .replace('{name}', mainMovieName)
    .replace('{people}', new Intl.NumberFormat(locale).format(peopleCount));
}

async function requestMorePicks(recommendationSlug: string): Promise<MorePicksResult> {
  const res = await fetch(`/api/recommendations/${recommendationSlug}/more-picks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCsrfToken(),
    },
  });

  if (res.ok) return 'requested';
  if (res.status === 409) return 'empty';
  return 'ignored';
}

function getMorePicksSlug(isFetchingMore: boolean, recommendationSlug?: string) {
  if (isFetchingMore) return null;
  return recommendationSlug ?? null;
}

async function notifyMorePicksRequested(callback?: () => Promise<unknown>) {
  if (!callback) return;
  await callback();
}

async function applyMorePicksResult({
  onMorePicksRequested,
  result,
  setNoMorePicks,
}: {
  onMorePicksRequested?: () => Promise<unknown>;
  result: MorePicksResult;
  setNoMorePicks: (value: boolean) => void;
}) {
  if (result === 'requested') {
    await notifyMorePicksRequested(onMorePicksRequested);
  }
  if (result === 'empty') {
    setNoMorePicks(true);
  }
}

async function requestAndApplyMorePicks({
  onMorePicksRequested,
  recommendationSlug,
  setNoMorePicks,
}: {
  onMorePicksRequested?: () => Promise<unknown>;
  recommendationSlug: string;
  setNoMorePicks: (value: boolean) => void;
}) {
  const result = await requestMorePicks(recommendationSlug);
  await applyMorePicksResult({ onMorePicksRequested, result, setNoMorePicks });
}

async function submitRecommendationFeedback({
  kind,
  recommendationSlug,
}: {
  kind: FeedbackKind;
  recommendationSlug: string;
}) {
  try {
    const res = await fetch(`/api/recommendations/${recommendationSlug}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify({ kind }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

function getFeedbackSubmissionSlug({
  feedbackState,
  recommendationSlug,
  viewerCanRate,
}: {
  feedbackState: FeedbackState;
  recommendationSlug?: string;
  viewerCanRate: boolean;
}) {
  if (!viewerCanRate) return null;
  if (feedbackState === 'saving') return null;
  return recommendationSlug ?? null;
}

function getFeedbackResultState(didSave: boolean): FeedbackState {
  if (didSave) return 'saved';
  return 'error';
}

async function writeShareTarget({
  text,
  title,
  url,
}: {
  text: string;
  title: string;
  url: string;
}) {
  if (navigator.share) {
    await navigator.share({ title, text, url });
    return;
  }

  await navigator.clipboard.writeText(url);
}

async function shareRecommendation({
  mainMovieName,
  results,
}: {
  mainMovieName: string;
  results: ResultsCopy;
}) {
  const url = window.location.href;
  const title = results.shareTitle.replace('{name}', mainMovieName);
  const text = results.shareText.replace('{name}', mainMovieName);

  try {
    await writeShareTarget({ title, text, url });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    await navigator.clipboard.writeText(url);
    return true;
  }
}

function BroaderSearchNotice({ label, show }: { label: string; show: boolean }) {
  if (!show) return null;

  return (
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
      {label}
    </motion.div>
  );
}

function GroupInsightsSection({
  groupInsights,
  isGroupResult,
}: {
  groupInsights?: GroupResultInsights | null;
  isGroupResult: boolean;
}) {
  if (!isGroupResult || !groupInsights) return null;
  return <GroupMatchBrief insights={groupInsights} />;
}

function TopPickSection({
  isGroupResult,
  label,
  movie,
}: {
  isGroupResult: boolean;
  label: string;
  movie: MovieRecommendation;
}) {
  return (
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
          {label}
        </span>
      </div>
      <MainMovieCard movie={movie} isGroup={isGroupResult} />
    </div>
  );
}

function LocalResultsSection(props: LocalSuggestionsSectionProps) {
  if (props.movies.length === 0) return null;

  return <LocalSuggestionsSection {...props} />;
}

function ResultsActions({
  tryAgainLabel,
  tryWithFriendsLabel,
}: {
  tryAgainLabel: string;
  tryWithFriendsLabel: string;
}) {
  return (
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
        <RotateCcw size={15} /> {tryAgainLabel}
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
        <Users size={15} /> {tryWithFriendsLabel}
      </button>
    </motion.div>
  );
}

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
    const slug = getMorePicksSlug(isFetchingMore, recommendationSlug);
    if (!slug) return;
    setIsFetchingMore(true);
    await requestAndApplyMorePicks({
      onMorePicksRequested,
      recommendationSlug: slug,
      setNoMorePicks,
    }).finally(() => setIsFetchingMore(false));
  }, [isFetchingMore, recommendationSlug, onMorePicksRequested]);

  if (!mainMovie) return null;

  const mainMovieName = mainMovie.localizedName ?? mainMovie.name;
  const audienceCopy = getAudienceCopy({
    hasActorSignal,
    isDuoResult,
    isGroupResult,
    results: t.results,
  });
  const decisionNote = formatDecisionNote({
    locale,
    mainMovieName,
    peopleCount,
    template: audienceCopy.decisionNoteTemplate,
  });

  const handleShare = async () => {
    const didShare = await shareRecommendation({ mainMovieName, results: t.results });
    if (!didShare) return;
    setShareState('copied');
    window.setTimeout(() => setShareState('idle'), 2200);
  };

  const handleFeedback = async (kind: FeedbackKind) => {
    const slug = getFeedbackSubmissionSlug({ feedbackState, recommendationSlug, viewerCanRate });
    if (!slug) return;
    setSelectedFeedback(kind);
    setFeedbackState('saving');

    const didSave = await submitRecommendationFeedback({ kind, recommendationSlug: slug });
    setFeedbackState(getFeedbackResultState(didSave));
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto w-full">
      <ResultsHeader
        audienceBadge={audienceCopy.badge}
        audienceTitle={audienceCopy.title}
        audienceSubtitle={audienceCopy.subtitle}
        dbMovieCount={dbMovieCount}
        decisionNote={decisionNote}
        isGroupResult={isGroupResult}
        isSharedResult={isSharedResult}
        onShare={handleShare}
        peopleCount={peopleCount}
        shareState={shareState}
        usedBroaderSearch={usedBroaderSearch}
      />

      <BroaderSearchNotice label={t.results.broaderSearch} show={usedBroaderSearch} />

      <GroupInsightsSection groupInsights={groupInsights} isGroupResult={isGroupResult} />

      <TopPickSection isGroupResult={isGroupResult} label={t.results.topPick} movie={mainMovie} />

      <RecommendationFeedbackPanel
        feedbackState={feedbackState}
        isSharedResult={isSharedResult}
        onFeedback={handleFeedback}
        recommendationSlug={recommendationSlug}
        selectedFeedback={selectedFeedback}
        viewerCanRate={viewerCanRate}
      />

      <LocalResultsSection
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

      <ResultsActions
        tryAgainLabel={t.results.tryAgain}
        tryWithFriendsLabel={t.results.tryWithFriends}
      />

      <p className="mt-8 text-center" style={{ color: 'var(--pc-t5)', fontSize: '0.72rem' }}>
        {t.results.disclaimer}
      </p>
    </div>
  );
}

import { ArrowRight, Check, ChevronDown, Eye, Film, Loader2, Search, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';

import { palette } from '@/styles/designTokens';

import { getDeckCardAnimate } from './movieMemoryDeckViewModel';
import {
  formatDuration,
  formatMovieName,
  getMovieSummary,
  getMovieTitle,
  getOriginalTitle,
} from './movieMemoryDisplayViewModel';

import type { useLanguage } from '@/i18n';

type UserMovieInteractionKind = 'watched' | 'not_seen';
type DeckExitAction = UserMovieInteractionKind | 'unsure';
type MovieMemoryLabels = ReturnType<typeof useLanguage>['t']['account'];

type MovieMemoryCandidate = {
  id: number;
  tmdbId: number | null;
  movieName: string;
  movieYear: number | null;
  posterURL: string | null;
  localizedName: string | null;
  duration: number | null;
  description: string | null;
  localizedOverview: string | null;
};

type ActionState =
  | { status: 'idle' }
  | { status: 'saving'; movieId: number; kind: UserMovieInteractionKind }
  | { status: 'error' };

type CatalogSearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; movies: MovieMemoryCandidate[] }
  | { status: 'error' };

type DeckSessionStats = {
  watched: number;
  notSeen: number;
  unsure: number;
};

type TrainingChoiceKind = Exclude<UserMovieInteractionKind, 'not_seen'> | 'not_seen';

const TRAINING_CHOICE_CONFIG = {
  not_seen: {
    backgroundAlpha: '22',
    borderAlpha: '70',
    icon: X,
    paletteColor: palette.red,
    prefix: '\u2190 ',
    suffix: '',
  },
  watched: {
    backgroundAlpha: '26',
    borderAlpha: '75',
    icon: Eye,
    paletteColor: palette.green,
    prefix: '',
    suffix: ' \u2192',
  },
} satisfies Record<
  TrainingChoiceKind,
  {
    backgroundAlpha: string;
    borderAlpha: string;
    icon: typeof Eye;
    paletteColor: string;
    prefix: string;
    suffix: string;
  }
>;

const COMPLETION_ICON_CONFIG = {
  complete: {
    background: 'var(--pc-gold-subtle)',
    border: '1px solid var(--pc-gold-bd)',
    color: 'var(--pc-gold-text)',
    icon: Check,
  },
  empty: {
    background: 'var(--pc-surface-hover)',
    border: '1px solid var(--pc-bd2)',
    color: 'var(--pc-t2)',
    icon: Film,
  },
} satisfies Record<
  'complete' | 'empty',
  { background: string; border: string; color: string; icon: typeof Film }
>;

export function CompletionPanel({
  labels,
  onLoadMore,
  onOpenManualSearch,
  stats,
  variant,
}: {
  labels: MovieMemoryLabels;
  onLoadMore: () => void;
  onOpenManualSearch: () => void;
  stats: DeckSessionStats;
  variant: 'complete' | 'empty';
}) {
  const isEmpty = variant === 'empty';

  return (
    <div
      className="flex flex-col items-center gap-5 rounded-3xl p-8 text-center md:p-10"
      style={{
        background:
          'linear-gradient(145deg, color-mix(in srgb, var(--pc-surface) 92%, var(--pc-gold) 8%), var(--pc-surface))',
        border: '1px solid var(--pc-bd2)',
        boxShadow: 'var(--pc-card-shadow)',
        color: 'var(--pc-t2)',
      }}
    >
      <CompletionIcon variant={variant} />
      <CompletionCopy isEmpty={isEmpty} labels={labels} />
      <CompletionStats isEmpty={isEmpty} labels={labels} stats={stats} />
      <CompletionPrimaryActions isEmpty={isEmpty} labels={labels} onLoadMore={onLoadMore} />
      <CompletionSecondaryActions
        isEmpty={isEmpty}
        labels={labels}
        onLoadMore={onLoadMore}
        onOpenManualSearch={onOpenManualSearch}
      />
    </div>
  );
}

function CompletionIcon({ variant }: { variant: 'complete' | 'empty' }) {
  const config = COMPLETION_ICON_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className="flex h-16 w-16 items-center justify-center rounded-2xl"
      style={{
        background: config.background,
        border: config.border,
        color: config.color,
      }}
    >
      <Icon size={30} />
    </div>
  );
}

function CompletionCopy({ isEmpty, labels }: { isEmpty: boolean; labels: MovieMemoryLabels }) {
  return (
    <div className="max-w-xl">
      <h2 className="mb-2 text-2xl font-semibold" style={{ color: 'var(--pc-t1)' }}>
        {isEmpty ? labels.memoryDeckEmptyTitle : labels.memoryDeckCompleteTitle}
      </h2>
      <p>{isEmpty ? labels.memoryDeckEmptyBody : labels.memoryDeckCompleteBody}</p>
    </div>
  );
}

function CompletionStats({
  isEmpty,
  labels,
  stats,
}: {
  isEmpty: boolean;
  labels: MovieMemoryLabels;
  stats: DeckSessionStats;
}) {
  if (isEmpty) return null;

  return (
    <div className="grid w-full max-w-lg grid-cols-3 gap-2" aria-label={labels.memorySummary}>
      <CompletionStat label={labels.seenMovie} value={stats.watched} tone="seen" />
      <CompletionStat label={labels.notSeenMovie} value={stats.notSeen} tone="notSeen" />
      <CompletionStat label={labels.skipMovie} value={stats.unsure} tone="unsure" />
    </div>
  );
}

function CompletionPrimaryActions({
  isEmpty,
  labels,
  onLoadMore,
}: {
  isEmpty: boolean;
  labels: MovieMemoryLabels;
  onLoadMore: () => void;
}) {
  return (
    <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
      {isEmpty ? (
        <button
          type="button"
          onClick={onLoadMore}
          className="rounded-xl px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
          style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
        >
          {labels.memoryDeckEmptyAction}
        </button>
      ) : (
        <>
          <Link
            href="/account"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
            style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
          >
            {labels.memoryDeckBackToMemory}
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/quiz"
            className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
            style={{
              background: 'var(--pc-ghost)',
              border: '1px solid var(--pc-bd2)',
              color: 'var(--pc-t2)',
            }}
          >
            {labels.memoryDeckFindRecommendation}
          </Link>
        </>
      )}
    </div>
  );
}

function CompletionSecondaryActions({
  isEmpty,
  labels,
  onLoadMore,
  onOpenManualSearch,
}: {
  isEmpty: boolean;
  labels: MovieMemoryLabels;
  onLoadMore: () => void;
  onOpenManualSearch: () => void;
}) {
  if (isEmpty) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button
        type="button"
        onClick={onLoadMore}
        className="rounded-full px-3 py-1.5 text-xs font-semibold transition hover:bg-[var(--pc-ghost)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
        style={{ color: 'var(--pc-t3)' }}
      >
        {labels.loadMoreMovies}
      </button>
      <button
        type="button"
        onClick={onOpenManualSearch}
        className="rounded-full px-3 py-1.5 text-xs font-semibold transition hover:bg-[var(--pc-ghost)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
        style={{ color: 'var(--pc-t3)' }}
      >
        {labels.memoryDeckAddManual}
      </button>
    </div>
  );
}

function CompletionStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'seen' | 'notSeen' | 'unsure';
}) {
  const color = tone === 'seen' ? palette.green : tone === 'notSeen' ? palette.red : 'var(--pc-t2)';

  return (
    <div
      className="rounded-2xl px-3 py-4"
      style={{
        background: 'var(--pc-bg)',
        border: '1px solid var(--pc-bd2)',
      }}
    >
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-xs font-semibold" style={{ color: 'var(--pc-t3)' }}>
        {label}
      </div>
    </div>
  );
}

export function MovieTrainingCard({
  movie,
  labels,
  locale,
  exitAction,
  counter,
  progressPercent,
  action,
  isSubmitting,
  onSave,
  onSkip,
}: {
  movie: MovieMemoryCandidate;
  labels: MovieMemoryLabels;
  locale: string;
  exitAction: DeckExitAction | null;
  counter: string;
  progressPercent: number;
  action: ActionState;
  isSubmitting: boolean;
  onSave: (movieId: number, kind: UserMovieInteractionKind) => void;
  onSkip: (movieId: number) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const title = getMovieTitle(movie, locale);

  return (
    <motion.article
      key={movie.id}
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={getDeckCardAnimate(exitAction, Boolean(shouldReduceMotion))}
      transition={{ duration: exitAction ? 0.28 : 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[1.75rem]"
      style={{
        background:
          'linear-gradient(145deg, color-mix(in srgb, var(--pc-surface) 92%, var(--pc-gold) 8%), var(--pc-surface))',
        border: '1px solid var(--pc-bd2)',
        boxShadow: 'var(--pc-card-shadow)',
      }}
    >
      <div className="grid gap-6 p-4 sm:p-5 md:grid-cols-[minmax(220px,320px)_1fr] md:items-stretch md:p-6">
        <PosterFrame
          key={`${movie.id}:${movie.posterURL ?? 'missing'}`}
          movie={movie}
          title={title}
          labels={labels}
        />
        <MovieTrainingDetails
          counter={counter}
          locale={locale}
          movie={movie}
          progressPercent={progressPercent}
          title={title}
        />
      </div>
      <div
        className="px-4 pb-4 sm:px-5 sm:pb-5 md:px-6 md:pb-6"
        style={{ borderTop: '1px solid var(--pc-bd1)' }}
      >
        <MovieTrainingControls
          movie={movie}
          labels={labels}
          action={action}
          isSubmitting={isSubmitting}
          onSave={onSave}
          onSkip={onSkip}
        />
      </div>
      <DeckActionOverlay action={exitAction} labels={labels} />
    </motion.article>
  );
}

function MovieTrainingDetails({
  counter,
  locale,
  movie,
  progressPercent,
  title,
}: {
  counter: string;
  locale: string;
  movie: MovieMemoryCandidate;
  progressPercent: number;
  title: string;
}) {
  const summary = getMovieSummary(movie, locale);
  const duration = formatDuration(movie.duration, locale);
  const originalTitle = getOriginalTitle(movie, locale);

  return (
    <div className="flex min-w-0 flex-col justify-between gap-6 py-1 md:py-2">
      <MovieTrainingProgress counter={counter} progressPercent={progressPercent} />
      <div>
        <h2
          className="text-3xl font-semibold leading-tight md:text-5xl"
          style={{ color: 'var(--pc-t1)' }}
        >
          {formatMovieName(title, movie.movieYear)}
        </h2>
        <MovieTrainingMeta duration={duration} originalTitle={originalTitle} />
        <MovieSummaryText summary={summary} />
      </div>
    </div>
  );
}

function MovieSummaryText({ summary }: { summary: string | null }) {
  if (!summary) return null;

  return (
    <p className="mt-5 max-w-[62ch] text-sm leading-6" style={{ color: 'var(--pc-t2)' }}>
      {summary}
    </p>
  );
}

function MovieTrainingProgress({
  counter,
  progressPercent,
}: {
  counter: string;
  progressPercent: number;
}) {
  return (
    <div className="p-1" style={{ color: 'var(--pc-t2)' }}>
      <div className="mb-2 flex items-center gap-3">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: 'var(--pc-gold-subtle)',
            border: '1px solid var(--pc-gold-bd)',
            color: 'var(--pc-gold-text)',
          }}
        >
          {counter}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ background: 'var(--pc-ghost)' }}
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${progressPercent}%`, background: 'var(--pc-progress)' }}
        />
      </div>
    </div>
  );
}

function MovieTrainingMeta({
  duration,
  originalTitle,
}: {
  duration: string | null;
  originalTitle: string | null;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-medium">
      {duration ? (
        <span
          className="rounded-full px-3 py-1"
          style={{ background: 'var(--pc-ghost)', color: 'var(--pc-t2)' }}
        >
          {duration}
        </span>
      ) : null}
      {originalTitle ? (
        <span className="min-w-0 truncate" style={{ color: 'var(--pc-t3)' }}>
          {originalTitle}
        </span>
      ) : null}
    </div>
  );
}

function DeckActionOverlay({
  action,
  labels,
}: {
  action: DeckExitAction | null;
  labels: MovieMemoryLabels;
}) {
  if (!action) return null;

  const config = getDeckOverlayConfig(action, labels);
  const { Icon } = config;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1 }}
      style={{ background: config.background }}
    >
      <motion.div
        className="inline-flex items-center gap-3 rounded-2xl px-6 py-4 text-xl font-black uppercase tracking-[0.14em] md:text-3xl"
        initial={{ scale: 0.92, rotate: config.rotate }}
        animate={{ scale: 1, rotate: config.rotate }}
        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
        style={{
          border: `2px solid ${config.border}`,
          color: config.color,
          background: 'var(--pc-bg)',
          boxShadow: 'var(--pc-card-shadow)',
        }}
      >
        <Icon size={24} />
        {config.label}
      </motion.div>
    </motion.div>
  );
}

function getDeckOverlayConfig(action: DeckExitAction, labels: MovieMemoryLabels) {
  return {
    not_seen: {
      label: labels.memoryOverlayNotSeen,
      Icon: X,
      background: `${palette.red}38`,
      border: `${palette.red}80`,
      color: palette.red,
      rotate: -5,
    },
    unsure: {
      label: labels.memoryOverlayUnsure,
      Icon: ChevronDown,
      background: 'color-mix(in srgb, var(--pc-surface-hover) 84%, transparent)',
      border: 'var(--pc-bd3)',
      color: 'var(--pc-t1)',
      rotate: 0,
    },
    watched: {
      label: labels.memoryOverlaySeen,
      Icon: Eye,
      background: `${palette.green}38`,
      border: `${palette.green}80`,
      color: palette.green,
      rotate: 5,
    },
  }[action];
}

function MovieTrainingControls({
  movie,
  labels,
  action,
  isSubmitting,
  onSave,
  onSkip,
}: {
  movie: MovieMemoryCandidate;
  labels: MovieMemoryLabels;
  action: ActionState;
  isSubmitting: boolean;
  onSave: (movieId: number, kind: UserMovieInteractionKind) => void;
  onSkip: (movieId: number) => void;
}) {
  const isSaving = action.status === 'saving' || isSubmitting;

  return (
    <motion.div
      key={`${movie.id}-controls`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pt-4"
    >
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm font-semibold" style={{ color: 'var(--pc-t2)' }}>
          {labels.memoryCardQuestion}
        </p>
        <p className="text-xs" style={{ color: 'var(--pc-t3)' }}>
          {labels.memoryKeyboardHint}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TrainingChoiceButton
          action={action}
          disabled={isSaving}
          kind="not_seen"
          label={labels.notSeenMovie}
          movieId={movie.id}
          onSave={onSave}
        />
        <TrainingChoiceButton
          action={action}
          disabled={isSaving}
          kind="watched"
          label={labels.seenMovie}
          movieId={movie.id}
          onSave={onSave}
        />
      </div>
      <button
        type="button"
        disabled={isSaving}
        onClick={() => onSkip(movie.id)}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-transparent px-5 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-[var(--pc-bd3)] hover:bg-[var(--pc-surface-hover)] hover:text-[var(--pc-t1)] active:translate-y-0 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        style={{
          border: '1px solid var(--pc-bd2)',
          color: 'var(--pc-t2)',
        }}
      >
        <ChevronDown size={18} />
        &darr; {labels.skipMovie}
      </button>
    </motion.div>
  );
}

function TrainingChoiceButton({
  action,
  disabled,
  kind,
  label,
  movieId,
  onSave,
}: {
  action: ActionState;
  disabled: boolean;
  kind: UserMovieInteractionKind;
  label: string;
  movieId: number;
  onSave: (movieId: number, kind: UserMovieInteractionKind) => void;
}) {
  const config = TRAINING_CHOICE_CONFIG[kind];
  const Icon = config.icon;
  const saving = action.status === 'saving' && action.movieId === movieId && action.kind === kind;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSave(movieId, kind)}
      className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      style={{
        background: `${config.paletteColor}${config.backgroundAlpha}`,
        border: `1px solid ${config.paletteColor}${config.borderAlpha}`,
        color: config.paletteColor,
      }}
    >
      {saving ? <Loader2 className="animate-spin" size={18} /> : <Icon size={18} />}
      {config.prefix}
      {label}
      {config.suffix}
    </button>
  );
}

function PosterFrame({
  movie,
  title,
  labels,
}: {
  movie: MovieMemoryCandidate;
  title: string;
  labels: MovieMemoryLabels;
}) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'failed'>(() =>
    movie.posterURL ? 'loading' : 'failed',
  );
  const posterURL = imageState !== 'failed' ? movie.posterURL : null;

  return (
    <div
      className="relative mx-auto aspect-[2/3] w-full max-w-[320px] overflow-hidden rounded-[1.25rem] md:max-w-none"
      style={{
        background: 'var(--pc-surface-deep)',
        border: '1px solid var(--pc-bd2)',
        boxShadow: '0 18px 42px rgba(9,9,15,0.16)',
      }}
    >
      {posterURL ? (
        <PosterImage
          imageState={imageState}
          posterURL={posterURL}
          title={title}
          onError={() => setImageState('failed')}
          onLoad={() => setImageState('loaded')}
        />
      ) : (
        <PosterFallback labels={labels} movie={movie} title={title} />
      )}
    </div>
  );
}

function PosterImage({
  imageState,
  posterURL,
  title,
  onError,
  onLoad,
}: {
  imageState: 'loading' | 'loaded' | 'failed';
  posterURL: string;
  title: string;
  onError: () => void;
  onLoad: () => void;
}) {
  return (
    <>
      {imageState === 'loading' ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse"
          style={{
            background:
              'linear-gradient(110deg, var(--pc-surface-deep), var(--pc-surface-hover), var(--pc-surface-deep))',
          }}
        />
      ) : null}
      <Image
        src={posterURL}
        alt={title}
        fill
        priority
        sizes="(min-width: 768px) 320px, min(320px, 100vw)"
        className={`object-contain transition-opacity duration-200 ${
          imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={onLoad}
        onError={onError}
      />
    </>
  );
}

function PosterFallback({
  labels,
  movie,
  title,
}: {
  labels: MovieMemoryLabels;
  movie: MovieMemoryCandidate;
  title: string;
}) {
  return (
    <div
      className="absolute inset-0 flex flex-col justify-between overflow-hidden p-5 text-center"
      style={{
        background:
          'linear-gradient(160deg, color-mix(in srgb, var(--pc-surface-hover) 86%, var(--pc-gold) 14%), var(--pc-surface-deep) 58%, color-mix(in srgb, var(--pc-bg) 88%, var(--pc-gold) 12%))',
      }}
    >
      <PosterFallbackTop movieYear={movie.movieYear} />
      <PosterFallbackTitle title={title} />
      <div className="relative z-[1]">
        <p
          className="rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.14em]"
          style={{
            background: 'var(--pc-bg)',
            border: '1px solid var(--pc-bd2)',
            color: 'var(--pc-t3)',
          }}
        >
          {labels.posterUnavailable}
        </p>
      </div>
    </div>
  );
}

function PosterFallbackTop({ movieYear }: { movieYear: number | null }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-16"
        style={{
          background:
            'repeating-linear-gradient(90deg, transparent 0 12px, color-mix(in srgb, var(--pc-gold) 24%, transparent) 12px 14px)',
          opacity: 0.55,
        }}
      />
      <div className="relative z-[1] flex items-center justify-between">
        <span
          className="rounded-full px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em]"
          style={{
            background: 'var(--pc-gold-subtle)',
            border: '1px solid var(--pc-gold-bd)',
            color: 'var(--pc-gold-text)',
          }}
        >
          PopChoice
        </span>
        {movieYear ? (
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{
              background: 'var(--pc-bg)',
              border: '1px solid var(--pc-bd2)',
              color: 'var(--pc-t2)',
            }}
          >
            {movieYear}
          </span>
        ) : null}
      </div>
    </>
  );
}

function PosterFallbackTitle({ title }: { title: string }) {
  return (
    <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-5">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-3xl"
        style={{
          background: 'var(--pc-bg)',
          border: '1px solid var(--pc-bd2)',
          boxShadow: '0 16px 34px rgba(9,9,15,0.22)',
        }}
      >
        <Film size={42} style={{ color: 'var(--pc-gold-text)' }} />
      </div>
      <p
        className="max-w-[15rem] text-xl font-black leading-tight"
        style={{ color: 'var(--pc-t1)' }}
      >
        {title}
      </p>
    </div>
  );
}

export function ManualSearchPanel({
  query,
  search,
  labels,
  locale,
  action,
  isOpen,
  onToggle,
  onQueryChange,
  onSearch,
  onSave,
}: {
  query: string;
  search: CatalogSearchState;
  labels: MovieMemoryLabels;
  locale: string;
  action: ActionState;
  isOpen: boolean;
  onToggle: () => void;
  onQueryChange: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onSave: (movieId: number, kind: UserMovieInteractionKind) => void;
}) {
  return (
    <section className="mx-auto mt-8 max-w-3xl">
      <ManualSearchToggle isOpen={isOpen} labels={labels} onToggle={onToggle} />
      {isOpen ? (
        <ManualSearchBody
          action={action}
          labels={labels}
          locale={locale}
          query={query}
          search={search}
          onQueryChange={onQueryChange}
          onSave={onSave}
          onSearch={onSearch}
        />
      ) : null}
    </section>
  );
}

function ManualSearchToggle({
  isOpen,
  labels,
  onToggle,
}: {
  isOpen: boolean;
  labels: MovieMemoryLabels;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-transparent transition hover:-translate-y-0.5 hover:bg-[var(--pc-ghost)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
      style={{
        border: '1px solid var(--pc-bd1)',
        color: 'var(--pc-t3)',
      }}
      aria-expanded={isOpen}
      aria-label={labels.manualSearchTitle}
      title={labels.manualSearchTitle}
    >
      <Search size={18} />
      <ChevronDown
        size={14}
        className={`absolute translate-x-3 translate-y-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        aria-hidden="true"
      />
    </button>
  );
}

function ManualSearchBody({
  action,
  labels,
  locale,
  query,
  search,
  onQueryChange,
  onSave,
  onSearch,
}: {
  action: ActionState;
  labels: MovieMemoryLabels;
  locale: string;
  query: string;
  search: CatalogSearchState;
  onQueryChange: (value: string) => void;
  onSave: (movieId: number, kind: UserMovieInteractionKind) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const searchInputId = useId();

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
      <div className="mb-4 text-center">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--pc-t1)' }}>
          {labels.manualSearchTitle}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--pc-t2)' }}>
          {labels.manualSearchBody}
        </p>
      </div>

      <ManualSearchForm
        labels={labels}
        query={query}
        search={search}
        searchInputId={searchInputId}
        onQueryChange={onQueryChange}
        onSearch={onSearch}
      />
      <ManualSearchResults
        action={action}
        labels={labels}
        locale={locale}
        search={search}
        onSave={onSave}
      />
    </motion.div>
  );
}

function ManualSearchForm({
  labels,
  query,
  search,
  searchInputId,
  onQueryChange,
  onSearch,
}: {
  labels: MovieMemoryLabels;
  query: string;
  search: CatalogSearchState;
  searchInputId: string;
  onQueryChange: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSearch} className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor={searchInputId} className="sr-only">
        {labels.searchMovieMemory}
      </label>
      <div
        className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl px-4"
        style={{ background: 'var(--pc-bg)', border: '1px solid var(--pc-bd2)' }}
      >
        <Search size={20} style={{ color: 'var(--pc-t2)' }} />
        <input
          id={searchInputId}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={labels.catalogSearchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-base outline-none"
          style={{ color: 'var(--pc-t1)' }}
        />
      </div>
      <button
        type="submit"
        disabled={query.trim().length < 2 || search.status === 'loading'}
        className="inline-flex min-h-14 items-center justify-center rounded-2xl px-6 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)] disabled:opacity-60"
        style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
      >
        {search.status === 'loading' ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          labels.searchCatalog
        )}
      </button>
    </form>
  );
}

function ManualSearchResults({
  action,
  labels,
  locale,
  search,
  onSave,
}: {
  action: ActionState;
  labels: MovieMemoryLabels;
  locale: string;
  search: CatalogSearchState;
  onSave: (movieId: number, kind: UserMovieInteractionKind) => void;
}) {
  if (search.status === 'error') {
    return <ManualSearchNotice tone="error">{labels.catalogSearchError}</ManualSearchNotice>;
  }
  if (search.status !== 'loaded') return null;

  return (
    <LoadedManualSearchResults
      action={action}
      labels={labels}
      locale={locale}
      movies={search.movies}
      onSave={onSave}
    />
  );
}

function LoadedManualSearchResults({
  action,
  labels,
  locale,
  movies,
  onSave,
}: {
  action: ActionState;
  labels: MovieMemoryLabels;
  locale: string;
  movies: MovieMemoryCandidate[];
  onSave: (movieId: number, kind: UserMovieInteractionKind) => void;
}) {
  if (movies.length === 0)
    return <ManualSearchNotice>{labels.catalogSearchEmpty}</ManualSearchNotice>;

  return (
    <div className="mt-4 grid gap-3">
      {movies.map((movie) => (
        <MovieSearchResultRow
          key={movie.id}
          movie={movie}
          labels={labels}
          locale={locale}
          action={action}
          onSave={onSave}
        />
      ))}
    </div>
  );
}

function ManualSearchNotice({
  children,
  tone = 'neutral',
}: {
  children: string;
  tone?: 'error' | 'neutral';
}) {
  return (
    <div
      className="mt-4 rounded-2xl p-4 text-sm"
      style={{
        background: tone === 'error' ? `${palette.red}14` : 'var(--pc-surface)',
        color: 'var(--pc-t2)',
      }}
    >
      {children}
    </div>
  );
}

function MovieSearchResultRow({
  movie,
  labels,
  locale,
  action,
  onSave,
}: {
  movie: MovieMemoryCandidate;
  labels: MovieMemoryLabels;
  locale: string;
  action: ActionState;
  onSave: (movieId: number, kind: UserMovieInteractionKind) => void;
}) {
  const title = getMovieTitle(movie, locale);
  const saving = action.status === 'saving' && action.movieId === movie.id;

  return (
    <div
      className="flex items-center gap-4 rounded-2xl p-3"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
    >
      <MovieSearchPoster movie={movie} title={title} />
      <MovieSearchTitle movie={movie} title={title} />
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(movie.id, 'watched')}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
        style={{ background: 'var(--pc-gold-subtle)', color: 'var(--pc-gold-text)' }}
      >
        {saving ? <Loader2 className="animate-spin" size={16} /> : <Eye size={16} />}
        {labels.seenMovie}
      </button>
    </div>
  );
}

function MovieSearchPoster({ movie, title }: { movie: MovieMemoryCandidate; title: string }) {
  if (!movie.posterURL) {
    return (
      <div
        className="flex h-20 w-14 items-center justify-center rounded-xl"
        style={{ background: 'var(--pc-ghost)', color: 'var(--pc-t3)' }}
      >
        <Film size={22} />
      </div>
    );
  }

  return (
    <Image
      src={movie.posterURL}
      alt={title}
      width={56}
      height={80}
      sizes="56px"
      className="h-20 w-14 rounded-xl object-cover"
    />
  );
}

function MovieSearchTitle({ movie, title }: { movie: MovieMemoryCandidate; title: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate font-semibold" style={{ color: 'var(--pc-t1)' }}>
        {formatMovieName(title, movie.movieYear)}
      </p>
      {movie.localizedName && movie.localizedName !== movie.movieName ? (
        <p className="truncate text-sm" style={{ color: 'var(--pc-t2)' }}>
          {movie.movieName}
        </p>
      ) : null}
    </div>
  );
}

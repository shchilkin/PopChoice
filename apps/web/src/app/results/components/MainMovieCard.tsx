'use client';

import { Clapperboard, Clock, ImageIcon, Sparkles, Star, X } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import { AgeRatingPill } from './AgeRatingPill';
import { MarkdownText } from './MarkdownText';
import {
  buildResultMovieCardViewModel,
  type ResultMovieCardViewModel,
  type ResultMovieMetaItem,
} from './resultMovieCardViewModel';
import { SimilarityBadge } from './SimilarityBadge';
import { StarRating } from './StarRating';

import type { MovieRecommendation } from '@/utils/client';
import type { ReactNode } from 'react';

export function MainMovieCard({
  movie,
  isGroup = false,
}: {
  movie: MovieRecommendation;
  isGroup?: boolean;
}) {
  const { t } = useLanguage();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isPosterOpen, setIsPosterOpen] = useState(false);
  const view = buildResultMovieCardViewModel(movie, t.results, { isGroup });

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.1 }}
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
        boxShadow: 'var(--pc-card-shadow)',
      }}
    >
      <MainPosterSection
        imgLoaded={imgLoaded}
        movie={movie}
        onImageLoad={() => setImgLoaded(true)}
        onPosterOpen={() => setIsPosterOpen(true)}
        view={view}
      />

      <MainMovieContent movie={movie} view={view} />
      <PosterLightbox
        movie={movie}
        onClose={() => setIsPosterOpen(false)}
        open={isPosterOpen}
        view={view}
      />
    </motion.div>
  );
}

function MainPosterSection({
  imgLoaded,
  movie,
  onImageLoad,
  onPosterOpen,
  view,
}: {
  imgLoaded: boolean;
  movie: MovieRecommendation;
  onImageLoad: () => void;
  onPosterOpen: () => void;
  view: ResultMovieCardViewModel;
}) {
  if (!view.hasPoster) return null;

  return (
    <div className="relative h-72 md:h-96 overflow-hidden">
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: imgLoaded ? 0 : 1, background: 'var(--pc-surface-deep)' }}
      />
      <Image
        src={view.posterUrl!}
        alt={movie.name}
        fill
        priority
        sizes="(max-width: 768px) 100vw, 600px"
        className="object-cover transition-opacity duration-700"
        style={{ opacity: imgLoaded ? 1 : 0 }}
        onLoad={onImageLoad}
      />
      <div className="absolute inset-0" style={{ background: 'var(--pc-poster-grad)' }} />
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <PosterOpenButton label={view.openPosterLabel} onClick={onPosterOpen} />
        <SimilarityBadge similarity={movie.similarity} />
      </div>
      <AiPickBadge label={view.aiPickLabel} />
      <MainPosterTitle view={view} />
    </div>
  );
}

function PosterOpenButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-full transition"
      style={{
        background: 'var(--pc-overlay-bg)',
        border: '1px solid var(--pc-bd3)',
        color: 'var(--pc-overlay-text)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <ImageIcon size={15} />
    </button>
  );
}

function PosterLightbox({
  movie,
  onClose,
  open,
  view,
}: {
  movie: MovieRecommendation;
  onClose: () => void;
  open: boolean;
  view: ResultMovieCardViewModel;
}) {
  if (!open || !view.hasPoster || typeof document === 'undefined') return null;

  return createPortal(
    <PosterLightboxContent movie={movie} onClose={onClose} view={view} />,
    document.body,
  );
}

function PosterLightboxContent({
  movie,
  onClose,
  view,
}: {
  movie: MovieRecommendation;
  onClose: () => void;
  view: ResultMovieCardViewModel;
}) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div
      aria-label={view.posterDialogLabel}
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
    >
      <button
        type="button"
        aria-label={view.closePosterLabel}
        className="absolute inset-0 cursor-default"
        style={{ background: 'rgba(3, 4, 8, 0.78)', backdropFilter: 'blur(18px)' }}
        onClick={onClose}
      />
      <div
        className="relative grid w-full max-w-sm gap-3 rounded-3xl p-3"
        style={{
          background: 'var(--pc-surface)',
          border: '1px solid var(--pc-bd2)',
          boxShadow: 'var(--pc-card-shadow)',
        }}
      >
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <p
              className="truncate text-sm font-semibold"
              style={{ color: 'var(--pc-overlay-text)' }}
            >
              {view.title}
            </p>
            <p className="text-xs" style={{ color: 'var(--pc-t3)' }}>
              {view.year}
            </p>
          </div>
          <button
            type="button"
            aria-label={view.closePosterLabel}
            onClick={onClose}
            className="grid h-9 w-9 flex-none place-items-center rounded-full transition"
            style={{
              background: 'var(--pc-surface-deep)',
              border: '1px solid var(--pc-bd3)',
              color: 'var(--pc-t2)',
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div
          className="relative aspect-[2/3] overflow-hidden rounded-2xl"
          style={{ background: 'var(--pc-surface-deep)' }}
        >
          <Image
            src={view.posterUrl!}
            alt={movie.name}
            fill
            sizes="(max-width: 640px) 86vw, 360px"
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}

function MainMovieContent({
  movie,
  view,
}: {
  movie: MovieRecommendation;
  view: ResultMovieCardViewModel;
}) {
  return (
    <div className="p-6 pt-4">
      <NoPosterHeader view={view} />
      <MainMatchSummary movie={movie} view={view} />
      <MainScoreRow view={view} />
      <MainRationale view={view} />
    </div>
  );
}

function AiPickBadge({ label }: { label: string }) {
  return (
    <div className="absolute top-4 left-4">
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
        style={{
          background: 'var(--pc-overlay-bg)',
          border: `1px solid ${palette.gold}40`,
          color: 'var(--pc-gold-text)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Sparkles size={10} />
        {label}
      </div>
    </div>
  );
}

function MainPosterTitle({ view }: { view: ResultMovieCardViewModel }) {
  return (
    <div className="absolute bottom-6 left-6 right-6">
      <h2
        className="mb-1"
        style={{
          fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
          fontWeight: '600',
          textTransform: 'uppercase',
          fontSize: 'clamp(1.8rem, 5vw, 3rem)',
          letterSpacing: '0.04em',
          color: 'var(--pc-overlay-text)',
          lineHeight: 1,
          textShadow: 'var(--pc-overlay-shadow)',
        }}
      >
        {view.title}
      </h2>
      <MetaItems items={view.overlayMetaItems} overlay />
    </div>
  );
}

function NoPosterHeader({ view }: { view: ResultMovieCardViewModel }) {
  if (view.hasPoster) return null;

  return (
    <div className="mb-4">
      <h2
        style={{
          fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
          fontWeight: '600',
          textTransform: 'uppercase',
          fontSize: '2rem',
          letterSpacing: '0.04em',
          color: 'var(--pc-t1)',
        }}
      >
        {view.title}
      </h2>
      <MetaItems className="mt-1" items={view.plainMetaItems} />
    </div>
  );
}

function MainMatchSummary({
  movie,
  view,
}: {
  movie: MovieRecommendation;
  view: ResultMovieCardViewModel;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
      <div className="flex items-center gap-2">
        <Clapperboard size={13} style={{ color: 'var(--pc-t3)' }} />
        <span title={view.matchExactLabel} style={{ color: 'var(--pc-t3)', fontSize: '0.82rem' }}>
          {view.year} · {view.matchLabel}
        </span>
      </div>
      <MainAgeRatingPill movie={movie} view={view} />
    </div>
  );
}

function MainAgeRatingPill({
  movie,
  view,
}: {
  movie: MovieRecommendation;
  view: ResultMovieCardViewModel;
}) {
  if (!view.hasRating) return null;
  return <AgeRatingPill label={movie.age_rating!} />;
}

function MainScoreRow({ view }: { view: ResultMovieCardViewModel }) {
  if (!view.hasScore) return null;

  return (
    <div className="flex items-center gap-2 mb-4">
      <StarRating score={view.score} />
      <span style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}>{view.score}/10</span>
    </div>
  );
}

function MetaItems({
  className,
  items,
  overlay = false,
}: {
  className?: string;
  items: ResultMovieMetaItem[];
  overlay?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 flex-wrap${className ? ` ${className}` : ''}`}
      style={{ color: 'var(--pc-t2)', fontSize: '0.82rem' }}
    >
      {items.map((item, index) => (
        <MetaItem
          key={`${item.kind}-${item.label}`}
          item={item}
          showSeparator={index > 0}
          overlay={overlay}
        />
      ))}
    </div>
  );
}

function MetaItem({
  item,
  overlay,
  showSeparator,
}: {
  item: ResultMovieMetaItem;
  overlay: boolean;
  showSeparator: boolean;
}) {
  return (
    <>
      {showSeparator && <span>·</span>}
      <MetaItemValue item={item} overlay={overlay} />
    </>
  );
}

function MetaItemValue({ item, overlay }: { item: ResultMovieMetaItem; overlay: boolean }) {
  const renderer = MAIN_META_RENDERERS[`${item.kind}:${overlay}`] ?? renderTextMetaItem;
  return renderer(item);
}

const MAIN_META_RENDERERS: Record<string, (item: ResultMovieMetaItem) => ReactNode> = {
  'duration:true': renderOverlayDurationMetaItem,
  'rating:true': renderOverlayRatingMetaItem,
  'score:false': renderScoreMetaItem,
  'score:true': renderScoreMetaItem,
};

function renderOverlayRatingMetaItem(item: ResultMovieMetaItem): ReactNode {
  return (
    <span
      className="px-1.5 py-0.5 rounded"
      style={{ border: '1px solid var(--pc-bd3)', color: 'var(--pc-t2)' }}
    >
      {item.label}
    </span>
  );
}

function renderOverlayDurationMetaItem(item: ResultMovieMetaItem): ReactNode {
  return (
    <span className="flex items-center gap-1">
      <Clock size={11} />
      {item.label}
    </span>
  );
}

function renderScoreMetaItem(item: ResultMovieMetaItem): ReactNode {
  return (
    <span className="flex items-center gap-1">
      <Star size={11} fill={palette.gold} stroke="none" />
      <span style={{ color: 'var(--pc-gold-text)' }}>{item.label.replace('/10', '')}</span>
      {item.label.endsWith('/10') ? '/10' : null}
    </span>
  );
}

function renderTextMetaItem(item: ResultMovieMetaItem): ReactNode {
  return <span>{item.label}</span>;
}

function MainRationale({ view }: { view: ResultMovieCardViewModel }) {
  if (!view.hasDescription) return null;

  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: 'var(--pc-ai-bg)',
        border: '1px solid',
        borderColor: 'var(--pc-ai-bd)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={12} style={{ color: 'var(--pc-gold-text)' }} />
        <span
          className="uppercase tracking-widest"
          style={{ color: 'var(--pc-gold-text)', fontSize: '0.65rem' }}
        >
          {view.rationaleLabel}
        </span>
      </div>
      <p style={{ color: 'var(--pc-t2)', fontSize: '0.88rem', lineHeight: 1.75 }}>
        <MarkdownText text={view.description} />
      </p>
    </div>
  );
}

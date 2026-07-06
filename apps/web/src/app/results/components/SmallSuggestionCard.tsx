'use client';

import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { type KeyboardEvent, useState } from 'react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import {
  buildResultMovieCardViewModel,
  type ResultMovieCardViewModel,
  type ResultMovieMetaItem,
} from './resultMovieCardViewModel';

import type { MovieRecommendation } from '@/utils/client';

interface SmallSuggestionCardProps {
  movie: MovieRecommendation;
  active: boolean;
  onClick: () => void;
}

export function SmallSuggestionCard({ movie, active, onClick }: SmallSuggestionCardProps) {
  const { t } = useLanguage();
  const [imgLoaded, setImgLoaded] = useState(false);
  const view = buildResultMovieCardViewModel(movie, t.results);

  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => handleCardKeyDown(event, onClick)}
      aria-pressed={active}
      aria-label={movie.name}
      className="relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300"
      style={{
        background: 'var(--pc-surface)',
        border: active ? '1.5px solid rgba(245,197,24,0.4)' : '1px solid var(--pc-bd2)',
        boxShadow: active ? '0 0 30px rgba(245,197,24,0.1)' : 'none',
        minWidth: '220px',
        maxWidth: '260px',
        flex: '0 0 auto',
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
    >
      <SmallPoster
        imgLoaded={imgLoaded}
        movie={movie}
        onImageLoad={() => setImgLoaded(true)}
        view={view}
      />

      <div className="p-3.5">
        <h4
          className="mb-1 truncate"
          style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '0.9rem' }}
        >
          {view.title}
        </h4>
        <SmallMetaItems items={view.compactMetaItems} />
      </div>
    </motion.div>
  );
}

function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>, onClick: () => void): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  onClick();
}

function SmallPoster({
  imgLoaded,
  movie,
  onImageLoad,
  view,
}: {
  imgLoaded: boolean;
  movie: MovieRecommendation;
  onImageLoad: () => void;
  view: ResultMovieCardViewModel;
}) {
  return (
    <div className="relative h-36 overflow-hidden">
      {view.hasPoster ? (
        <SmallPosterImage
          imgLoaded={imgLoaded}
          movie={movie}
          onImageLoad={onImageLoad}
          view={view}
        />
      ) : (
        <SmallPosterFallback />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, transparent 40%, var(--pc-surface) 100%)',
        }}
      />
      <SmallBadges fromTmdb={Boolean(movie.fromTMDB)} view={view} />
    </div>
  );
}

function SmallPosterImage({
  imgLoaded,
  movie,
  onImageLoad,
  view,
}: {
  imgLoaded: boolean;
  movie: MovieRecommendation;
  onImageLoad: () => void;
  view: ResultMovieCardViewModel;
}) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{ background: 'var(--pc-surface-deep)', opacity: imgLoaded ? 0 : 1 }}
      />
      <Image
        src={view.posterUrl!}
        alt={movie.name}
        fill
        sizes="260px"
        className="object-cover"
        onLoad={onImageLoad}
        style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s' }}
      />
    </>
  );
}

function SmallPosterFallback() {
  return (
    <div
      className="w-full h-full flex items-center justify-center text-3xl"
      style={{ background: 'var(--pc-surface-deep)' }}
    >
      🎬
    </div>
  );
}

function SmallBadges({ fromTmdb, view }: { fromTmdb: boolean; view: ResultMovieCardViewModel }) {
  return (
    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
      <div
        className="text-xs px-2 py-0.5 rounded-full"
        title={view.matchExactLabel}
        aria-label={`${view.matchLabel}. ${view.matchExactLabel}`}
        style={{
          background: 'rgba(9,9,15,0.85)',
          border: '1px solid rgba(245,197,24,0.2)',
          color: palette.gold,
          backdropFilter: 'blur(6px)',
        }}
      >
        {view.matchLabel}
      </div>
      {fromTmdb && <TmdbBadge />}
    </div>
  );
}

function TmdbBadge() {
  return (
    <div
      className="text-xs px-2 py-0.5 rounded-full"
      style={{
        background: 'rgba(9,9,15,0.85)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'var(--pc-chip-text)',
        backdropFilter: 'blur(6px)',
      }}
    >
      TMDB
    </div>
  );
}

function SmallMetaItems({ items }: { items: ResultMovieMetaItem[] }) {
  return (
    <div
      className="flex items-center gap-2 mb-2 flex-wrap"
      style={{ color: 'var(--pc-chip-text)', fontSize: '0.75rem' }}
    >
      {items.map((item, index) => (
        <SmallMetaItem key={`${item.kind}-${item.label}`} item={item} showSeparator={index > 0} />
      ))}
    </div>
  );
}

function SmallMetaItem({
  item,
  showSeparator,
}: {
  item: ResultMovieMetaItem;
  showSeparator: boolean;
}) {
  return (
    <>
      {showSeparator && <span>·</span>}
      {item.kind === 'score' ? (
        <span className="flex items-center gap-0.5">
          <Star size={10} fill={palette.gold} stroke="none" />
          {item.label}
        </span>
      ) : (
        <span>{item.label}</span>
      )}
    </>
  );
}

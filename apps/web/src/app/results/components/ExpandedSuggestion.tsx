'use client';

import { Clock, Sparkles, Star } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import { MarkdownText } from './MarkdownText';
import {
  buildResultMovieCardViewModel,
  type ResultMovieCardViewModel,
  type ResultMovieMetaItem,
} from './resultMovieCardViewModel';
import { SimilarityBadge } from './SimilarityBadge';
import { StarRating } from './StarRating';

import type { MovieRecommendation } from '@/utils/client';

export function ExpandedSuggestion({
  movie,
  isGroup = false,
}: {
  movie: MovieRecommendation;
  isGroup?: boolean;
}) {
  const { t } = useLanguage();
  const view = buildResultMovieCardViewModel(movie, t.results, {
    isGroup,
    rationaleVariant: 'expanded',
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden"
    >
      <div
        className="p-5 rounded-2xl mt-3"
        style={{
          background: 'var(--pc-surface)',
          border: '1px solid',
          borderColor: 'var(--pc-ai-bd)',
        }}
      >
        <div className="flex items-start gap-4">
          {view.hasPoster && <ExpandedPoster movie={movie} view={view} />}
          <ExpandedHeader movie={movie} view={view} />
        </div>

        {view.hasDescription && <ExpandedRationale view={view} />}
      </div>
    </motion.div>
  );
}

function ExpandedPoster({
  movie,
  view,
}: {
  movie: MovieRecommendation;
  view: ResultMovieCardViewModel;
}) {
  return (
    <div className="relative shrink-0 w-20 h-28 rounded-xl overflow-hidden">
      <Image src={view.posterUrl!} alt={movie.name} fill sizes="80px" className="object-cover" />
    </div>
  );
}

function ExpandedHeader({
  movie,
  view,
}: {
  movie: MovieRecommendation;
  view: ResultMovieCardViewModel;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3
            style={{
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontWeight: '600',
              textTransform: 'uppercase',
              fontSize: '1.3rem',
              letterSpacing: '0.03em',
              color: 'var(--pc-t1)',
            }}
          >
            {view.title}
          </h3>
          <ExpandedMetaItems items={view.expandedMetaItems} />
        </div>
        <SimilarityBadge similarity={movie.similarity} />
      </div>
      {view.hasScore && <StarRating score={view.score} />}
    </div>
  );
}

function ExpandedMetaItems({ items }: { items: ResultMovieMetaItem[] }) {
  return (
    <div className="flex items-center gap-2" style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}>
      {items.map((item, index) => (
        <ExpandedMetaItem
          key={`${item.kind}-${item.label}`}
          item={item}
          showSeparator={index > 0}
        />
      ))}
    </div>
  );
}

function ExpandedMetaItem({
  item,
  showSeparator,
}: {
  item: ResultMovieMetaItem;
  showSeparator: boolean;
}) {
  return (
    <>
      {showSeparator && <span>·</span>}
      <ExpandedMetaValue item={item} />
    </>
  );
}

function ExpandedMetaValue({ item }: { item: ResultMovieMetaItem }) {
  if (item.kind === 'score') {
    return (
      <span className="flex items-center gap-0.5">
        <Star size={10} fill={palette.gold} stroke="none" />
        {item.label}
      </span>
    );
  }
  if (item.kind === 'duration') {
    return (
      <span className="flex items-center gap-0.5">
        <Clock size={10} />
        {item.label}
      </span>
    );
  }
  return <span>{item.label}</span>;
}

function ExpandedRationale({ view }: { view: ResultMovieCardViewModel }) {
  return (
    <div
      className="mt-4 p-3.5 rounded-xl"
      style={{
        background: 'var(--pc-ai-bg)',
        border: '1px solid',
        borderColor: 'var(--pc-ai-bd)',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles size={11} style={{ color: 'var(--pc-gold-text)' }} />
        <span
          className="uppercase tracking-widest"
          style={{ color: 'var(--pc-gold-text)', fontSize: '0.62rem' }}
        >
          {view.rationaleLabel}
        </span>
      </div>
      <p style={{ color: 'var(--pc-t2)', fontSize: '0.82rem', lineHeight: 1.7 }}>
        <MarkdownText text={view.description} />
      </p>
    </div>
  );
}

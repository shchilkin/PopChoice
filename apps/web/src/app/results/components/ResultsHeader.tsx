'use client';

import { BookmarkCheck, Check, LogIn, Share2, Sparkles, Users } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { useLanguage } from '@/i18n';

import type { CSSProperties } from 'react';

export type ShareState = 'idle' | 'copied';

type ResultsCopy = ReturnType<typeof useLanguage>['t']['results'];

const chipButtonStyle = {
  idle: {
    background: 'var(--pc-chip-bg)',
    border: '1px solid var(--pc-chip-bd)',
    color: 'var(--pc-chip-text)',
  },
  copied: {
    background: 'var(--pc-chip-selected-bg)',
    border: '1px solid var(--pc-chip-selected-bd)',
    color: 'var(--pc-chip-selected-text)',
  },
} satisfies Record<ShareState, CSSProperties>;

const shareButtonView = {
  idle: {
    Icon: Share2,
    getLabel: (results: ResultsCopy) => results.shareResult,
  },
  copied: {
    Icon: Check,
    getLabel: (results: ResultsCopy) => results.shareCopied,
  },
} satisfies Record<
  ShareState,
  {
    Icon: typeof Share2;
    getLabel: (results: ResultsCopy) => string;
  }
>;

function formatAudienceSubtitle({
  copy,
  count,
  people,
  locale,
}: {
  copy: string;
  count?: number;
  people: number;
  locale: string;
}) {
  const numberFormatter = new Intl.NumberFormat(locale);
  const formattedCount = count == null ? '…' : numberFormatter.format(count);

  return copy
    .replace('{people}', numberFormatter.format(people))
    .replace('{count}', formattedCount);
}

function AudienceBadgeIcon({ isGroupResult }: { isGroupResult: boolean }) {
  return isGroupResult ? <Users size={11} /> : <Sparkles size={11} />;
}

function ShareResultButton({
  onShare,
  shareState,
  results,
}: {
  onShare: () => Promise<void>;
  shareState: ShareState;
  results: ResultsCopy;
}) {
  const view = shareButtonView[shareState];
  const Icon = view.Icon;

  return (
    <button
      type="button"
      onClick={() => void onShare()}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 transition-colors duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
      style={{
        ...chipButtonStyle[shareState],
        fontSize: '0.78rem',
        fontWeight: 600,
      }}
    >
      <Icon size={13} />
      {view.getLabel(results)}
    </button>
  );
}

function SaveCollectionButton({
  results,
  viewerCanRate,
}: {
  results: ResultsCopy;
  viewerCanRate: boolean;
}) {
  if (viewerCanRate) {
    return (
      <Link
        href="/account"
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 transition-colors duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
        style={{
          background: 'var(--pc-chip-selected-bg)',
          border: '1px solid var(--pc-chip-selected-bd)',
          color: 'var(--pc-chip-selected-text)',
          fontSize: '0.78rem',
          fontWeight: 600,
        }}
      >
        <BookmarkCheck size={13} />
        {results.savedCollection}
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 transition-colors duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
      style={{
        background: 'var(--pc-chip-bg)',
        border: '1px solid var(--pc-chip-bd)',
        color: 'var(--pc-chip-text)',
        fontSize: '0.78rem',
        fontWeight: 600,
      }}
    >
      <LogIn size={13} />
      {results.signInToSave}
    </Link>
  );
}

function SharedResultNotice({
  isSharedResult,
  results,
}: {
  isSharedResult: boolean;
  results: ResultsCopy;
}) {
  if (!isSharedResult) return null;

  return (
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
        {results.sharedResultNotice}
      </div>
    </div>
  );
}

function DecisionNoteIcon({ isGroupResult }: { isGroupResult: boolean }) {
  return isGroupResult ? <Users size={14} /> : <Sparkles size={14} />;
}

export function ResultsDecisionNoteCard({
  decisionNote,
  isGroupResult,
  results,
  usedBroaderSearch,
}: {
  decisionNote: string;
  isGroupResult: boolean;
  results: ResultsCopy;
  usedBroaderSearch: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.18 }}
      className="mt-5 rounded-2xl px-4 py-3"
      style={{
        background: 'var(--pc-ghost)',
        border: '1px solid var(--pc-bd2)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{
            background: 'var(--pc-chip-selected-bg)',
            color: 'var(--pc-chip-selected-text)',
          }}
        >
          <DecisionNoteIcon isGroupResult={isGroupResult} />
        </div>
        <div>
          <div
            className="uppercase tracking-widest"
            style={{ color: 'var(--pc-gold-text)', fontSize: '0.62rem' }}
          >
            {results.decisionNoteLabel}
          </div>
          <p
            className="mt-1"
            style={{ color: 'var(--pc-t2)', fontSize: '0.86rem', lineHeight: 1.6 }}
          >
            {decisionNote}
          </p>
          {usedBroaderSearch && (
            <p
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                background: 'var(--pc-chip-selected-bg)',
                color: 'var(--pc-chip-selected-text)',
                fontSize: '0.72rem',
                lineHeight: 1.4,
              }}
            >
              <Sparkles size={11} />
              {results.broaderSearch}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ResultsHeader({
  audienceBadge,
  audienceTitle,
  audienceSubtitle,
  dbMovieCount,
  isGroupResult,
  isSharedResult,
  onShare,
  peopleCount,
  shareState,
  viewerCanRate,
}: {
  audienceBadge: string;
  audienceTitle: string;
  audienceSubtitle: string;
  dbMovieCount?: number;
  isGroupResult: boolean;
  isSharedResult: boolean;
  onShare: () => Promise<void>;
  peopleCount: number;
  shareState: ShareState;
  viewerCanRate: boolean;
}) {
  const { t, locale } = useLanguage();
  const subtitle = formatAudienceSubtitle({
    copy: audienceSubtitle,
    count: dbMovieCount,
    people: peopleCount,
    locale,
  });

  return (
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
        <AudienceBadgeIcon isGroupResult={isGroupResult} />
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
        {subtitle}
      </p>
      <p className="mx-auto mt-4 max-w-xl" style={{ color: 'var(--pc-t4)', fontSize: '0.8rem' }}>
        {t.results.collectionMomentHint}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <SaveCollectionButton results={t.results} viewerCanRate={viewerCanRate} />
        <ShareResultButton onShare={onShare} shareState={shareState} results={t.results} />
      </div>
      <SharedResultNotice isSharedResult={isSharedResult} results={t.results} />
    </motion.div>
  );
}

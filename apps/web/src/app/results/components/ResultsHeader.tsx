'use client';

import { Check, Share2, Sparkles, Users } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';

export type ShareState = 'idle' | 'copied';

export function ResultsHeader({
  audienceBadge,
  audienceTitle,
  audienceSubtitle,
  dbMovieCount,
  decisionNote,
  isGroupResult,
  isSharedResult,
  onShare,
  peopleCount,
  shareState,
  usedBroaderSearch,
}: {
  audienceBadge: string;
  audienceTitle: string;
  audienceSubtitle: string;
  dbMovieCount?: number;
  decisionNote: string;
  isGroupResult: boolean;
  isSharedResult: boolean;
  onShare: () => Promise<void>;
  peopleCount: number;
  shareState: ShareState;
  usedBroaderSearch: boolean;
}) {
  const { t, locale } = useLanguage();
  const numberFormatter = new Intl.NumberFormat(locale);
  const subtitle = audienceSubtitle
    .replace('{people}', numberFormatter.format(peopleCount))
    .replace(
      '{count}',
      dbMovieCount !== null && dbMovieCount !== undefined
        ? numberFormatter.format(dbMovieCount)
        : '…',
    );

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
        {subtitle}
      </p>
      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={() => void onShare()}
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
  );
}

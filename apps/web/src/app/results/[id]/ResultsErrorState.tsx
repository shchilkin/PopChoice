'use client';

import { Clapperboard, RotateCcw } from 'lucide-react';

import { useLanguage } from '@/i18n';

type ResultsErrorVariant = 'missing' | 'failed' | 'empty';

export function ResultsErrorState({
  variant = 'empty',
  onRetry,
}: {
  variant?: ResultsErrorVariant;
  onRetry: () => void;
}) {
  const { t } = useLanguage();
  const copy = {
    missing: {
      icon: '🎞️',
      title: t.results.missingResultTitle,
      hint: t.results.missingResultHint,
    },
    failed: {
      icon: '🎬',
      title: t.results.failedResultTitle,
      hint: t.results.failedResultHint,
    },
    empty: {
      icon: '😕',
      title: t.results.noResultsTitle,
      hint: t.results.noResultsHint,
    },
  }[variant];

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-5">
      <div className="text-4xl mb-4">{copy.icon}</div>
      <div
        className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 uppercase tracking-widest"
        style={{
          background: 'var(--pc-gold-subtle)',
          border: '1px solid var(--pc-gold-bd-subtle)',
          color: 'var(--pc-gold-text)',
          fontSize: '0.68rem',
        }}
      >
        <Clapperboard size={12} />
        {t.results.sharedResultBadge}
      </div>
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
        {copy.title}
      </h2>
      <p
        className="mb-6 max-w-md text-center"
        style={{ color: 'var(--pc-t3)', fontSize: '0.9rem', lineHeight: 1.65 }}
      >
        {copy.hint}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-200 active:scale-95"
        style={{
          background: 'var(--pc-cta)',
          color: 'var(--pc-cta-text)',
          fontWeight: 700,
        }}
      >
        <RotateCcw size={15} />
        {t.results.startFresh}
      </button>
    </div>
  );
}

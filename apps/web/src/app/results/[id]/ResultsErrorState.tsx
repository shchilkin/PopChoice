'use client';

import { useLanguage } from '@/i18n';

export function ResultsErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-5">
      <div className="text-4xl mb-4">😕</div>
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
        {t.results.noResultsTitle}
      </h2>
      <p className="mb-6" style={{ color: 'var(--pc-t3)', fontSize: '0.9rem' }}>
        {t.results.noResultsHint}
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-3 rounded-2xl"
        style={{
          background: 'var(--pc-cta)',
          color: 'var(--pc-cta-text)',
          fontWeight: 700,
        }}
      >
        {t.results.tryAgain}
      </button>
    </div>
  );
}

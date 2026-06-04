'use client';

import { useLanguage } from '@/i18n';

export function QuizSubmitFailedState({
  onBack,
  onRetry,
}: {
  onBack: () => void;
  onRetry: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 min-h-[80vh]">
      <div className="max-w-sm w-full text-center">
        <p
          className="mb-3"
          style={{
            color: 'var(--pc-gold-text)',
            fontSize: '0.72rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {t.loading.submitFailedEyebrow}
        </p>
        <h2
          className="mb-3"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: '2rem',
            letterSpacing: '0.06em',
            color: 'var(--pc-t1)',
          }}
        >
          {t.loading.submitFailedTitle}
        </h2>
        <p className="mb-6" style={{ color: 'var(--pc-t2)', fontSize: '0.92rem', lineHeight: 1.6 }}>
          {t.loading.submitFailedBody}
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full px-5 py-3 font-semibold transition-transform hover:scale-[1.01]"
            style={{
              background: 'var(--pc-cta)',
              color: 'var(--pc-cta-text)',
            }}
          >
            {t.loading.submitFailedRetry}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full px-5 py-3 font-semibold"
            style={{
              background: 'var(--pc-ghost)',
              color: 'var(--pc-t2)',
            }}
          >
            {t.loading.submitFailedBack}
          </button>
        </div>
      </div>
    </div>
  );
}

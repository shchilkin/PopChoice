'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useLanguage } from '@/i18n';

interface QuizNavigationProps {
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
  isSubmitting: boolean;
  isLastStep: boolean;
  isLastPerson: boolean;
  nextPersonName?: string;
}

export function QuizNavigation({
  onBack,
  onNext,
  canProceed,
  isSubmitting,
  isLastStep,
  isLastPerson,
  nextPersonName,
}: QuizNavigationProps) {
  const { t } = useLanguage();
  const nextPersonLabel = nextPersonName
    ? t.quiz.nav.handTo.replace('{name}', nextPersonName)
    : t.quiz.nav.nextPerson;

  return (
    <div className="px-5 py-6 max-w-xl mx-auto w-full flex gap-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl text-sm transition-all duration-200"
        style={{
          background: 'var(--pc-ghost)',
          border: '1px solid var(--pc-bd2)',
          color: 'var(--pc-t3)',
        }}
      >
        <ChevronLeft size={16} /> {t.quiz.nav.back}
      </button>

      <button
        onClick={onNext}
        disabled={!canProceed || isSubmitting}
        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm transition-all duration-200 active:scale-[0.98]"
        style={{
          background: canProceed && !isSubmitting ? 'var(--pc-cta)' : 'var(--pc-bd2)',
          color: canProceed && !isSubmitting ? 'var(--pc-cta-text)' : 'var(--pc-t4)',
          fontWeight: 700,
          cursor: canProceed && !isSubmitting ? 'pointer' : 'not-allowed',
        }}
      >
        {isSubmitting ? (
          <>{t.quiz.nav.submitting}</>
        ) : isLastStep && isLastPerson ? (
          <>{t.quiz.nav.findMyMovie}</>
        ) : isLastStep ? (
          <>
            {nextPersonLabel} <ChevronRight size={16} />
          </>
        ) : (
          <>
            {t.quiz.nav.continue} <ChevronRight size={16} />
          </>
        )}
      </button>
    </div>
  );
}

'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface QuizNavigationProps {
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
  isSubmitting: boolean;
  isLastStep: boolean;
  isLastPerson: boolean;
}

export function QuizNavigation({
  onBack,
  onNext,
  canProceed,
  isSubmitting,
  isLastStep,
  isLastPerson,
}: QuizNavigationProps) {
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
        <ChevronLeft size={16} /> Back
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
          <>Submitting…</>
        ) : isLastStep && isLastPerson ? (
          <>Find My Movie ✨</>
        ) : isLastStep ? (
          <>
            Next Person <ChevronRight size={16} />
          </>
        ) : (
          <>
            Continue <ChevronRight size={16} />
          </>
        )}
      </button>
    </div>
  );
}

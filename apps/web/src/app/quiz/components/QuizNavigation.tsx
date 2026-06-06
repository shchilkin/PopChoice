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

type NavigationCopy = ReturnType<typeof useLanguage>['t']['quiz']['nav'];
type NextButtonLabelKind = 'continue' | 'handoff' | 'submit' | 'submitting';

const NEXT_BUTTON_STYLE = {
  disabled: {
    background: 'var(--pc-bd2)',
    color: 'var(--pc-t4)',
    cursor: 'not-allowed',
    fontWeight: 700,
  },
  enabled: {
    background: 'var(--pc-cta)',
    color: 'var(--pc-cta-text)',
    cursor: 'pointer',
    fontWeight: 700,
  },
};

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
  const nextButton = getNextButtonPresentation({
    canProceed,
    copy: t.quiz.nav,
    isLastPerson,
    isLastStep,
    isSubmitting,
    nextPersonName,
  });

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
        disabled={nextButton.disabled}
        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm transition-all duration-200 active:scale-[0.98]"
        style={nextButton.style}
      >
        {nextButton.label}
        {nextButton.showChevron && <ChevronRight size={16} />}
      </button>
    </div>
  );
}

function getNextButtonPresentation({
  canProceed,
  copy,
  isLastPerson,
  isLastStep,
  isSubmitting,
  nextPersonName,
}: {
  canProceed: boolean;
  copy: NavigationCopy;
  isLastPerson: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  nextPersonName?: string;
}) {
  const enabled = canUseNextButton(canProceed, isSubmitting);
  const label = getNextButtonLabel({
    copy,
    isLastPerson,
    isLastStep,
    isSubmitting,
    nextPersonName,
  });

  return {
    disabled: !enabled,
    label: label.text,
    showChevron: label.showChevron,
    style: getNextButtonStyle(enabled),
  };
}

function getNextButtonLabel({
  copy,
  isLastPerson,
  isLastStep,
  isSubmitting,
  nextPersonName,
}: {
  copy: NavigationCopy;
  isLastPerson: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  nextPersonName?: string;
}) {
  const kind = getNextButtonLabelKind({ isLastPerson, isLastStep, isSubmitting });
  const text = getNextButtonText({ copy, kind, nextPersonName });

  return { showChevron: shouldShowNextChevron(kind), text };
}

function getNextPersonLabel(copy: NavigationCopy, nextPersonName?: string) {
  if (!nextPersonName) {
    return copy.nextPerson;
  }

  return copy.handTo.replace('{name}', nextPersonName);
}

function canUseNextButton(canProceed: boolean, isSubmitting: boolean) {
  return canProceed && !isSubmitting;
}

function getNextButtonStyle(enabled: boolean) {
  return enabled ? NEXT_BUTTON_STYLE.enabled : NEXT_BUTTON_STYLE.disabled;
}

function getNextButtonLabelKind({
  isLastPerson,
  isLastStep,
  isSubmitting,
}: {
  isLastPerson: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
}): NextButtonLabelKind {
  if (isSubmitting) {
    return 'submitting';
  }

  if (isFinalSubmit(isLastStep, isLastPerson)) {
    return 'submit';
  }

  if (isLastStep) {
    return 'handoff';
  }

  return 'continue';
}

function getNextButtonText({
  copy,
  kind,
  nextPersonName,
}: {
  copy: NavigationCopy;
  kind: NextButtonLabelKind;
  nextPersonName?: string;
}) {
  const textByKind = {
    continue: copy.continue,
    handoff: getNextPersonLabel(copy, nextPersonName),
    submit: copy.findMyMovie,
    submitting: copy.submitting,
  };

  return textByKind[kind];
}

function shouldShowNextChevron(kind: NextButtonLabelKind) {
  return kind === 'continue' || kind === 'handoff';
}

function isFinalSubmit(isLastStep: boolean, isLastPerson: boolean) {
  return isLastStep && isLastPerson;
}

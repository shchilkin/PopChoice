'use client';

import { AnimatePresence, motion } from 'motion/react';

import { ProgressDots } from '@/components/ProgressDots';
import { useLanguage } from '@/i18n';

import {
  FAST_STEP_KEYS,
  STEP_KEYS,
  slideVariants,
  type FastStepKey,
  type StepKey,
} from '../constants';

import { QuizNavigation } from './QuizNavigation';
import {
  EraStep,
  FastAvoidsStep,
  FastDiscoveryStep,
  FastIntentStep,
  FavoriteActorStep,
  FavoriteMovieStep,
  MoodStep,
  ToneStep,
} from './steps';

import type { PersonAnswers } from '../types';
import type { ReactNode } from 'react';

type StepRendererProps = {
  canProceed: boolean;
  onNext: () => void;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  person: PersonAnswers;
};

type StepMeta = {
  index: number;
  label: string;
  total: number;
};

const QUESTION_STEP_RENDERERS: Record<StepKey, (props: StepRendererProps) => ReactNode> = {
  favoriteMovie: ({ canProceed, onNext, onUpdate, person }) => (
    <FavoriteMovieStep
      person={person}
      onUpdate={onUpdate}
      onSubmit={onNext}
      canProceed={canProceed}
    />
  ),
  era: ({ onUpdate, person }) => <EraStep person={person} onUpdate={onUpdate} />,
  mood: ({ onUpdate, person }) => <MoodStep person={person} onUpdate={onUpdate} />,
  tone: ({ onUpdate, person }) => <ToneStep person={person} onUpdate={onUpdate} />,
  avoids: ({ onUpdate, person }) => <FastAvoidsStep person={person} onUpdate={onUpdate} />,
  favoriteActor: ({ onNext, onUpdate, person }) => (
    <FavoriteActorStep person={person} onUpdate={onUpdate} onSubmit={onNext} />
  ),
};

const FAST_STEP_RENDERERS: Record<FastStepKey, (props: StepRendererProps) => ReactNode> = {
  intent: ({ onUpdate, person }) => <FastIntentStep person={person} onUpdate={onUpdate} />,
  avoids: ({ onUpdate, person }) => <FastAvoidsStep person={person} onUpdate={onUpdate} />,
  discovery: ({ onUpdate, person }) => <FastDiscoveryStep person={person} onUpdate={onUpdate} />,
};

function getActiveStepMeta({
  fastStep,
  isFastFlow,
  labels,
  questionsStep,
}: {
  fastStep: FastStepKey | null;
  isFastFlow: boolean;
  labels: ReturnType<typeof useLanguage>['t']['quiz'];
  questionsStep: StepKey | null;
}): StepMeta {
  if (isFastFlow) {
    const index = fastStep ? FAST_STEP_KEYS.indexOf(fastStep) : -1;
    return { index, label: labels.fast.labels[index], total: FAST_STEP_KEYS.length };
  }

  const index = questionsStep ? STEP_KEYS.indexOf(questionsStep) : -1;
  return { index, label: labels.labels[index], total: STEP_KEYS.length };
}

function getPersonTurnLabel({
  currentPerson,
  personCount,
  template,
}: {
  currentPerson: PersonAnswers;
  personCount: number;
  template: string;
}) {
  if (personCount <= 1) return null;
  return template.replace('{name}', currentPerson.name);
}

export function QuizQuestionStage({
  canProceed,
  currentPerson,
  currentPersonIdx,
  dir,
  fastStep,
  isFastFlow,
  isLastPerson,
  isLastStep,
  isSubmitting,
  onBack,
  onNext,
  onUpdate,
  people,
  questionsStep,
}: {
  canProceed: boolean;
  currentPerson: PersonAnswers;
  currentPersonIdx: number;
  dir: 1 | -1;
  fastStep: FastStepKey | null;
  isFastFlow: boolean;
  isLastPerson: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  people: PersonAnswers[];
  questionsStep: StepKey | null;
}) {
  const { t } = useLanguage();
  const totalPeople = people.length;
  const activeStep = getActiveStepMeta({
    fastStep,
    isFastFlow,
    labels: t.quiz,
    questionsStep,
  });
  const personLabel = getPersonTurnLabel({
    currentPerson,
    personCount: totalPeople,
    template: t.quiz.nav.personTurn,
  });

  return (
    <div className="flex-1 overflow-hidden">
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={`${currentPersonIdx}-${questionsStep ?? fastStep}`}
          custom={dir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="flex min-h-[80vh] flex-1 flex-col"
        >
          <QuizQuestionHeader
            activeStep={activeStep}
            currentPersonIdx={currentPersonIdx}
            ofTotalTemplate={t.quiz.nav.ofTotal}
            people={people}
            personLabel={personLabel}
          />

          <QuestionStep
            canProceed={canProceed}
            currentPerson={currentPerson}
            fastStep={fastStep}
            onNext={onNext}
            onUpdate={onUpdate}
            questionsStep={questionsStep}
          />

          <QuizNavigation
            onBack={onBack}
            onNext={onNext}
            canProceed={canProceed}
            isSubmitting={isSubmitting}
            isLastStep={isLastStep}
            isLastPerson={isLastPerson}
            nextPersonName={people[currentPersonIdx + 1]?.name}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function QuizQuestionHeader({
  activeStep,
  currentPersonIdx,
  ofTotalTemplate,
  people,
  personLabel,
}: {
  activeStep: StepMeta;
  currentPersonIdx: number;
  ofTotalTemplate: string;
  people: PersonAnswers[];
  personLabel: string | null;
}) {
  return (
    <div className="px-5 pt-6 pb-4 flex flex-col gap-3 max-w-xl mx-auto w-full">
      <PersonTurnPills people={people} currentPersonIdx={currentPersonIdx} />

      <div className="flex items-center justify-between">
        <StepProgress activeStep={activeStep} ofTotalTemplate={ofTotalTemplate} />
        <PersonTurnLabel label={personLabel} />
      </div>

      <div
        style={{
          color: 'var(--pc-t3)',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {activeStep.label}
      </div>
    </div>
  );
}

function StepProgress({
  activeStep,
  ofTotalTemplate,
}: {
  activeStep: StepMeta;
  ofTotalTemplate: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <ProgressDots current={activeStep.index} total={activeStep.total} />
      <span style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}>
        {ofTotalTemplate
          .replace('{current}', String(activeStep.index + 1))
          .replace('{total}', String(activeStep.total))}
      </span>
    </div>
  );
}

function PersonTurnLabel({ label }: { label: string | null }) {
  if (!label) return null;
  return <span style={{ color: 'var(--pc-t2)', fontSize: '0.8rem' }}>👤 {label}</span>;
}

function PersonTurnPills({
  currentPersonIdx,
  people,
}: {
  currentPersonIdx: number;
  people: PersonAnswers[];
}) {
  if (people.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 mb-1">
      {people.map((person, index) => (
        <div
          key={index}
          className="text-xs px-3 py-1 rounded-full transition-all duration-200"
          style={getPersonTurnPillStyle({ currentPersonIdx, index })}
        >
          {person.name}
        </div>
      ))}
    </div>
  );
}

function getPersonTurnPillStyle({
  currentPersonIdx,
  index,
}: {
  currentPersonIdx: number;
  index: number;
}) {
  const isCurrent = index === currentPersonIdx;
  const isComplete = index < currentPersonIdx;

  return {
    background: getPersonTurnPillBackground(isCurrent),
    color: getPersonTurnPillColor({ isComplete, isCurrent }),
    border: getPersonTurnPillBorder(isCurrent),
  };
}

function getPersonTurnPillBackground(isCurrent: boolean) {
  if (isCurrent) return 'var(--pc-gold-wash)';
  return 'var(--pc-ghost)';
}

function getPersonTurnPillBorder(isCurrent: boolean) {
  if (isCurrent) return '1px solid var(--pc-gold-bd)';
  return '1px solid transparent';
}

function getPersonTurnPillColor({
  isComplete,
  isCurrent,
}: {
  isComplete: boolean;
  isCurrent: boolean;
}) {
  if (isCurrent) return 'var(--pc-gold-text)';
  if (isComplete) return 'var(--pc-gold-text)';
  return 'var(--pc-t4)';
}

function getStepRenderer(questionsStep: StepKey | null, fastStep: FastStepKey | null) {
  if (questionsStep) return QUESTION_STEP_RENDERERS[questionsStep];
  if (fastStep) return FAST_STEP_RENDERERS[fastStep];
  return null;
}

function QuestionStep({
  canProceed,
  currentPerson,
  fastStep,
  onNext,
  onUpdate,
  questionsStep,
}: {
  canProceed: boolean;
  currentPerson: PersonAnswers;
  fastStep: FastStepKey | null;
  onNext: () => void;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  questionsStep: StepKey | null;
}) {
  const renderStep = getStepRenderer(questionsStep, fastStep);

  if (!renderStep) return null;

  return (
    <div className="flex-1 flex flex-col px-5 max-w-xl mx-auto w-full">
      {renderStep({ canProceed, onNext, onUpdate, person: currentPerson })}
    </div>
  );
}

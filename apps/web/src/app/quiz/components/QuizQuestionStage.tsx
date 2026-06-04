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
  const currentStepIdx = questionsStep ? STEP_KEYS.indexOf(questionsStep) : -1;
  const currentFastStepIdx = fastStep ? FAST_STEP_KEYS.indexOf(fastStep) : -1;
  const totalPeople = people.length;
  const personLabel =
    totalPeople > 1 ? t.quiz.nav.personTurn.replace('{name}', currentPerson.name) : null;
  const activeStepIdx = isFastFlow ? currentFastStepIdx : currentStepIdx;
  const activeStepTotal = isFastFlow ? FAST_STEP_KEYS.length : STEP_KEYS.length;
  const activeStepLabel = isFastFlow
    ? t.quiz.fast.labels[currentFastStepIdx]
    : t.quiz.labels[currentStepIdx];

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
          <div className="px-5 pt-6 pb-4 flex flex-col gap-3 max-w-xl mx-auto w-full">
            {totalPeople > 1 && (
              <PersonTurnPills people={people} currentPersonIdx={currentPersonIdx} />
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ProgressDots current={activeStepIdx} total={activeStepTotal} />
                <span style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}>
                  {t.quiz.nav.ofTotal
                    .replace('{current}', String(activeStepIdx + 1))
                    .replace('{total}', String(activeStepTotal))}
                </span>
              </div>
              {personLabel && (
                <span style={{ color: 'var(--pc-t2)', fontSize: '0.8rem' }}>👤 {personLabel}</span>
              )}
            </div>

            <div
              style={{
                color: 'var(--pc-t3)',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {activeStepLabel}
            </div>
          </div>

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

function PersonTurnPills({
  currentPersonIdx,
  people,
}: {
  currentPersonIdx: number;
  people: PersonAnswers[];
}) {
  return (
    <div className="flex items-center gap-2 mb-1">
      {people.map((person, index) => (
        <div
          key={index}
          className="text-xs px-3 py-1 rounded-full transition-all duration-200"
          style={{
            background: index === currentPersonIdx ? 'var(--pc-gold-wash)' : 'var(--pc-ghost)',
            color:
              index === currentPersonIdx
                ? 'var(--pc-gold-text)'
                : index < currentPersonIdx
                  ? 'var(--pc-gold-text)'
                  : 'var(--pc-t4)',
            border:
              index === currentPersonIdx ? '1px solid var(--pc-gold-bd)' : '1px solid transparent',
          }}
        >
          {person.name}
        </div>
      ))}
    </div>
  );
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
  return (
    <div className="flex-1 flex flex-col px-5 max-w-xl mx-auto w-full">
      {questionsStep === 'favoriteMovie' && (
        <FavoriteMovieStep
          person={currentPerson}
          onUpdate={onUpdate}
          onSubmit={onNext}
          canProceed={canProceed}
        />
      )}
      {questionsStep === 'era' && <EraStep person={currentPerson} onUpdate={onUpdate} />}
      {questionsStep === 'mood' && <MoodStep person={currentPerson} onUpdate={onUpdate} />}
      {questionsStep === 'tone' && <ToneStep person={currentPerson} onUpdate={onUpdate} />}
      {questionsStep === 'avoids' && <FastAvoidsStep person={currentPerson} onUpdate={onUpdate} />}
      {questionsStep === 'favoriteActor' && (
        <FavoriteActorStep person={currentPerson} onUpdate={onUpdate} onSubmit={onNext} />
      )}
      {fastStep === 'intent' && <FastIntentStep person={currentPerson} onUpdate={onUpdate} />}
      {fastStep === 'avoids' && <FastAvoidsStep person={currentPerson} onUpdate={onUpdate} />}
      {fastStep === 'discovery' && <FastDiscoveryStep person={currentPerson} onUpdate={onUpdate} />}
    </div>
  );
}

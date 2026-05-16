'use client';

import { useMachine } from '@xstate/react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, startTransition, useEffect, useRef, useState } from 'react';

import { ProgressDots } from '@/components/ProgressDots';
import { useLanguage } from '@/i18n';
import { getCsrfToken } from '@/lib/csrfClient';

import {
  BetweenPersons,
  EraStep,
  FavoriteActorStep,
  FavoriteMovieStep,
  GroupSetup,
  MoodStep,
  QuizIntro,
  QuizNavigation,
  QuizSubmittingState,
  ToneStep,
} from './components';
import { slideVariants, toApiFormat } from './constants';
import { quizMachine } from './quiz.machine';

import type { PersonAnswers } from './types';

const STEP_KEYS = ['favoriteMovie', 'era', 'mood', 'tone', 'favoriteActor'] as const;
type StepKey = (typeof STEP_KEYS)[number];

export default function QuizPage() {
  return (
    <Suspense fallback={<QuizSubmittingState mode="solo" peopleCount={1} />}>
      <QuizPageContent />
    </Suspense>
  );
}

function QuizPageContent() {
  const [state, send] = useMachine(quizMachine);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  // groupNames is transient UI state only needed during GroupSetup
  const [groupNames, setGroupNames] = useState<string[]>(['', '']);
  // Guard against React StrictMode double-invoking the submit effect
  const submittingRef = useRef(false);
  const navigationStartedRef = useRef(false);
  const restartHandledRef = useRef<string | null>(null);

  const { people, currentPersonIdx, dir, mode, recommendationId } = state.context;
  const currentPerson = people[currentPersonIdx];
  const isSubmitting = state.matches('submitting');
  const isNavigatingToResults = state.matches('navigatingToResults');
  const restartToken = searchParams.get('restart');

  // Derive which step we're on from the state value (no counter in context)
  const questionsStep =
    typeof state.value === 'object' && 'questions' in state.value
      ? (state.value as { questions: StepKey }).questions
      : null;
  const currentStepIdx = questionsStep ? STEP_KEYS.indexOf(questionsStep) : -1;
  const isLastStep = questionsStep === 'favoriteActor';

  useEffect(() => {
    if (!restartToken || restartHandledRef.current === restartToken) return;

    restartHandledRef.current = restartToken;
    submittingRef.current = false;
    navigationStartedRef.current = false;
    startTransition(() => {
      setGroupNames(['', '']);
    });
    send({ type: 'RESET' });
    router.replace('/quiz', { scroll: false });
  }, [restartToken, router, send]);

  // Trigger submit side-effect when machine reaches the final state
  useEffect(() => {
    if (!isSubmitting) return;
    // Prevent double-submission from React StrictMode or re-renders
    if (submittingRef.current) return;
    submittingRef.current = true;

    async function submit() {
      const resolved =
        mode === 'solo'
          ? people.map((p, i) => (i === 0 ? { ...p, name: t.quiz.intro.youLabel } : p))
          : people;
      const apiData = resolved.map(toApiFormat);
      const dataToSend = apiData.length === 1 ? apiData[0] : apiData;

      try {
        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify(dataToSend),
        });

        if (!res.ok) {
          submittingRef.current = false;
          send({ type: 'SUBMIT_FAILURE' });
          return;
        }

        const { id } = (await res.json()) as { id: string };
        submittingRef.current = false;
        send({ type: 'SUBMIT_SUCCESS', id });
      } catch {
        submittingRef.current = false;
        send({ type: 'SUBMIT_FAILURE' });
      }
    }

    void submit();
  }, [isSubmitting, mode, people, t.quiz.intro.youLabel, send]);

  useEffect(() => {
    const hasPendingRestart = Boolean(restartToken && restartHandledRef.current !== restartToken);
    if (hasPendingRestart || !isNavigatingToResults || !recommendationId) return;
    if (navigationStartedRef.current) return;

    navigationStartedRef.current = true;
    router.replace(`/results/${recommendationId}`);
  }, [isNavigatingToResults, recommendationId, restartToken, router]);

  function updateCurrentPerson(updates: Partial<PersonAnswers>) {
    send({ type: 'UPDATE_PERSON', updates });
  }

  function canProceed(): boolean {
    if (!currentPerson) return false;
    switch (questionsStep) {
      case 'favoriteMovie':
        return currentPerson.favoriteMovie.trim().length >= 1;
      case 'era':
        return currentPerson.era !== '';
      case 'mood':
        return currentPerson.moods.length >= 1;
      case 'tone':
        return currentPerson.tone !== '';
      case 'favoriteActor':
        return true;
      default:
        return false;
    }
  }

  // ── SUBMITTING / NAVIGATING ── keep this screen mounted until results loads
  if (isSubmitting || isNavigatingToResults) {
    return <QuizSubmittingState mode={mode} peopleCount={people.length} />;
  }

  if (state.matches('submitFailed')) {
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
          <p
            className="mb-6"
            style={{ color: 'var(--pc-t2)', fontSize: '0.92rem', lineHeight: 1.6 }}
          >
            {t.loading.submitFailedBody}
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => send({ type: 'RETRY_SUBMIT' })}
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
              onClick={() => send({ type: 'BACK' })}
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

  // ── INTRO ──
  if (state.matches('intro')) {
    return (
      <QuizIntro
        onStartSolo={() => send({ type: 'START_SOLO', youLabel: t.quiz.intro.youLabel })}
        onStartGroup={() => send({ type: 'START_GROUP' })}
      />
    );
  }

  // ── GROUP SETUP ──
  if (state.matches('groupSetup')) {
    return (
      <GroupSetup
        groupNames={groupNames}
        onGroupNamesChange={setGroupNames}
        onBack={() => send({ type: 'BACK' })}
        onStart={() =>
          send({ type: 'START_GROUP_QUESTIONS', names: groupNames.map((name) => name.trim()) })
        }
      />
    );
  }

  // ── BETWEEN PERSONS ──
  if (state.matches('betweenPersons')) {
    const donePersonName = people[currentPersonIdx]?.name ?? '';
    const nextPersonName = people[currentPersonIdx + 1]?.name ?? '';
    return (
      <BetweenPersons
        currentPersonName={donePersonName}
        nextPersonName={nextPersonName}
        completedCount={currentPersonIdx + 1}
        totalPeople={people.length}
        onNext={() => send({ type: 'CONTINUE' })}
      />
    );
  }

  // ── QUESTIONS ──
  const totalPeople = people.length;
  const personLabel =
    totalPeople > 1 ? t.quiz.nav.personTurn.replace('{name}', currentPerson.name) : null;
  const isLastPerson = currentPersonIdx === people.length - 1;

  return (
    <div className="flex-1 flex flex-col min-h-[80vh]">
      {/* Top bar */}
      <div className="px-5 pt-6 pb-4 flex flex-col gap-3 max-w-xl mx-auto w-full">
        {totalPeople > 1 && (
          <div className="flex items-center gap-2 mb-1">
            {people.map((p, i) => (
              <div
                key={i}
                className="text-xs px-3 py-1 rounded-full transition-all duration-200"
                style={{
                  background: i === currentPersonIdx ? 'var(--pc-gold-wash)' : 'var(--pc-ghost)',
                  color:
                    i === currentPersonIdx
                      ? 'var(--pc-gold-text)'
                      : i < currentPersonIdx
                        ? 'var(--pc-gold-text)'
                        : 'var(--pc-t4)',
                  border:
                    i === currentPersonIdx
                      ? '1px solid var(--pc-gold-bd)'
                      : '1px solid transparent',
                }}
              >
                {p.name}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProgressDots current={currentStepIdx} total={5} />
            <span style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}>
              {t.quiz.nav.ofTotal
                .replace('{current}', String(currentStepIdx + 1))
                .replace('{total}', '5')}
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
          {t.quiz.labels[currentStepIdx]}
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col px-5 max-w-xl mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`${currentPersonIdx}-${questionsStep}`}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-1"
          >
            {questionsStep === 'favoriteMovie' && (
              <FavoriteMovieStep
                person={currentPerson}
                onUpdate={updateCurrentPerson}
                onSubmit={() => send({ type: 'NEXT' })}
                canProceed={canProceed()}
              />
            )}
            {questionsStep === 'era' && (
              <EraStep person={currentPerson} onUpdate={updateCurrentPerson} />
            )}
            {questionsStep === 'mood' && (
              <MoodStep person={currentPerson} onUpdate={updateCurrentPerson} />
            )}
            {questionsStep === 'tone' && (
              <ToneStep person={currentPerson} onUpdate={updateCurrentPerson} />
            )}
            {questionsStep === 'favoriteActor' && (
              <FavoriteActorStep
                person={currentPerson}
                onUpdate={updateCurrentPerson}
                onSubmit={() => send({ type: 'NEXT' })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <QuizNavigation
        onBack={() => send({ type: 'BACK' })}
        onNext={() => send({ type: 'NEXT' })}
        canProceed={canProceed()}
        isSubmitting={isSubmitting}
        isLastStep={isLastStep}
        isLastPerson={isLastPerson}
        nextPersonName={people[currentPersonIdx + 1]?.name}
      />
    </div>
  );
}

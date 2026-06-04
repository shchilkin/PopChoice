'use client';

import { useMachine } from '@xstate/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/i18n';

import {
  BetweenPersons,
  FastAudience,
  GroupSetup,
  QuizIntro,
  QuizQuestionStage,
  QuizSubmitFailedState,
  QuizSubmittingState,
} from './components';
import { quizMachine } from './quiz.machine';
import { canProceedForStep, getFastStep, getQuestionsStep } from './quizStepViewModel';
import { useQuizSubmission } from './useQuizSubmission';

import type { PersonAnswers } from './types';

const MIN_GROUP_PEOPLE = 3;

function ensureGroupSlots(names: string[]) {
  return names.length >= MIN_GROUP_PEOPLE
    ? names
    : [...names, ...Array.from({ length: MIN_GROUP_PEOPLE - names.length }, () => '')];
}

export default function QuizPage() {
  return (
    <Suspense fallback={<QuizSubmittingState mode="solo" peopleCount={1} />}>
      <QuizPageContent />
    </Suspense>
  );
}

function QuizPageContent() {
  const searchParams = useSearchParams();
  const quizSessionKey = searchParams.get('session') ?? searchParams.get('restart') ?? 'active';

  return <QuizSession key={quizSessionKey} />;
}

function QuizSession() {
  const [state, send] = useMachine(quizMachine);
  const router = useRouter();
  const { t } = useLanguage();

  // groupNames is transient UI state only needed during GroupSetup
  const [groupNames, setGroupNames] = useState<string[]>(['', '']);
  const navigationStartedRef = useRef(false);

  const { people, currentPersonIdx, dir, mode, flow, audience, recommendationId } = state.context;
  const currentPerson = people[currentPersonIdx];
  const isSubmitting = state.matches('submitting');
  const isNavigatingToResults = state.matches('navigatingToResults');
  const isFastFlow = flow === 'fast';
  const experienceMode = isFastFlow ? 'fast-pick' : 'normal-match';

  // Derive which step we're on from the state value (no counter in context)
  const questionsStep = getQuestionsStep(state.value);
  const fastStep = getFastStep(state.value);
  const isLastStep = questionsStep === 'favoriteActor' || fastStep === 'discovery';

  const handleSubmitFailure = useCallback(() => {
    send({ type: 'SUBMIT_FAILURE' });
  }, [send]);

  const handleSubmitSuccess = useCallback(
    (id: string) => {
      send({ type: 'SUBMIT_SUCCESS', id });
    },
    [send],
  );

  useQuizSubmission({
    experienceMode,
    isFastFlow,
    isSubmitting,
    mode,
    onFailure: handleSubmitFailure,
    onSuccess: handleSubmitSuccess,
    people,
    youLabel: t.quiz.intro.youLabel,
  });

  useEffect(() => {
    if (!isNavigatingToResults || !recommendationId) return;
    if (navigationStartedRef.current) return;

    navigationStartedRef.current = true;
    router.replace(`/results/${recommendationId}`);
  }, [isNavigatingToResults, recommendationId, router]);

  function updateCurrentPerson(updates: Partial<PersonAnswers>) {
    send({ type: 'UPDATE_PERSON', updates });
  }

  function startFastPick() {
    send({ type: 'START_FAST_PICK', youLabel: t.quiz.intro.youLabel });
  }

  function startNormalMatch() {
    send({ type: 'START_NORMAL_MATCH', youLabel: t.quiz.intro.youLabel });
  }

  function startFastSolo() {
    send({ type: 'START_FAST_SOLO', youLabel: t.quiz.intro.youLabel });
  }

  function startFastDuo() {
    setGroupNames(['', '']);
    send({ type: 'START_FAST_DUO' });
  }

  function startFastGroup() {
    setGroupNames(ensureGroupSlots);
    send({ type: 'START_FAST_GROUP' });
  }

  function startSolo() {
    send({ type: 'START_SOLO', youLabel: t.quiz.intro.youLabel });
  }

  function startDuo() {
    setGroupNames(['', '']);
    send({ type: 'START_DUO' });
  }

  function startGroup() {
    setGroupNames(ensureGroupSlots);
    send({ type: 'START_GROUP' });
  }

  const canProceed = canProceedForStep({ fastStep, person: currentPerson, questionsStep });

  // ── SUBMITTING / NAVIGATING ── keep this screen mounted until results loads
  if (isSubmitting || isNavigatingToResults) {
    return <QuizSubmittingState mode={mode} peopleCount={people.length} />;
  }

  if (state.matches('submitFailed')) {
    return (
      <QuizSubmitFailedState
        onBack={() => send({ type: 'BACK' })}
        onRetry={() => send({ type: 'RETRY_SUBMIT' })}
      />
    );
  }

  // ── INTRO ──
  if (state.matches('intro')) {
    return <QuizIntro onStartFastPick={startFastPick} onStartNormalMatch={startNormalMatch} />;
  }

  if (state.matches('fastAudience')) {
    return (
      <FastAudience
        flow="fast"
        onBack={() => send({ type: 'BACK' })}
        onStartSolo={startFastSolo}
        onStartDuo={startFastDuo}
        onStartGroup={startFastGroup}
      />
    );
  }

  if (state.matches('normalAudience')) {
    return (
      <FastAudience
        flow="normal"
        onBack={() => send({ type: 'BACK' })}
        onStartSolo={startSolo}
        onStartDuo={startDuo}
        onStartGroup={startGroup}
      />
    );
  }

  // ── GROUP SETUP ──
  if (state.matches('groupSetup')) {
    return (
      <GroupSetup
        audience={audience === 'duo' ? 'duo' : 'group'}
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

  const isLastPerson = currentPersonIdx === people.length - 1;

  return (
    <QuizQuestionStage
      canProceed={canProceed}
      currentPerson={currentPerson}
      currentPersonIdx={currentPersonIdx}
      dir={dir}
      fastStep={fastStep}
      isFastFlow={isFastFlow}
      isLastPerson={isLastPerson}
      isLastStep={isLastStep}
      isSubmitting={isSubmitting}
      onBack={() => send({ type: 'BACK' })}
      onNext={() => send({ type: 'NEXT' })}
      onUpdate={updateCurrentPerson}
      people={people}
      questionsStep={questionsStep}
    />
  );
}

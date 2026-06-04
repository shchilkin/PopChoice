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

function getExperienceMode(isFastFlow: boolean) {
  if (isFastFlow) return 'fast-pick';
  return 'normal-match';
}

function getIsLastStep({
  fastStep,
  questionsStep,
}: {
  fastStep: ReturnType<typeof getFastStep>;
  questionsStep: ReturnType<typeof getQuestionsStep>;
}) {
  return questionsStep === 'favoriteActor' || fastStep === 'discovery';
}

function getGroupSetupAudience(audience: 'solo' | 'duo' | 'group') {
  if (audience === 'duo') return 'duo';
  return 'group';
}

function isQuestionStageActive({
  matchesFastQuestions,
  matchesQuestions,
}: {
  matchesFastQuestions: boolean;
  matchesQuestions: boolean;
}) {
  return matchesFastQuestions || matchesQuestions;
}

function LoadingScreen({
  isActive,
  mode,
  peopleCount,
}: {
  isActive: boolean;
  mode: 'solo' | 'group';
  peopleCount: number;
}) {
  if (!isActive) return null;
  return <QuizSubmittingState mode={mode} peopleCount={peopleCount} />;
}

function SubmitFailedScreen({
  isActive,
  onBack,
  onRetry,
}: {
  isActive: boolean;
  onBack: () => void;
  onRetry: () => void;
}) {
  if (!isActive) return null;
  return <QuizSubmitFailedState onBack={onBack} onRetry={onRetry} />;
}

function IntroScreen({
  isActive,
  onStartFastPick,
  onStartNormalMatch,
}: {
  isActive: boolean;
  onStartFastPick: () => void;
  onStartNormalMatch: () => void;
}) {
  if (!isActive) return null;
  return <QuizIntro onStartFastPick={onStartFastPick} onStartNormalMatch={onStartNormalMatch} />;
}

function AudienceScreen({
  flow,
  isActive,
  onBack,
  onStartDuo,
  onStartGroup,
  onStartSolo,
}: {
  flow: 'fast' | 'normal';
  isActive: boolean;
  onBack: () => void;
  onStartDuo: () => void;
  onStartGroup: () => void;
  onStartSolo: () => void;
}) {
  if (!isActive) return null;

  return (
    <FastAudience
      flow={flow}
      onBack={onBack}
      onStartSolo={onStartSolo}
      onStartDuo={onStartDuo}
      onStartGroup={onStartGroup}
    />
  );
}

function GroupSetupScreen({
  audience,
  groupNames,
  isActive,
  onBack,
  onGroupNamesChange,
  onStart,
}: {
  audience: 'duo' | 'group';
  groupNames: string[];
  isActive: boolean;
  onBack: () => void;
  onGroupNamesChange: (names: string[]) => void;
  onStart: () => void;
}) {
  if (!isActive) return null;

  return (
    <GroupSetup
      audience={audience}
      groupNames={groupNames}
      onGroupNamesChange={onGroupNamesChange}
      onBack={onBack}
      onStart={onStart}
    />
  );
}

function BetweenPersonsScreen({
  currentPersonIdx,
  isActive,
  onNext,
  people,
}: {
  currentPersonIdx: number;
  isActive: boolean;
  onNext: () => void;
  people: PersonAnswers[];
}) {
  if (!isActive) return null;

  return (
    <BetweenPersons
      currentPersonName={getPersonName(people, currentPersonIdx)}
      nextPersonName={getPersonName(people, currentPersonIdx + 1)}
      completedCount={currentPersonIdx + 1}
      totalPeople={people.length}
      onNext={onNext}
    />
  );
}

function getPersonName(people: PersonAnswers[], index: number) {
  return people[index]?.name ?? '';
}

function QuestionStageScreen({
  canProceed,
  currentPerson,
  currentPersonIdx,
  dir,
  fastStep,
  isActive,
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
  fastStep: ReturnType<typeof getFastStep>;
  isActive: boolean;
  isFastFlow: boolean;
  isLastPerson: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onUpdate: (updates: Partial<PersonAnswers>) => void;
  people: PersonAnswers[];
  questionsStep: ReturnType<typeof getQuestionsStep>;
}) {
  if (!isActive) return null;

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
      onBack={onBack}
      onNext={onNext}
      onUpdate={onUpdate}
      people={people}
      questionsStep={questionsStep}
    />
  );
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
  const experienceMode = getExperienceMode(isFastFlow);

  // Derive which step we're on from the state value (no counter in context)
  const questionsStep = getQuestionsStep(state.value);
  const fastStep = getFastStep(state.value);
  const isLastStep = getIsLastStep({ fastStep, questionsStep });

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
  const isLastPerson = currentPersonIdx === people.length - 1;

  return (
    <>
      <LoadingScreen
        isActive={isSubmitting || isNavigatingToResults}
        mode={mode}
        peopleCount={people.length}
      />
      <SubmitFailedScreen
        isActive={state.matches('submitFailed')}
        onBack={() => send({ type: 'BACK' })}
        onRetry={() => send({ type: 'RETRY_SUBMIT' })}
      />
      <IntroScreen
        isActive={state.matches('intro')}
        onStartFastPick={startFastPick}
        onStartNormalMatch={startNormalMatch}
      />
      <AudienceScreen
        flow="fast"
        isActive={state.matches('fastAudience')}
        onBack={() => send({ type: 'BACK' })}
        onStartSolo={startFastSolo}
        onStartDuo={startFastDuo}
        onStartGroup={startFastGroup}
      />
      <AudienceScreen
        flow="normal"
        isActive={state.matches('normalAudience')}
        onBack={() => send({ type: 'BACK' })}
        onStartSolo={startSolo}
        onStartDuo={startDuo}
        onStartGroup={startGroup}
      />
      <GroupSetupScreen
        audience={getGroupSetupAudience(audience)}
        groupNames={groupNames}
        isActive={state.matches('groupSetup')}
        onGroupNamesChange={setGroupNames}
        onBack={() => send({ type: 'BACK' })}
        onStart={() =>
          send({ type: 'START_GROUP_QUESTIONS', names: groupNames.map((name) => name.trim()) })
        }
      />
      <BetweenPersonsScreen
        currentPersonIdx={currentPersonIdx}
        isActive={state.matches('betweenPersons')}
        onNext={() => send({ type: 'CONTINUE' })}
        people={people}
      />
      <QuestionStageScreen
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
        isActive={isQuestionStageActive({
          matchesFastQuestions: state.matches('fastQuestions'),
          matchesQuestions: state.matches('questions'),
        })}
      />
    </>
  );
}

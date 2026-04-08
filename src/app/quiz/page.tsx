'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ProgressDots } from '@/components/ProgressDots';
import { useLanguage } from '@/i18n';

import {
  BetweenPersons,
  EraStep,
  FavoriteActorStep,
  FavoriteMovieStep,
  GroupSetup,
  MoodStep,
  QuizIntro,
  QuizNavigation,
  ToneStep,
} from './components';
import { emptyPerson, slideVariants, toApiFormat } from './constants';

import type { PersonAnswers, Phase } from './types';

export default function QuizPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [phase, setPhase] = useState<Phase>('intro');
  const [mode, setMode] = useState<'solo' | 'group'>('solo');
  const [people, setPeople] = useState<PersonAnswers[]>([emptyPerson(t.quiz.intro.youLabel)]);
  const [currentPersonIdx, setCurrentPersonIdx] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [groupNames, setGroupNames] = useState<string[]>(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPerson = people[currentPersonIdx];

  function updateCurrentPerson(updates: Partial<PersonAnswers>) {
    setPeople((prev) => prev.map((p, i) => (i === currentPersonIdx ? { ...p, ...updates } : p)));
  }

  function submitToApi() {
    setIsSubmitting(true);
    const apiData = people.map(toApiFormat);
    const dataToSend = apiData.length === 1 ? apiData[0] : apiData;
    localStorage.setItem('popchoice_quiz_data', JSON.stringify(dataToSend));
    router.push('/loading');
  }

  function goNext() {
    setDir(1);
    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
    } else {
      if (currentPersonIdx < people.length - 1) {
        setPhase('between-persons');
      } else {
        submitToApi();
      }
    }
  }

  function goBack() {
    setDir(-1);
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    } else {
      if (mode === 'group' && currentPersonIdx > 0) {
        setCurrentPersonIdx((i) => i - 1);
        setCurrentStep(4);
      } else if (mode === 'group') {
        setPhase('group-setup');
      } else {
        setPhase('intro');
      }
    }
  }

  function canProceed(): boolean {
    if (!currentPerson) return false;
    if (currentStep === 0) return currentPerson.favoriteMovie.trim().length >= 1;
    if (currentStep === 1) return currentPerson.era !== '';
    if (currentStep === 2) return currentPerson.moods.length >= 1;
    if (currentStep === 3) return currentPerson.tone !== '';
    if (currentStep === 4) return true;
    return false;
  }

  function startSolo() {
    setMode('solo');
    setPeople([emptyPerson(t.quiz.intro.youLabel)]);
    setCurrentPersonIdx(0);
    setCurrentStep(0);
    setPhase('questions');
  }

  function startGroupSetup() {
    setMode('group');
    setPhase('group-setup');
  }

  function startGroupQuestions() {
    const valid = groupNames.filter((n) => n.trim().length > 0);
    const names = valid.length >= 2 ? valid : ['Person 1', 'Person 2'];
    setPeople(names.map((n) => emptyPerson(n)));
    setCurrentPersonIdx(0);
    setCurrentStep(0);
    setPhase('questions');
  }

  function nextPerson() {
    setCurrentPersonIdx((i) => i + 1);
    setCurrentStep(0);
    setDir(1);
    setPhase('questions');
  }

  // ── INTRO ──
  if (phase === 'intro') {
    return <QuizIntro onStartSolo={startSolo} onStartGroup={startGroupSetup} />;
  }

  // ── GROUP SETUP ──
  if (phase === 'group-setup') {
    return (
      <GroupSetup
        groupNames={groupNames}
        onGroupNamesChange={setGroupNames}
        onBack={() => setPhase('intro')}
        onStart={startGroupQuestions}
      />
    );
  }

  // ── BETWEEN PERSONS ──
  if (phase === 'between-persons') {
    const nextName = people[currentPersonIdx + 1]?.name || 'Next person';
    return (
      <BetweenPersons
        currentPersonName={currentPerson.name}
        nextPersonName={nextName}
        onNext={nextPerson}
      />
    );
  }

  // ── QUESTIONS ──
  const totalPeople = people.length;
  const personLabel =
    totalPeople > 1
      ? t.quiz.nav.personTurn.replace('{name}', currentPerson.name)
      : null;

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
                      ? 'var(--pc-gold)'
                      : i < currentPersonIdx
                        ? 'var(--pc-gold-focus)'
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
            <ProgressDots current={currentStep} total={5} />
            <span style={{ color: 'var(--pc-t3)', fontSize: '0.78rem' }}>
              {t.quiz.nav.ofTotal
                .replace('{current}', String(currentStep + 1))
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
          {t.quiz.labels[currentStep]}
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col px-5 max-w-xl mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`${currentPersonIdx}-${currentStep}`}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-1"
          >
            {currentStep === 0 && (
              <FavoriteMovieStep
                person={currentPerson}
                onUpdate={updateCurrentPerson}
                onSubmit={goNext}
                canProceed={canProceed()}
              />
            )}
            {currentStep === 1 && <EraStep person={currentPerson} onUpdate={updateCurrentPerson} />}
            {currentStep === 2 && (
              <MoodStep person={currentPerson} onUpdate={updateCurrentPerson} />
            )}
            {currentStep === 3 && (
              <ToneStep person={currentPerson} onUpdate={updateCurrentPerson} />
            )}
            {currentStep === 4 && (
              <FavoriteActorStep
                person={currentPerson}
                onUpdate={updateCurrentPerson}
                onSubmit={goNext}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav buttons */}
      <QuizNavigation
        onBack={goBack}
        onNext={goNext}
        canProceed={canProceed()}
        isSubmitting={isSubmitting}
        isLastStep={currentStep === 4}
        isLastPerson={currentPersonIdx === people.length - 1}
      />
    </div>
  );
}

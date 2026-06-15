import { describe, expect, it } from 'vitest';

import { emptyPerson } from './constants';
import { canProceedForStep, getFastStep, getQuestionsStep } from './quizStepViewModel';

describe('quiz step view model', () => {
  it('reads nested normal and fast question states', () => {
    expect(getQuestionsStep({ questions: 'mood' })).toBe('mood');
    expect(getQuestionsStep('intro')).toBeNull();
    expect(getFastStep({ fastQuestions: 'discovery' })).toBe('discovery');
    expect(getFastStep({ questions: 'tone' })).toBeNull();
  });

  it('validates normal question proceed rules', () => {
    const person = emptyPerson('Taylor');

    expect(canProceedForStep({ person, questionsStep: 'favoriteMovie', fastStep: null })).toBe(
      true,
    );
    expect(
      canProceedForStep({
        person: { ...person, favoriteMovie: 'Heat' },
        questionsStep: 'favoriteMovie',
        fastStep: null,
      }),
    ).toBe(true);
    expect(
      canProceedForStep({
        person: { ...person, hasNoReferenceMovie: true },
        questionsStep: 'favoriteMovie',
        fastStep: null,
      }),
    ).toBe(true);
    expect(
      canProceedForStep({
        person: { ...person, era: 'new' },
        questionsStep: 'era',
        fastStep: null,
      }),
    ).toBe(true);
    expect(
      canProceedForStep({
        person: { ...person, moods: ['action'] },
        questionsStep: 'mood',
        fastStep: null,
      }),
    ).toBe(true);
    expect(
      canProceedForStep({
        person: { ...person, tone: 'dark' },
        questionsStep: 'tone',
        fastStep: null,
      }),
    ).toBe(true);
    expect(canProceedForStep({ person, questionsStep: 'discovery', fastStep: null })).toBe(false);
    expect(
      canProceedForStep({
        person: { ...person, fastDiscovery: 'balanced' },
        questionsStep: 'discovery',
        fastStep: null,
      }),
    ).toBe(true);
    expect(canProceedForStep({ person, questionsStep: 'avoids', fastStep: null })).toBe(true);
    expect(canProceedForStep({ person, questionsStep: 'favoriteActor', fastStep: null })).toBe(
      true,
    );
  });

  it('validates fast question proceed rules', () => {
    const person = emptyPerson('Taylor');

    expect(canProceedForStep({ person, questionsStep: null, fastStep: 'intent' })).toBe(false);
    expect(
      canProceedForStep({
        person: { ...person, fastIntent: ['funny'] },
        questionsStep: null,
        fastStep: 'intent',
      }),
    ).toBe(true);
    expect(canProceedForStep({ person, questionsStep: null, fastStep: 'avoids' })).toBe(true);
    expect(canProceedForStep({ person, questionsStep: null, fastStep: 'discovery' })).toBe(false);
    expect(
      canProceedForStep({
        person: { ...person, fastDiscovery: 'surprise' },
        questionsStep: null,
        fastStep: 'discovery',
      }),
    ).toBe(true);
  });
});

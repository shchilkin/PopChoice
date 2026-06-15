import type { FastStepKey, StepKey } from './constants';
import type { PersonAnswers } from './types';

export function getQuestionsStep(stateValue: unknown): StepKey | null {
  return typeof stateValue === 'object' && stateValue !== null && 'questions' in stateValue
    ? (stateValue as { questions: StepKey }).questions
    : null;
}

export function getFastStep(stateValue: unknown): FastStepKey | null {
  return typeof stateValue === 'object' && stateValue !== null && 'fastQuestions' in stateValue
    ? (stateValue as { fastQuestions: FastStepKey }).fastQuestions
    : null;
}

export function canProceedForStep({
  fastStep,
  person,
  questionsStep,
}: {
  fastStep: FastStepKey | null;
  person?: PersonAnswers;
  questionsStep: StepKey | null;
}): boolean {
  if (!person) return false;

  switch (questionsStep) {
    case 'favoriteMovie':
      return true;
    case 'era':
      return person.era !== '';
    case 'mood':
      return person.moods.length >= 1;
    case 'tone':
      return person.tone !== '';
    case 'discovery':
      return person.fastDiscovery !== '';
    case 'avoids':
    case 'favoriteActor':
      return true;
    default:
      break;
  }

  switch (fastStep) {
    case 'intent':
      return person.fastIntent.length >= 1;
    case 'avoids':
      return true;
    case 'discovery':
      return person.fastDiscovery !== '';
    default:
      return false;
  }
}

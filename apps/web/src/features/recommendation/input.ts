import logger from '@/lib/logger';
import {
  ALWAYS_BLOCK_CATEGORIES,
  checkForPromptInjection,
  judgeForMoviePlatform,
  moderateInput,
} from '@/utils/ai/moderation';

import type { PersonFormData, RecommendationRequestBody } from './types';

const BLOCKED_INPUT_ERROR =
  'Your input contains content that cannot be processed. Please revise your preferences and try again.';

type RecommendationInputBlock = {
  error: string;
  flaggedCategories?: string[];
};

export function normalizePeopleData(validatedBody: RecommendationRequestBody): PersonFormData[] {
  return Array.isArray(validatedBody) ? validatedBody : [validatedBody];
}

export async function getRecommendationInputBlock(
  allPeopleData: PersonFormData[],
): Promise<RecommendationInputBlock | null> {
  const injectionDetected = allPeopleData.some(
    (person) =>
      checkForPromptInjection(person.favoriteMovie) ||
      checkForPromptInjection(person.favoriteMovieWhy ?? ''),
  );
  if (injectionDetected) {
    logger.warn('Prompt injection attempt detected in user input');
    return { error: BLOCKED_INPUT_ERROR };
  }

  const textsToModerate = allPeopleData.flatMap((person) =>
    [
      person.favoriteMovie,
      person.newVsClassic,
      person.tonePreference,
      person.favoriteMovieWhy,
      ...person.moodPreference,
    ].filter((text): text is string => typeof text === 'string' && text.length > 0),
  );
  const moderationResult = await moderateInput(textsToModerate);

  if (!moderationResult.flagged) {
    return null;
  }

  const hasAlwaysBlockCategory = moderationResult.categories.some((category) =>
    ALWAYS_BLOCK_CATEGORIES.has(category),
  );
  if (hasAlwaysBlockCategory) {
    logger.warn(
      { categories: moderationResult.categories },
      'User input blocked by always-block moderation category',
    );
    return {
      error: BLOCKED_INPUT_ERROR,
      flaggedCategories: moderationResult.categories,
    };
  }

  const labeledInputs = allPeopleData.flatMap((person) => [
    { field: 'favoriteMovie', value: person.favoriteMovie },
    { field: 'newVsClassic', value: person.newVsClassic },
    { field: 'tonePreference', value: person.tonePreference },
    ...person.moodPreference.map((mood) => ({ field: 'moodPreference', value: mood })),
    ...(person.favoriteMovieWhy
      ? [{ field: 'favoriteMovieWhy', value: person.favoriteMovieWhy }]
      : []),
  ]);
  const judgeResult = await judgeForMoviePlatform(labeledInputs, moderationResult.categories);

  if (!judgeResult.suitable) {
    logger.warn(
      { categories: moderationResult.categories },
      'User input blocked by judge after moderation flag',
    );
    return {
      error: BLOCKED_INPUT_ERROR,
      flaggedCategories: moderationResult.categories,
    };
  }

  logger.info(
    { categories: moderationResult.categories },
    'Judge approved content flagged by moderation — proceeding',
  );
  return null;
}

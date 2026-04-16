import { openAIClient } from '@/clients';
import logger from '@/lib/logger';
import { MODELS } from '@/lib/models';

import type { PersonFormData } from './types';

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

/**
 * Serialise one or more people's quiz answers into a single string for embedding.
 * Keys listed in `excludeKeys` are omitted (used to strip raw "Why?" text
 * when refined semantic tags are available).
 */
export const combineAllPeopleDataToString = (
  allPeopleData: PersonFormData[],
  options: { excludeKeys?: (keyof PersonFormData)[] } = {},
): string => {
  const { excludeKeys = [] } = options;

  if (allPeopleData.length === 1) {
    // Single person - same as before
    const data = allPeopleData[0];
    return Object.entries(data)
      .filter(([key, value]) => !excludeKeys.includes(key as keyof PersonFormData) && value != null)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');
  }

  // Multiple people - combine all preferences
  let combinedString = `Group of ${allPeopleData.length} people preferences:\n\n`;

  allPeopleData.forEach((personData, index) => {
    combinedString += `Person ${index + 1}:\n`;
    combinedString += Object.entries(personData)
      .filter(([key, value]) => !excludeKeys.includes(key as keyof PersonFormData) && value != null)
      .map(([key, value]) => `  ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');
    combinedString += '\n\n';
  });

  return combinedString.trim();
};

/**
 * Build the embedding input string, substituting refined semantic tags for raw "Why?" text.
 * When refined tags are available the raw favoriteMovieWhy field is excluded to avoid noise.
 */
const buildEmbeddingInputWithRefinedTags = (
  allPeopleData: PersonFormData[],
  refinedQueryTags: string,
): string => {
  const base = combineAllPeopleDataToString(allPeopleData, { excludeKeys: ['favoriteMovieWhy'] });
  return `${base}\nrefinedQueryTags: ${refinedQueryTags}`;
};

// ---------------------------------------------------------------------------
// Query enrichment
// ---------------------------------------------------------------------------

const QUERY_ENRICHMENT_SYSTEM_PROMPT =
  'You are a Professional Movie Semantic Analyst. Transform user input into a high-density list of semantic tags. Extract: Core Themes, Atmospheric Keywords, Narrative Tropes, and Visual Styles. Output ONLY a comma-separated list of English keywords. No filler.';

/**
 * Use a lightweight LLM to convert natural-language "Why?" text into a dense list of
 * cinema-specific semantic tags that produce higher-signal embeddings.
 *
 * Returns `null` if no "Why?" text is present or if the LLM call fails (fail-open
 * so the caller falls back to raw text embedding).
 */
export async function refineQueryWithLLM(allPeopleData: PersonFormData[]): Promise<string | null> {
  const whyTexts = allPeopleData
    .map((p) => p.favoriteMovieWhy)
    .filter((text): text is string => Boolean(text?.trim()));

  if (whyTexts.length === 0) return null;

  const rawText = whyTexts.join(' ');

  try {
    const response = await openAIClient.chat.completions.create({
      model: MODELS.MINI,
      messages: [
        { role: 'system', content: QUERY_ENRICHMENT_SYSTEM_PROMPT },
        { role: 'user', content: rawText },
      ],
      max_completion_tokens: 200,
      temperature: 0,
    });

    const refinedTags = response.choices[0]?.message?.content?.trim();

    if (!refinedTags) {
      logger.warn(
        { rawTextLength: rawText.length },
        'Query enrichment returned empty response, falling back to raw text',
      );
      return null;
    }

    logger.info(
      { rawTextLength: rawText.length, refinedTagsLength: refinedTags.length },
      'Query enrichment: raw user text refined to semantic tags',
    );

    return refinedTags;
  } catch (error) {
    const err =
      error instanceof Error
        ? { name: error.name, message: error.message }
        : { name: 'UnknownError', message: 'An unknown error occurred' };
    logger.warn(
      { err, rawTextLength: rawText.length },
      'Query enrichment failed, falling back to raw text embedding',
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Embedding creation
// ---------------------------------------------------------------------------

/** Create an OpenAI embedding for the user's quiz answers. */
export async function createEmbedding(
  allPeopleData: PersonFormData[],
  refinedQueryTags?: string,
): Promise<number[]> {
  try {
    const embeddingInput = refinedQueryTags
      ? buildEmbeddingInputWithRefinedTags(allPeopleData, refinedQueryTags)
      : combineAllPeopleDataToString(allPeopleData);

    const embeddingResponse = await openAIClient.embeddings.create({
      model: MODELS.EMBEDDING,
      input: embeddingInput,
    });
    if (!embeddingResponse?.data?.[0]?.embedding) {
      throw new Error('No embedding returned from OpenAI.');
    }
    return embeddingResponse.data[0].embedding;
  } catch (error) {
    throw new Error(`Failed to create embedding: ${error}`);
  }
}

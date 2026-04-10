import { openAIClient } from '@/clients/openaiClient';

export type ModerationResult = { flagged: false } | { flagged: true; categories: string[] };

/**
 * Checks the provided text against OpenAI's Moderation API.
 * Returns whether the content was flagged and which categories were violated.
 *
 * @param input - The text string (or array of strings) to moderate.
 * @returns A ModerationResult indicating whether the content is safe.
 */
export async function moderateInput(input: string | string[]): Promise<ModerationResult> {
  const response = await openAIClient.moderations.create({
    model: 'omni-moderation-latest',
    input,
  });

  const flaggedCategories: string[] = [];

  for (const result of response.results) {
    if (result.flagged) {
      for (const [category, isFlagged] of Object.entries(result.categories)) {
        if (typeof isFlagged === 'boolean' && isFlagged) {
          flaggedCategories.push(category);
        }
      }
    }
  }

  if (flaggedCategories.length > 0) {
    return { flagged: true, categories: [...new Set(flaggedCategories)] };
  }

  return { flagged: false };
}

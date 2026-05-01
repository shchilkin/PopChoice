import { zodResponseFormat } from 'openai/helpers/zod';
import z from 'zod';

import { getOpenAIClient } from '@/clients/openaiClient';
import logger from '@/lib/logger';
import { MODELS } from '@/lib/models';

// ---------------------------------------------------------------------------
// Timeout constants
// ---------------------------------------------------------------------------

/** Timeout for OpenAI Moderation API calls (10 s). */
const OPENAI_MODERATION_TIMEOUT_MS = 10_000;

/** Timeout for the judge LLM call (15 s). */
const OPENAI_JUDGE_TIMEOUT_MS = 15_000;

export type ModerationResult = { flagged: false } | { flagged: true; categories: string[] };

/**
 * Categories that bypass the judge entirely and cause an immediate block.
 * These have no plausible legitimate movie-recommendation context.
 */
export const ALWAYS_BLOCK_CATEGORIES = new Set(['sexual/minors', 'self-harm/instructions']);

/**
 * Regex patterns that indicate a prompt injection attempt in a free-text field.
 * Used to protect the `favoriteMovie` field before it is embedded in AI prompts.
 */
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /you\s+are\s+now\b/i,
  /\bsystem\s*:/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /\bforget\s+(everything|all)\b/i,
  /\bnew\s+instructions?\s*:/i,
];

/**
 * Checks a free-text string (e.g. a movie title) for prompt injection patterns.
 * This is a lightweight structural check; it does not call any external API.
 *
 * @returns `true` if the text looks like a prompt injection attempt.
 */
export function checkForPromptInjection(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Checks the provided text against OpenAI's Moderation API.
 * Returns ALL flagged categories without filtering — the caller decides what to block.
 *
 * @param input - The text string (or array of strings) to moderate.
 * @returns A ModerationResult with all flagged categories.
 */
export async function moderateInput(input: string | string[]): Promise<ModerationResult> {
  const response = await getOpenAIClient().moderations.create(
    {
      model: 'omni-moderation-latest',
      input,
    },
    { signal: AbortSignal.timeout(OPENAI_MODERATION_TIMEOUT_MS) },
  );

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

const JUDGE_SYSTEM_PROMPT = `You are a content safety judge for PopChoice, a movie recommendation platform.
Users fill in a quiz to get personalized movie recommendations. The input fields are:
- favoriteMovie: a movie title the user loves (e.g. "Kill Bill", "Se7en", "I Spit on Your Grave", "Irreversible")
- newVsClassic: era preference ("new" or "classic")
- tonePreference: desired film tone (e.g. "dark", "funny", "serious", "violent")
- moodPreference: mood/genre labels (e.g. "action", "thriller", "comedy")

Your only job is to decide whether the input could be a genuine movie recommendation query or is clearly abusive/harmful with no legitimate movie-search interpretation.

SUITABLE (return true):
- Any real or plausible movie title, even if it references violence, sexual assault, death, war, crime, or other dark themes — cinema regularly explores these
- Genre/tone preferences like "violent", "dark", "disturbing", "erotic", "gory"
- Classic exploitation, horror, or art-house films regardless of subject matter

NOT SUITABLE (return false):
- Requests that are clearly not movie searches: hate speech targeting real people or groups, instructions for self-harm, sexual content involving minors
- Text that has no plausible movie-search interpretation even in context

When in doubt, rule in favour of the user — false positives harm legitimate users more than false negatives on a movie platform.

Respond only with JSON: {"suitable": true} or {"suitable": false}`;

/**
 * Uses a lightweight LLM to determine whether content flagged by the Moderation API
 * is legitimate movie-platform input or genuinely harmful.
 *
 * This is the second step of the judge pattern: the Moderation API is fast and cheap
 * but context-unaware. The judge has full knowledge of what each field represents and
 * can distinguish "Kill Bill" (a film title) from genuinely harmful content.
 *
 * @param labeledInputs - Each field name and its user-provided value.
 * @param flaggedCategories - The categories raised by the Moderation API.
 * @returns Whether the content is suitable for a movie recommendation platform.
 */
const judgeResponseSchema = z.object({
  suitable: z.boolean(),
});

/**
 * Uses a lightweight LLM to determine whether content flagged by the Moderation API
 * is legitimate movie-platform input or genuinely harmful.
 *
 * This is the second step of the judge pattern: the Moderation API is fast and cheap
 * but context-unaware. The judge has full knowledge of what each field represents and
 * can distinguish "Kill Bill" (a film title) from genuinely harmful content.
 *
 * @param labeledInputs - Each field name and its user-provided value.
 * @param flaggedCategories - The categories raised by the Moderation API.
 * @returns Whether the content is suitable for a movie recommendation platform.
 */
export async function judgeForMoviePlatform(
  labeledInputs: Array<{ field: string; value: string }>,
  flaggedCategories: string[],
): Promise<{ suitable: boolean }> {
  const inputSummary = labeledInputs.map(({ field, value }) => `${field}: "${value}"`).join('\n');

  try {
    const response = await getOpenAIClient().chat.completions.parse(
      {
        model: MODELS.MINI,
        messages: [
          { role: 'system', content: JUDGE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Moderation flagged: ${flaggedCategories.join(', ')}\n\nUser inputs:\n${inputSummary}`,
          },
        ],
        response_format: zodResponseFormat(judgeResponseSchema, 'judgeResult'),
        max_completion_tokens: 50,
      },
      { signal: AbortSignal.timeout(OPENAI_JUDGE_TIMEOUT_MS) },
    );

    const parsed = response.choices[0].message.parsed;
    return { suitable: parsed?.suitable === true };
  } catch (err) {
    // Fail-safe: if the judge call fails for any reason (e.g. invalid model name), block the request.
    logger.error({ err }, 'judgeForMoviePlatform: judge call failed, blocking as fail-safe');
    return { suitable: false };
  }
}

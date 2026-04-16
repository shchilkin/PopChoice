import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OpenAI API key is missing or invalid.');
}

let _openAIClient: OpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Default per-request timeout of 30 seconds; callers can override with signal.
  timeout: 30_000,
});

/** Return the current OpenAI client instance. */
export function getOpenAIClient(): OpenAI {
  return _openAIClient;
}

/** Replace the OpenAI client instance (useful for testing / DI). */
export function setOpenAIClient(client: OpenAI): void {
  _openAIClient = client;
}

/** Reset the OpenAI client to the default instance. */
export function resetOpenAIClient(): void {
  _openAIClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30_000,
  });
}

/**
 * Backward-compatible named export — proxied to the injectable client so
 * existing call sites (`openAIClient.chat.completions.create(…)`) keep working
 * without modification.
 */
export const openAIClient: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAIClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

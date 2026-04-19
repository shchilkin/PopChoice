import OpenAI from 'openai';

/**
 * Minimal interface covering the subset of the OpenAI SDK used by this application.
 *
 * Using this interface instead of the concrete `OpenAI` class makes it trivial to
 * inject lightweight mocks in tests:
 *
 * ```ts
 * import { setOpenAIClient, type OpenAIClientLike } from '@/clients/openaiClient';
 *
 * const mock: OpenAIClientLike = {
 *   embeddings: { create: vi.fn() },
 *   chat: { completions: { create: vi.fn(), parse: vi.fn() } },
 *   moderations: { create: vi.fn() },
 * };
 * setOpenAIClient(mock);
 * ```
 */
export interface OpenAIClientLike {
  embeddings: Pick<OpenAI['embeddings'], 'create'>;
  chat: {
    completions: Pick<OpenAI['chat']['completions'], 'create' | 'parse'>;
  };
  moderations: Pick<OpenAI['moderations'], 'create'>;
}

// Lazily-initialised: starts null so the module can be imported (and a mock
// injected via setOpenAIClient) without OPENAI_API_KEY being present.
let _openAIClient: OpenAIClientLike | null = null;

function createDefaultClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing or invalid.');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    // Default per-request timeout of 30 seconds; callers can override with signal.
    timeout: 30_000,
  });
}

/** Return the current OpenAI client instance, creating the default lazily on first call. */
export function getOpenAIClient(): OpenAIClientLike {
  if (!_openAIClient) {
    _openAIClient = createDefaultClient();
  }
  return _openAIClient;
}

/** Replace the OpenAI client instance (useful for testing / DI). */
export function setOpenAIClient(client: OpenAIClientLike): void {
  _openAIClient = client;
}

/** Reset the OpenAI client so the default is recreated lazily on next access. */
export function resetOpenAIClient(): void {
  _openAIClient = null;
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

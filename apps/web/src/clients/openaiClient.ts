import OpenAI from 'openai';

import { recordOpenAIUsageResponse } from '@/lib/openaiUsageContext';

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

function modelFromParams(params: unknown): string {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) return 'unknown';
  const model = (params as Record<string, unknown>).model;
  return typeof model === 'string' && model.length > 0 ? model : 'unknown';
}

function trackOpenAIResponse(
  response: PromiseLike<unknown>,
  operation: Parameters<typeof recordOpenAIUsageResponse>[0],
  params: unknown,
): void {
  void response.then(
    (value) => recordOpenAIUsageResponse(operation, value, modelFromParams(params)),
    () => undefined,
  );
}

function instrumentOpenAIClient(client: OpenAI): OpenAIClientLike {
  return {
    chat: {
      completions: {
        create: ((...args: unknown[]) => {
          const response = (
            client.chat.completions.create as unknown as (
              ...methodArgs: unknown[]
            ) => PromiseLike<unknown>
          )(...args);
          trackOpenAIResponse(response, 'chat.completions', args[0]);
          return response;
        }) as OpenAIClientLike['chat']['completions']['create'],
        parse: ((...args: unknown[]) => {
          const response = (
            client.chat.completions.parse as unknown as (
              ...methodArgs: unknown[]
            ) => PromiseLike<unknown>
          )(...args);
          trackOpenAIResponse(response, 'chat.completions', args[0]);
          return response;
        }) as OpenAIClientLike['chat']['completions']['parse'],
      },
    },
    embeddings: {
      create: ((...args: unknown[]) => {
        const response = (
          client.embeddings.create as unknown as (...methodArgs: unknown[]) => PromiseLike<unknown>
        )(...args);
        trackOpenAIResponse(response, 'embeddings', args[0]);
        return response;
      }) as OpenAIClientLike['embeddings']['create'],
    },
    moderations: {
      create: ((...args: unknown[]) => {
        const response = (
          client.moderations.create as unknown as (...methodArgs: unknown[]) => PromiseLike<unknown>
        )(...args);
        trackOpenAIResponse(response, 'moderations', args[0]);
        return response;
      }) as OpenAIClientLike['moderations']['create'],
    },
  };
}

function createDefaultClient(): OpenAIClientLike {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing or invalid.');
  }
  return instrumentOpenAIClient(
    new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // Default per-request timeout of 30 seconds; callers can override with signal.
      timeout: 30_000,
    }),
  );
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

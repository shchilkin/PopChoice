import type OpenAI from 'openai';

export const OPENAI_TIMEOUTS_MS = {
  moderation: 10_000,
  judge: 15_000,
  queryEnrichment: 15_000,
  embedding: 10_000,
  recommendation: 30_000,
  description: 20_000,
} as const;

export function openAIRequestOptions(timeoutMs: number): OpenAI.RequestOptions {
  return {
    signal: AbortSignal.timeout(timeoutMs),
    timeout: timeoutMs,
  };
}

export function isOpenAITimeoutError(error: unknown): boolean {
  const seen = new Set<unknown>();

  function visit(value: unknown): boolean {
    if (!value || seen.has(value)) return false;
    seen.add(value);

    if (value instanceof Error) {
      if (
        value.name === 'AbortError' ||
        value.name === 'TimeoutError' ||
        value.name === 'APIConnectionTimeoutError'
      ) {
        return true;
      }

      const message = value.message.toLowerCase();
      if (
        message.includes('timed out') ||
        message.includes('timeout') ||
        message.includes('aborted')
      ) {
        return true;
      }

      return visit(value.cause);
    }

    if (typeof value === 'object') {
      const maybeError = value as { name?: unknown; message?: unknown; cause?: unknown };
      if (
        maybeError.name === 'AbortError' ||
        maybeError.name === 'TimeoutError' ||
        maybeError.name === 'APIConnectionTimeoutError'
      ) {
        return true;
      }
      if (
        typeof maybeError.message === 'string' &&
        /timed out|timeout|aborted/i.test(maybeError.message)
      ) {
        return true;
      }
      return visit(maybeError.cause);
    }

    return false;
  }

  return visit(error);
}

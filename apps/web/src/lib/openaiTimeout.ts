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
  const queue: unknown[] = [error];

  while (queue.length > 0) {
    const value = queue.shift();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);

    if (isTimeoutLikeValue(value)) {
      return true;
    }

    const cause = getErrorCause(value);
    if (cause) {
      queue.push(cause);
    }
  }

  return false;
}

function isTimeoutLikeValue(value: unknown): boolean {
  if (value instanceof Error) {
    return isTimeoutName(value.name) || isTimeoutMessage(value.message);
  }

  if (typeof value !== 'object') {
    return false;
  }

  const maybeError = value as { name?: unknown; message?: unknown };
  return isTimeoutName(maybeError.name) || isTimeoutMessage(maybeError.message);
}

function isTimeoutName(name: unknown): boolean {
  return name === 'AbortError' || name === 'TimeoutError' || name === 'APIConnectionTimeoutError';
}

function isTimeoutMessage(message: unknown): boolean {
  return typeof message === 'string' && /timed out|timeout|aborted/i.test(message);
}

function getErrorCause(value: unknown): unknown {
  if (value instanceof Error) {
    return value.cause;
  }

  if (typeof value === 'object') {
    return (value as { cause?: unknown }).cause;
  }

  return undefined;
}

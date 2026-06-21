import { AsyncLocalStorage } from 'node:async_hooks';

export type OpenAIUsageOperation = 'chat.completions' | 'embeddings' | 'moderations';

export interface ObservedOpenAIUsageTotals {
  cachedInputTokens: number;
  inputTokens: number;
  outputTokens: number;
  requests: number;
}

export interface ObservedOpenAIUsageGroup extends ObservedOpenAIUsageTotals {
  model: string;
  operation: OpenAIUsageOperation;
}

export interface ObservedOpenAIUsageSnapshot {
  byModel: ObservedOpenAIUsageGroup[];
  byOperation: Record<OpenAIUsageOperation, ObservedOpenAIUsageTotals>;
  total: ObservedOpenAIUsageTotals;
}

type MutableObservedOpenAIUsage = {
  groups: Map<string, ObservedOpenAIUsageGroup>;
  operationTotals: Record<OpenAIUsageOperation, ObservedOpenAIUsageTotals>;
  total: ObservedOpenAIUsageTotals;
};

const openAIUsageStorage = new AsyncLocalStorage<MutableObservedOpenAIUsage>();

function emptyTotals(): ObservedOpenAIUsageTotals {
  return {
    cachedInputTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    requests: 0,
  };
}

function createMutableUsage(): MutableObservedOpenAIUsage {
  return {
    groups: new Map(),
    operationTotals: {
      'chat.completions': emptyTotals(),
      embeddings: emptyTotals(),
      moderations: emptyTotals(),
    },
    total: emptyTotals(),
  };
}

function addTotals(target: ObservedOpenAIUsageTotals, source: ObservedOpenAIUsageTotals): void {
  target.cachedInputTokens += source.cachedInputTokens;
  target.inputTokens += source.inputTokens;
  target.outputTokens += source.outputTokens;
  target.requests += source.requests;
}

function numberFromRecord(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function recordFrom(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function usageRecordFromResponse(response: unknown): Record<string, unknown> | null {
  return recordFrom(recordFrom(response)?.usage);
}

function usageFromRecord(usageRecord: Record<string, unknown>): ObservedOpenAIUsageTotals {
  const promptDetailsRecord = recordFrom(usageRecord.prompt_tokens_details) ?? {};
  return {
    cachedInputTokens: numberFromRecord(promptDetailsRecord, 'cached_tokens'),
    inputTokens:
      numberFromRecord(usageRecord, 'prompt_tokens') ||
      numberFromRecord(usageRecord, 'input_tokens'),
    outputTokens:
      numberFromRecord(usageRecord, 'completion_tokens') ||
      numberFromRecord(usageRecord, 'output_tokens'),
    requests: 1,
  };
}

function usageFromResponse(response: unknown): ObservedOpenAIUsageTotals {
  const usageRecord = usageRecordFromResponse(response);
  return usageRecord ? usageFromRecord(usageRecord) : { ...emptyTotals(), requests: 1 };
}

function modelFromResponse(response: unknown, fallback: string): string {
  const model = recordFrom(response)?.model;
  return typeof model === 'string' && model.length > 0 ? model : fallback;
}

function cloneTotals(totals: ObservedOpenAIUsageTotals): ObservedOpenAIUsageTotals {
  return { ...totals };
}

function snapshotFromUsage(usage: MutableObservedOpenAIUsage): ObservedOpenAIUsageSnapshot {
  return {
    byModel: [...usage.groups.values()]
      .map((group) => ({ ...group }))
      .sort((a, b) =>
        a.operation === b.operation
          ? a.model.localeCompare(b.model)
          : a.operation.localeCompare(b.operation),
      ),
    byOperation: {
      'chat.completions': cloneTotals(usage.operationTotals['chat.completions']),
      embeddings: cloneTotals(usage.operationTotals.embeddings),
      moderations: cloneTotals(usage.operationTotals.moderations),
    },
    total: cloneTotals(usage.total),
  };
}

export async function withOpenAIUsageTracking<T>(
  callback: () => Promise<T>,
): Promise<{ result: T; usage: ObservedOpenAIUsageSnapshot }> {
  const usage = createMutableUsage();
  try {
    const result = await openAIUsageStorage.run(usage, callback);
    return { result, usage: snapshotFromUsage(usage) };
  } catch (error) {
    if (typeof error === 'object' && error !== null) {
      (error as { openAIUsageSnapshot?: ObservedOpenAIUsageSnapshot }).openAIUsageSnapshot =
        snapshotFromUsage(usage);
    }
    throw error;
  }
}

export function getOpenAIUsageSnapshotFromError(
  error: unknown,
): ObservedOpenAIUsageSnapshot | null {
  if (typeof error !== 'object' || error === null) return null;
  const snapshot = (error as { openAIUsageSnapshot?: unknown }).openAIUsageSnapshot;
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) return null;
  return snapshot as ObservedOpenAIUsageSnapshot;
}

export function recordOpenAIUsageResponse(
  operation: OpenAIUsageOperation,
  response: unknown,
  fallbackModel: string,
): void {
  const usage = openAIUsageStorage.getStore();
  if (!usage) return;

  const observed = usageFromResponse(response);
  const model = modelFromResponse(response, fallbackModel);
  const key = `${operation}:${model}`;
  const group = usage.groups.get(key) ?? {
    ...emptyTotals(),
    model,
    operation,
  };

  addTotals(group, observed);
  addTotals(usage.operationTotals[operation], observed);
  addTotals(usage.total, observed);
  usage.groups.set(key, group);
}

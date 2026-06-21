export type OpenAIUsageBucketWidth = '1m' | '1h' | '1d';

export type OpenAIUsageCategory =
  | 'completions'
  | 'embeddings'
  | 'moderations'
  | 'images'
  | 'web_search_calls';

export interface OpenAICostAmount {
  currency: string;
  value: number;
}

export interface OpenAIUsageTotals {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  requests: number;
}

export interface OpenAIUsageGroup extends OpenAIUsageTotals {
  apiKeyId?: string;
  category: OpenAIUsageCategory;
  lineItem?: string;
  model?: string;
  projectId?: string;
  userId?: string;
}

export interface OpenAICostGroup {
  amount: OpenAICostAmount;
  apiKeyId?: string;
  lineItem?: string;
  projectId?: string;
  quantity?: number;
}

export interface OpenAIUsagePeriod {
  bucketWidth: OpenAIUsageBucketWidth;
  endTime: string;
  startTime: string;
}

export interface OpenAIUsageAndCostSummary {
  costs: {
    groups: OpenAICostGroup[];
    total: OpenAICostAmount | null;
  };
  period: OpenAIUsagePeriod;
  usage: {
    byCategory: Record<OpenAIUsageCategory, OpenAIUsageTotals>;
    groups: OpenAIUsageGroup[];
    total: OpenAIUsageTotals;
  };
}

export interface FetchOpenAIUsageAndCostsOptions {
  apiKey: string;
  bucketWidth?: OpenAIUsageBucketWidth;
  endTime: Date;
  fetchImpl?: typeof fetch;
  groupBy?: string[];
  startTime: Date;
  timeoutMs?: number;
  usageCategories?: OpenAIUsageCategory[];
}

type PageResponse = {
  data?: Array<{
    results?: unknown[];
  }>;
  has_more?: boolean;
  next_page?: string | null;
};

const OPENAI_ADMIN_BASE_URL = 'https://api.openai.com/v1';
const OPENAI_ADMIN_FETCH_TIMEOUT_MS = 15_000;
const OPENAI_ADMIN_MAX_PAGES = 100;
const USAGE_CATEGORIES: OpenAIUsageCategory[] = [
  'completions',
  'embeddings',
  'moderations',
  'images',
  'web_search_calls',
];

function emptyUsageTotals(): OpenAIUsageTotals {
  return {
    cachedInputTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    requests: 0,
  };
}

function addUsageTotals(target: OpenAIUsageTotals, source: OpenAIUsageTotals): void {
  target.cachedInputTokens += source.cachedInputTokens;
  target.inputTokens += source.inputTokens;
  target.outputTokens += source.outputTokens;
  target.requests += source.requests;
}

function numberFromRecord(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function stringFromRecord(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function resultRecords(page: PageResponse): Record<string, unknown>[] {
  return (page.data ?? []).flatMap((bucket) =>
    (bucket.results ?? []).filter(
      (result): result is Record<string, unknown> =>
        typeof result === 'object' && result !== null && !Array.isArray(result),
    ),
  );
}

function buildAdminUrl(
  path: string,
  options: {
    bucketWidth: OpenAIUsageBucketWidth;
    endTime: Date;
    groupBy: string[];
    page?: string;
    startTime: Date;
  },
): URL {
  const url = new URL(`${OPENAI_ADMIN_BASE_URL}${path}`);
  url.searchParams.set('start_time', String(Math.floor(options.startTime.getTime() / 1000)));
  url.searchParams.set('end_time', String(Math.ceil(options.endTime.getTime() / 1000)));
  url.searchParams.set('bucket_width', options.bucketWidth);
  for (const group of options.groupBy) {
    url.searchParams.append('group_by[]', group);
  }
  if (options.page) {
    url.searchParams.set('page', options.page);
  }
  return url;
}

async function fetchPagedAdminResults(
  path: string,
  options: Required<Pick<FetchOpenAIUsageAndCostsOptions, 'apiKey' | 'fetchImpl'>> & {
    bucketWidth: OpenAIUsageBucketWidth;
    endTime: Date;
    groupBy: string[];
    startTime: Date;
    timeoutMs?: number;
  },
): Promise<Record<string, unknown>[]> {
  const records: Record<string, unknown>[] = [];
  let page: string | undefined;

  for (let pageCount = 0; pageCount < OPENAI_ADMIN_MAX_PAGES; pageCount += 1) {
    const url = buildAdminUrl(path, { ...options, page });
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? OPENAI_ADMIN_FETCH_TIMEOUT_MS,
    );
    const response = await options
      .fetchImpl(url, {
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
        },
        signal: controller.signal,
      })
      .finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `OpenAI Admin API ${path} failed with ${response.status}${body ? `: ${body}` : ''}`,
      );
    }

    const payload = (await response.json()) as PageResponse;
    records.push(...resultRecords(payload));
    if (!payload.has_more) break;
    if (!payload.next_page) {
      throw new Error(`OpenAI Admin API ${path} indicated more pages without next_page`);
    }
    if (pageCount === OPENAI_ADMIN_MAX_PAGES - 1) {
      throw new Error(
        `OpenAI Admin API ${path} pagination exceeded ${OPENAI_ADMIN_MAX_PAGES} pages`,
      );
    }
    page = payload.next_page;
  }

  return records;
}

function usageTotalsFromResult(result: Record<string, unknown>): OpenAIUsageTotals {
  return {
    cachedInputTokens: numberFromRecord(result, 'input_cached_tokens'),
    inputTokens: numberFromRecord(result, 'input_tokens'),
    outputTokens: numberFromRecord(result, 'output_tokens'),
    requests:
      numberFromRecord(result, 'num_model_requests') ||
      numberFromRecord(result, 'num_requests') ||
      numberFromRecord(result, 'num_images'),
  };
}

function costGroupFromResult(result: Record<string, unknown>): OpenAICostGroup | null {
  const amount = result.amount;
  if (typeof amount !== 'object' || amount === null || Array.isArray(amount)) return null;
  const amountRecord = amount as Record<string, unknown>;
  const currency = stringFromRecord(amountRecord, 'currency') ?? 'usd';
  const value = numberFromRecord(amountRecord, 'value');

  return {
    amount: { currency, value },
    apiKeyId: stringFromRecord(result, 'api_key_id'),
    lineItem: stringFromRecord(result, 'line_item'),
    projectId: stringFromRecord(result, 'project_id'),
    quantity: numberFromRecord(result, 'quantity') || undefined,
  };
}

function totalCosts(groups: OpenAICostGroup[]): OpenAICostAmount | null {
  if (groups.length === 0) return null;
  const currency = groups[0]?.amount.currency ?? 'usd';
  return {
    currency,
    value: groups
      .filter((group) => group.amount.currency === currency)
      .reduce((sum, group) => sum + group.amount.value, 0),
  };
}

export async function fetchOpenAIUsageAndCosts(
  options: FetchOpenAIUsageAndCostsOptions,
): Promise<OpenAIUsageAndCostSummary> {
  const bucketWidth = options.bucketWidth ?? '1d';
  const fetchImpl = options.fetchImpl ?? fetch;
  const groupBy = options.groupBy ?? ['model', 'project_id'];
  const usageCategories = options.usageCategories ?? USAGE_CATEGORIES;
  const sharedOptions = {
    apiKey: options.apiKey,
    bucketWidth,
    endTime: options.endTime,
    fetchImpl,
    groupBy,
    startTime: options.startTime,
    timeoutMs: options.timeoutMs,
  };

  const [costResults, ...usageResults] = await Promise.all([
    fetchPagedAdminResults('/organization/costs', {
      ...sharedOptions,
      groupBy: ['line_item', 'project_id'],
    }),
    ...usageCategories.map((category) =>
      fetchPagedAdminResults(`/organization/usage/${category}`, sharedOptions),
    ),
  ]);

  const byCategory = Object.fromEntries(
    USAGE_CATEGORIES.map((category) => [category, emptyUsageTotals()]),
  ) as Record<OpenAIUsageCategory, OpenAIUsageTotals>;
  const total = emptyUsageTotals();
  const groups: OpenAIUsageGroup[] = [];

  usageResults.forEach((categoryResults, index) => {
    const category = usageCategories[index]!;
    for (const result of categoryResults) {
      const usage = usageTotalsFromResult(result);
      addUsageTotals(byCategory[category], usage);
      addUsageTotals(total, usage);
      groups.push({
        ...usage,
        apiKeyId: stringFromRecord(result, 'api_key_id'),
        category,
        model: stringFromRecord(result, 'model'),
        projectId: stringFromRecord(result, 'project_id'),
        userId: stringFromRecord(result, 'user_id'),
      });
    }
  });

  const costGroups = costResults
    .map((result) => costGroupFromResult(result))
    .filter((group): group is OpenAICostGroup => group !== null);

  return {
    costs: {
      groups: costGroups,
      total: totalCosts(costGroups),
    },
    period: {
      bucketWidth,
      endTime: options.endTime.toISOString(),
      startTime: options.startTime.toISOString(),
    },
    usage: {
      byCategory,
      groups,
      total,
    },
  };
}

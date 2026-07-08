import { describe, expect, it, vi } from 'vitest';

import { fetchOpenAIUsageAndCosts } from './openaiUsage.js';

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
}

describe('fetchOpenAIUsageAndCosts', () => {
  it('fetches admin costs and usage buckets and aggregates totals', async () => {
    const fetchImpl = vi.fn(async (url: URL | RequestInfo) => {
      const href = String(url);
      if (href.includes('/organization/costs')) {
        return jsonResponse({
          data: [
            {
              results: [
                {
                  amount: { currency: 'usd', value: 0.25 },
                  line_item: 'gpt-5.4-mini',
                  project_id: 'proj_123',
                },
              ],
            },
          ],
          has_more: false,
        });
      }
      if (href.includes('/organization/usage/completions')) {
        return jsonResponse({
          data: [
            {
              results: [
                {
                  input_cached_tokens: 3,
                  input_tokens: 100,
                  model: 'gpt-5.4-mini',
                  num_model_requests: 2,
                  output_tokens: 40,
                  project_id: 'proj_123',
                },
              ],
            },
          ],
          has_more: false,
        });
      }
      if (href.includes('/organization/usage/embeddings')) {
        return jsonResponse({
          data: [
            {
              results: [
                {
                  input_tokens: 80,
                  model: 'text-embedding-3-large',
                  num_model_requests: 1,
                  project_id: 'proj_123',
                },
              ],
            },
          ],
          has_more: false,
        });
      }
      return jsonResponse({ data: [{ results: [] }], has_more: false });
    });

    const summary = await fetchOpenAIUsageAndCosts({
      apiKey: 'admin-key',
      bucketWidth: '1d',
      endTime: new Date('2026-06-20T00:00:00.000Z'),
      fetchImpl,
      startTime: new Date('2026-06-19T00:00:00.000Z'),
    });

    expect(fetchImpl).toHaveBeenCalledTimes(6);
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/organization/costs');
    expect(String(fetchImpl.mock.calls[0][0])).toContain('bucket_width=1d');
    expect(String(fetchImpl.mock.calls[0][0])).toContain('group_by%5B%5D=line_item');
    expect(summary.costs.total).toEqual({ currency: 'usd', value: 0.25 });
    expect(summary.usage.total).toEqual({
      cachedInputTokens: 3,
      inputTokens: 180,
      outputTokens: 40,
      requests: 3,
    });
    expect(summary.usage.byCategory.completions.requests).toBe(2);
    expect(summary.usage.byCategory.embeddings.inputTokens).toBe(80);
  });

  it('follows paginated admin responses without truncating after ten pages', async () => {
    const fetchImpl = vi.fn(async (url: URL | RequestInfo) => {
      const page = new URL(String(url)).searchParams.get('page');
      const pageNumber = page ? Number(page.replace('page-', '')) : 0;

      return jsonResponse({
        data: [
          {
            results: [
              {
                amount: { currency: 'usd', value: 0.01 },
                line_item: `line-${pageNumber}`,
              },
            ],
          },
        ],
        has_more: pageNumber < 11,
        next_page: `page-${pageNumber + 1}`,
      });
    });

    const summary = await fetchOpenAIUsageAndCosts({
      apiKey: 'admin-key',
      endTime: new Date('2026-06-20T00:00:00.000Z'),
      fetchImpl,
      startTime: new Date('2026-06-19T00:00:00.000Z'),
      usageCategories: [],
    });

    expect(fetchImpl).toHaveBeenCalledTimes(12);
    expect(summary.costs.groups).toHaveLength(12);
    expect(summary.costs.total?.currency).toBe('usd');
    expect(summary.costs.total?.value).toBeCloseTo(0.12);
  });

  it('fails when a paginated admin response omits next_page', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        data: [{ results: [] }],
        has_more: true,
      }),
    );

    await expect(
      fetchOpenAIUsageAndCosts({
        apiKey: 'admin-key',
        endTime: new Date('2026-06-20T00:00:00.000Z'),
        fetchImpl,
        startTime: new Date('2026-06-19T00:00:00.000Z'),
        usageCategories: [],
      }),
    ).rejects.toThrow('indicated more pages without next_page');
  });

  it('fails when admin pagination exceeds the defensive page cap', async () => {
    const fetchImpl = vi.fn(async (url: URL | RequestInfo) => {
      const page = new URL(String(url)).searchParams.get('page');
      const pageNumber = page ? Number(page.replace('page-', '')) : 0;

      return jsonResponse({
        data: [{ results: [] }],
        has_more: true,
        next_page: `page-${pageNumber + 1}`,
      });
    });

    await expect(
      fetchOpenAIUsageAndCosts({
        apiKey: 'admin-key',
        endTime: new Date('2026-06-20T00:00:00.000Z'),
        fetchImpl,
        startTime: new Date('2026-06-19T00:00:00.000Z'),
        usageCategories: [],
      }),
    ).rejects.toThrow('pagination exceeded 100 pages');
    expect(fetchImpl).toHaveBeenCalledTimes(100);
  });

  it('passes an abort signal to admin API fetches', async () => {
    const fetchImpl = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return jsonResponse({ data: [{ results: [] }], has_more: false });
    });

    await fetchOpenAIUsageAndCosts({
      apiKey: 'admin-key',
      endTime: new Date('2026-06-20T00:00:00.000Z'),
      fetchImpl,
      startTime: new Date('2026-06-19T00:00:00.000Z'),
      timeoutMs: 25,
      usageCategories: [],
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it } from 'vitest';

import {
  formatProviderUsageCost,
  providerUsageText,
  providerUsageViewFromReport,
} from './providerUsageViewModel';

describe('providerUsageViewModel', () => {
  it('extracts observed usage and interval cost from a live eval report', () => {
    const view = providerUsageViewFromReport({
      providerUsage: {
        admin: {
          attribution: 'interval',
          summary: {
            costs: {
              total: { currency: 'usd', value: 0.42 },
            },
          },
        },
        observed: {
          total: {
            inputTokens: 1200,
            outputTokens: 345,
            requests: 7,
          },
        },
      },
    });

    expect(view).toEqual({
      attribution: 'interval',
      cost: { currency: 'usd', value: 0.42 },
      inputTokens: 1200,
      outputTokens: 345,
      requests: 7,
    });
    expect(formatProviderUsageCost(view?.cost ?? null)).toBe('$0.42');
    expect(providerUsageText(view)).toBe('7 req, 1,200 in / 345 out');
  });

  it('returns null when report has no provider usage', () => {
    expect(providerUsageViewFromReport({})).toBeNull();
    expect(providerUsageText(null)).toBe('-');
  });
});

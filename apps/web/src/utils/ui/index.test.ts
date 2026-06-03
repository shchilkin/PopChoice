import { describe, expect, it } from 'vitest';

import { getSimilarityTier, scaleSimilarity } from './index';

describe('recommendation similarity display helpers', () => {
  it('scales raw similarity against the current empirical ceiling', () => {
    expect(scaleSimilarity(0.31)).toBe(50);
    expect(scaleSimilarity(0.62)).toBe(100);
    expect(scaleSimilarity(0.9)).toBe(100);
  });

  it('maps display percentages into user-facing tiers', () => {
    expect(getSimilarityTier(0.56)).toMatchObject({ pct: 90, tier: 'strong' });
    expect(getSimilarityTier(0.43)).toMatchObject({ pct: 69, tier: 'good' });
    expect(getSimilarityTier(0.3)).toMatchObject({ pct: 48, tier: 'possible' });
    expect(getSimilarityTier(0.18)).toMatchObject({ pct: 29, tier: 'wildcard' });
  });
});

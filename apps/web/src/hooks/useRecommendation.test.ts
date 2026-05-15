import { describe, expect, it } from 'vitest';

import { RecommendationFetchError, shouldRetryRecommendationFetch } from './useRecommendation';

describe('shouldRetryRecommendationFetch', () => {
  it.each([401, 403, 404])('does not retry hard HTTP %s failures', (status) => {
    expect(shouldRetryRecommendationFetch(0, new RecommendationFetchError('failed', status))).toBe(
      false,
    );
  });

  it('retries transient recommendation fetch failures up to three times', () => {
    const error = new RecommendationFetchError('failed', 500);

    expect(shouldRetryRecommendationFetch(0, error)).toBe(true);
    expect(shouldRetryRecommendationFetch(2, error)).toBe(true);
    expect(shouldRetryRecommendationFetch(3, error)).toBe(false);
  });
});

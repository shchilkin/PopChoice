import { describe, expect, it } from 'vitest';

import { getRecommendationStageProgress, RECOMMENDATION_STAGES } from './stages';

describe('recommendation stages', () => {
  it('keeps failed as an explicit terminal stage', () => {
    expect(RECOMMENDATION_STAGES).toContain('failed');
    expect(getRecommendationStageProgress('failed')).toBe(100);
  });

  it('does not imply progress for an unknown or missing stage', () => {
    expect(getRecommendationStageProgress(undefined)).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';

import {
  enqueueRecommendationEvalFromBackoffice,
  getRecommendationEvalJobId,
} from './recommendationEvalQueue';

describe('recommendation eval queue helpers', () => {
  it('sanitizes eval run ids for deterministic BullMQ job ids', () => {
    expect(getRecommendationEvalJobId('run:abc/123')).toBe('recommendation-eval-run-abc-123');
  });

  it('does not pretend to queue work when Redis is unavailable', async () => {
    await expect(
      enqueueRecommendationEvalFromBackoffice(
        { mode: 'real-data', runId: '11111111-1111-4111-8111-111111111111' },
        undefined,
      ),
    ).resolves.toBeNull();
  });

  it('accepts live mode for guarded backoffice enqueue callers', async () => {
    await expect(
      enqueueRecommendationEvalFromBackoffice(
        { mode: 'live', runId: '11111111-1111-4111-8111-111111111111' },
        undefined,
      ),
    ).resolves.toBeNull();
  });
});

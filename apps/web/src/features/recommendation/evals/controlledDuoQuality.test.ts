import { describe, expect, it, vi } from 'vitest';

import {
  buildControlledDuoProtocolReport,
  controlledDuoQualityProtocol,
  runControlledDuoQualityEval,
  scoreControlledDuoQualityResponse,
  validateControlledDuoQualityProtocol,
} from './controlledDuoQuality';

const representativeResponse = {
  description:
    'Alex gets the playful romantic urgency and human-scale charm, while Sam gets kinetic pacing, bold visual style, and constant momentum. Run Lola Run turns those tastes into one compact choice instead of asking either person to surrender the qualities they care about.',
  title: 'Run Lola Run',
};

describe('controlled Duo quality protocol', () => {
  it('validates the fixed candidate set without calling a provider', () => {
    const report = buildControlledDuoProtocolReport('2026-07-16T00:00:00.000Z');

    expect(report).toMatchObject({
      automatedChecksPassed: null,
      generatedAt: '2026-07-16T00:00:00.000Z',
      mode: 'protocol',
      providerCallCount: 0,
      response: null,
      reviewStatus: 'not-run',
      status: 'protocol-ready',
    });
    expect(validateControlledDuoQualityProtocol().every((check) => check.passed)).toBe(true);
    expect(controlledDuoQualityProtocol.candidates).toHaveLength(4);
  });

  it('passes automated checks but keeps subjective quality pending owner review', async () => {
    const provider = vi.fn().mockResolvedValue(representativeResponse);
    const report = await runControlledDuoQualityEval(provider, '2026-07-16T00:00:00.000Z');

    expect(provider).toHaveBeenCalledWith(
      controlledDuoQualityProtocol.candidates,
      controlledDuoQualityProtocol.people,
      'en',
    );
    expect(report).toMatchObject({
      automatedChecksPassed: true,
      mode: 'live',
      providerCallCount: 1,
      response: representativeResponse,
      reviewStatus: 'pending-owner-review',
      status: 'awaiting-owner-review',
    });
    expect(report.responseChecks.every((check) => check.passed)).toBe(true);
  });

  it('rejects a title outside the bounded candidate set', () => {
    const checks = scoreControlledDuoQualityResponse({
      ...representativeResponse,
      title: 'Everything Everywhere All at Once',
    });

    expect(checks.find((check) => check.id === 'bounded-selection')).toMatchObject({
      passed: false,
    });
    expect(checks.find((check) => check.id === 'bridge-selection')).toMatchObject({
      passed: false,
    });
  });

  it('rejects an explanation that only represents one taste profile', () => {
    const checks = scoreControlledDuoQualityResponse({
      description:
        'Alex and Sam get a whimsical, romantic, playful comedy with charming characters and a humane point of view, presented as one concise choice for tonight.',
      title: 'Run Lola Run',
    });

    expect(checks.find((check) => check.id === 'alex-representation')).toMatchObject({
      passed: true,
    });
    expect(checks.find((check) => check.id === 'sam-representation')).toMatchObject({
      passed: false,
    });
  });

  it('rejects a valid candidate that was not pre-declared as a strong bridge', () => {
    const checks = scoreControlledDuoQualityResponse({
      ...representativeResponse,
      title: 'The Grand Budapest Hotel',
    });

    expect(checks.find((check) => check.id === 'bounded-selection')).toMatchObject({
      passed: true,
    });
    expect(checks.find((check) => check.id === 'bridge-selection')).toMatchObject({
      passed: false,
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAdd,
  mockCreateRecommendationEvalRun,
  mockEnsureRecommendationEvalRunSchema,
  mockFailRecommendationEvalRun,
  mockGetTraceCarrier,
  mockInitDatabase,
  mockMarkRecommendationEvalRunQueued,
} = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockCreateRecommendationEvalRun: vi.fn(),
  mockEnsureRecommendationEvalRunSchema: vi.fn(),
  mockFailRecommendationEvalRun: vi.fn(),
  mockGetTraceCarrier: vi.fn(),
  mockInitDatabase: vi.fn(),
  mockMarkRecommendationEvalRunQueued: vi.fn(),
}));

vi.mock('@pop-choice/shared', () => ({
  createRecommendationEvalRun: mockCreateRecommendationEvalRun,
  ensureRecommendationEvalRunSchema: mockEnsureRecommendationEvalRunSchema,
  failRecommendationEvalRun: mockFailRecommendationEvalRun,
  initDatabase: mockInitDatabase,
  markRecommendationEvalRunQueued: mockMarkRecommendationEvalRunQueued,
}));
vi.mock('@/lib/jobQueue', () => ({
  RECOMMENDATION_EVAL_JOB_NAMES: { runRecommendationEval: 'run-recommendation-eval' },
  RECOMMENDATION_EVAL_JOB_OPTIONS: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 100,
    timeout: 120000,
  },
  RECOMMENDATION_EVAL_QUEUE_NAME: 'recommendation-evals',
  recommendationEvalQueue: { add: mockAdd },
}));
vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/lib/tracing', () => ({
  getTraceCarrier: mockGetTraceCarrier,
  withTraceSpan: (_name: string, _options: unknown, callback: (span: unknown) => Promise<void>) =>
    callback({ setAttribute: vi.fn() }),
}));

import { enqueueRecommendationEvalRun, getRecommendationEvalJobId } from './jobs';

function runRow(overrides: Record<string, unknown> = {}) {
  return {
    actor: 'operator',
    appVersion: null,
    completedAt: null,
    createdAt: '2026-05-29 09:00:00+00',
    errorMessage: null,
    gitSha: null,
    id: '11111111-1111-4111-8111-111111111111',
    jobId: null,
    jobName: null,
    mode: 'real-data',
    queuedAt: null,
    queueName: null,
    report: {},
    requestedOptions: {},
    source: 'backoffice',
    startedAt: null,
    status: 'pending',
    summary: {},
    updatedAt: '2026-05-29 09:00:00+00',
    ...overrides,
  };
}

describe('recommendation eval queue jobs', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockGetTraceCarrier.mockReturnValue({ traceparent: 'trace' });
    mockEnsureRecommendationEvalRunSchema.mockResolvedValue(undefined);
    mockCreateRecommendationEvalRun.mockResolvedValue(runRow());
    mockAdd.mockResolvedValue({ id: 'recommendation-eval-11111111-1111-4111-8111-111111111111' });
    mockMarkRecommendationEvalRunQueued.mockResolvedValue(
      runRow({
        jobId: 'recommendation-eval-11111111-1111-4111-8111-111111111111',
        jobName: 'run-recommendation-eval',
        queueName: 'recommendation-evals',
        status: 'queued',
      }),
    );
    mockFailRecommendationEvalRun.mockResolvedValue(runRow({ status: 'enqueue_failed' }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('builds deterministic job ids from run ids', () => {
    expect(getRecommendationEvalJobId('abc-123')).toBe('recommendation-eval-abc-123');
  });

  it('creates an eval run and queues a non-live BullMQ job', async () => {
    const result = await enqueueRecommendationEvalRun({
      actor: 'operator',
      mode: 'real-data',
      requestedOptions: { fixtureSet: 'default' },
    });

    expect(mockInitDatabase).toHaveBeenCalledWith('postgres://localhost/test');
    expect(mockEnsureRecommendationEvalRunSchema).toHaveBeenCalled();
    expect(mockCreateRecommendationEvalRun).toHaveBeenCalledWith({
      actor: 'operator',
      appVersion: undefined,
      gitSha: undefined,
      mode: 'real-data',
      requestedOptions: { fixtureSet: 'default' },
      source: 'backoffice',
    });
    expect(mockAdd).toHaveBeenCalledWith(
      'run-recommendation-eval',
      {
        mode: 'real-data',
        runId: '11111111-1111-4111-8111-111111111111',
        trace: { traceparent: 'trace' },
        version: 1,
      },
      expect.objectContaining({
        jobId: 'recommendation-eval-11111111-1111-4111-8111-111111111111',
        timeout: 120000,
      }),
    );
    expect(mockMarkRecommendationEvalRunQueued).toHaveBeenCalledWith({
      jobId: 'recommendation-eval-11111111-1111-4111-8111-111111111111',
      jobName: 'run-recommendation-eval',
      queueName: 'recommendation-evals',
      runId: '11111111-1111-4111-8111-111111111111',
    });
    expect(result).toMatchObject({ queued: true, run: { status: 'queued' } });
  });

  it('marks the run enqueue_failed when BullMQ add fails', async () => {
    mockAdd.mockRejectedValueOnce(new Error('redis down'));

    await expect(enqueueRecommendationEvalRun()).rejects.toThrow('redis down');

    expect(mockFailRecommendationEvalRun).toHaveBeenCalledWith({
      errorMessage: 'redis down',
      runId: '11111111-1111-4111-8111-111111111111',
      status: 'enqueue_failed',
    });
  });
});

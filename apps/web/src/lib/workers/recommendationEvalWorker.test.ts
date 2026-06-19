import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  capturedProcessor,
  mockCompleteRecommendationEvalRun,
  mockCreateBullMQConnection,
  mockEnsureRecommendationEvalRunSchema,
  mockFailRecommendationEvalRun,
  mockInitDatabase,
  mockMarkRecommendationEvalRunProcessing,
  mockRecordQueueJobEvent,
  mockRunRecommendationEvals,
  mockWorkerOn,
  MockWorker,
} = vi.hoisted(() => {
  const capturedProcessor: { current: ((job: unknown) => Promise<void>) | null } = {
    current: null,
  };
  const mockWorkerOn = vi.fn();

  function MockWorker(
    this: { on: ReturnType<typeof vi.fn>; waitUntilReady: ReturnType<typeof vi.fn> },
    _queue: string,
    processor: (job: unknown) => Promise<void>,
  ) {
    capturedProcessor.current = processor;
    this.on = mockWorkerOn;
    this.waitUntilReady = vi.fn().mockResolvedValue(undefined);
  }

  return {
    capturedProcessor,
    mockCompleteRecommendationEvalRun: vi.fn(),
    mockCreateBullMQConnection: vi.fn(),
    mockEnsureRecommendationEvalRunSchema: vi.fn(),
    mockFailRecommendationEvalRun: vi.fn(),
    mockInitDatabase: vi.fn(),
    mockMarkRecommendationEvalRunProcessing: vi.fn(),
    mockRecordQueueJobEvent: vi.fn(),
    mockRunRecommendationEvals: vi.fn(),
    mockWorkerOn,
    MockWorker,
  };
});

vi.mock('bullmq', () => ({ Worker: MockWorker }));
vi.mock('@pop-choice/shared', () => ({
  completeRecommendationEvalRun: mockCompleteRecommendationEvalRun,
  ensureRecommendationEvalRunSchema: mockEnsureRecommendationEvalRunSchema,
  failRecommendationEvalRun: mockFailRecommendationEvalRun,
  initDatabase: mockInitDatabase,
  markRecommendationEvalRunProcessing: mockMarkRecommendationEvalRunProcessing,
}));
vi.mock('@/features/recommendation/evals/fixtures', () => ({
  recommendationEvalFixtures: [
    {
      candidates: [{ name: 'Paddington 2', year: 2017 }],
      description: 'fixture',
      expectations: { allowedMainTitles: ['Paddington 2'] },
      id: 'solo-fast-safe-hit',
      locale: 'en',
      mockResponse: { title: 'Paddington 2', description: 'Kind and funny.', similarMovies: [] },
      name: 'Solo fast safe hit',
      people: [],
      userMemories: [],
    },
  ],
}));
vi.mock('@/features/recommendation/evals/runner', () => ({
  runRecommendationEvals: mockRunRecommendationEvals,
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
  createBullMQConnection: mockCreateBullMQConnection,
}));
vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/lib/metrics', () => ({
  recordQueueJobEvent: mockRecordQueueJobEvent,
}));
vi.mock('@/lib/tracing', () => ({
  withTraceSpan: (_name: string, _options: unknown, callback: () => Promise<void>) => callback(),
}));

import { createRecommendationEvalWorker } from './recommendationEvalWorker';

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    attemptsMade: 0,
    data: {
      mode: 'real-data',
      runId: '11111111-1111-4111-8111-111111111111',
      version: 1,
    },
    id: 'recommendation-eval-111',
    name: 'run-recommendation-eval',
    ...overrides,
  };
}

function evalReport(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: '2026-05-29T00:00:00.000Z',
    maxScore: 100,
    minPassingScore: 85,
    mode: 'real-data',
    passed: true,
    results: [
      {
        checks: [
          { details: 'ok', id: 'catalog', label: 'Catalog', maxScore: 0, passed: true, score: 0 },
        ],
        fixtureId: 'solo-fast-safe-hit',
        fixtureName: 'Solo fast safe hit',
        maxScore: 100,
        minPassingScore: 85,
        mode: 'real-data',
        passed: true,
        score: 100,
      },
    ],
    summary: { failed: 0, fixtureCount: 1, passed: 1 },
    ...overrides,
  };
}

describe('createRecommendationEvalWorker', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockCreateBullMQConnection.mockReturnValue({ host: 'localhost' });
    mockEnsureRecommendationEvalRunSchema.mockResolvedValue(undefined);
    mockMarkRecommendationEvalRunProcessing.mockResolvedValue(undefined);
    mockCompleteRecommendationEvalRun.mockResolvedValue(undefined);
    mockFailRecommendationEvalRun.mockResolvedValue(undefined);
    mockRunRecommendationEvals.mockResolvedValue(evalReport());
    mockRecordQueueJobEvent.mockReset();
    mockWorkerOn.mockReset();
    capturedProcessor.current = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns null when Redis is unavailable', () => {
    mockCreateBullMQConnection.mockReturnValue(null);

    const worker = createRecommendationEvalWorker();

    expect(worker).toBeNull();
  });

  it('processes a non-live eval job and persists fixture-level results', async () => {
    createRecommendationEvalWorker();

    expect(capturedProcessor.current).not.toBeNull();
    await capturedProcessor.current!(makeJob());

    expect(mockInitDatabase).toHaveBeenCalledTimes(2);
    expect(mockInitDatabase).toHaveBeenCalledWith('postgres://localhost/test');
    expect(mockEnsureRecommendationEvalRunSchema).toHaveBeenCalled();
    expect(mockMarkRecommendationEvalRunProcessing).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
    );
    expect(mockRunRecommendationEvals).toHaveBeenCalledWith({ mode: 'real-data' });
    expect(mockCompleteRecommendationEvalRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: '11111111-1111-4111-8111-111111111111',
        summary: { failed: 0, fixtureCount: 1, passed: 1 },
      }),
    );
    expect(mockCompleteRecommendationEvalRun.mock.calls[0][0].results[0]).toMatchObject({
      fixtureId: 'solo-fast-safe-hit',
      fixtureName: 'Solo fast safe hit',
      passed: true,
      response: { title: 'Paddington 2' },
      score: 100,
    });
    expect(mockInitDatabase.mock.invocationCallOrder[1]).toBeLessThan(
      mockCompleteRecommendationEvalRun.mock.invocationCallOrder[0],
    );
  });

  it('allows guarded live eval jobs to run through the same persisted worker path', async () => {
    mockRunRecommendationEvals.mockResolvedValueOnce(evalReport({ mode: 'live' }));

    createRecommendationEvalWorker();

    await capturedProcessor.current!(
      makeJob({
        data: {
          mode: 'live',
          runId: '11111111-1111-4111-8111-111111111111',
          version: 1,
        },
      }),
    );

    expect(mockRunRecommendationEvals).toHaveBeenCalledWith({ mode: 'live' });
    expect(mockCompleteRecommendationEvalRun).toHaveBeenCalledWith(
      expect.objectContaining({
        report: expect.objectContaining({ mode: 'live' }),
        runId: '11111111-1111-4111-8111-111111111111',
      }),
    );
  });

  it('marks the eval run failed and rethrows when the runner fails', async () => {
    mockRunRecommendationEvals.mockRejectedValueOnce(new Error('catalog unavailable'));

    createRecommendationEvalWorker();

    await expect(capturedProcessor.current!(makeJob())).rejects.toThrow('catalog unavailable');
    expect(mockInitDatabase).toHaveBeenCalledTimes(2);
    expect(mockFailRecommendationEvalRun).toHaveBeenCalledWith({
      errorMessage: 'catalog unavailable',
      runId: '11111111-1111-4111-8111-111111111111',
      status: 'failed',
    });
    expect(mockInitDatabase.mock.invocationCallOrder[1]).toBeLessThan(
      mockFailRecommendationEvalRun.mock.invocationCallOrder[0],
    );
  });

  it('records queue metrics for completed and failed events', () => {
    createRecommendationEvalWorker();

    const completedHandler = mockWorkerOn.mock.calls.find(([event]) => event === 'completed')?.[1];
    const failedHandler = mockWorkerOn.mock.calls.find(([event]) => event === 'failed')?.[1];

    completedHandler?.(makeJob());
    failedHandler?.(makeJob({ attemptsMade: 2 }), new Error('boom'));

    expect(mockRecordQueueJobEvent).toHaveBeenCalledWith({
      event: 'completed',
      final: true,
      job: 'run-recommendation-eval',
      queue: 'recommendation-evals',
    });
    expect(mockRecordQueueJobEvent).toHaveBeenCalledWith({
      event: 'failed',
      final: true,
      job: 'run-recommendation-eval',
      queue: 'recommendation-evals',
    });
  });
});

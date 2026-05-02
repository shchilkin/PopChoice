import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mocks so they are available inside vi.mock factories
// ---------------------------------------------------------------------------

const {
  mockWorkerOn,
  capturedProcessor,
  MockWorker,
  mockPgQuery,
  MockPool,
  mockRunMorePicksPipeline,
  mockInsertMorePicksMovies,
  mockGetRecommendationTMDBExcludeIds,
  mockUpdateMorePicksStatus,
  mockCreateBullMQConnection,
} = vi.hoisted(() => {
  const mockWorkerOn = vi.fn();
  // Mutable ref so the processor can be captured during Worker construction
  const capturedProcessor: { current: ((job: unknown) => Promise<void>) | null } = {
    current: null,
  };

  // Must be a regular function — arrow functions cannot be used with `new`
  function MockWorker(
    this: { on: ReturnType<typeof vi.fn> },
    _queue: string,
    processor: (job: unknown) => Promise<void>,
  ) {
    capturedProcessor.current = processor;
    this.on = mockWorkerOn;
  }

  const mockPgQuery = vi.fn();
  function MockPool(this: { query: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }) {
    this.query = mockPgQuery;
    this.end = vi.fn().mockResolvedValue(undefined);
  }

  const mockRunMorePicksPipeline = vi.fn();
  const mockInsertMorePicksMovies = vi.fn();
  const mockGetRecommendationTMDBExcludeIds = vi.fn();
  const mockUpdateMorePicksStatus = vi.fn();
  // Controls whether createBullMQConnection returns a connection or null
  const mockCreateBullMQConnection = vi.fn();

  return {
    mockWorkerOn,
    capturedProcessor,
    MockWorker,
    mockPgQuery,
    MockPool,
    mockRunMorePicksPipeline,
    mockInsertMorePicksMovies,
    mockGetRecommendationTMDBExcludeIds,
    mockUpdateMorePicksStatus,
    mockCreateBullMQConnection,
  };
});

vi.mock('bullmq', () => {
  function MockQueue() {
    /* @ts-expect-error – dynamic mock instance */
    this.add = vi.fn();
  }
  return { Worker: MockWorker, Queue: MockQueue };
});
vi.mock('pg', () => ({ default: { Pool: MockPool } }));
vi.mock('@/app/api/more-tmdb-picks/pipeline', () => ({
  runMorePicksPipeline: mockRunMorePicksPipeline,
}));
vi.mock('@/lib/db/recommendations', () => ({
  getRecommendationTMDBExcludeIds: mockGetRecommendationTMDBExcludeIds,
  insertMorePicksMovies: mockInsertMorePicksMovies,
  updateMorePicksStatus: mockUpdateMorePicksStatus,
}));
vi.mock('@/lib/jobQueue', () => ({
  MORE_PICKS_QUEUE_NAME: 'more-picks',
  MORE_PICKS_JOB_OPTIONS: {},
  createBullMQConnection: mockCreateBullMQConnection,
}));
vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks are in place
import { createMorePicksWorker } from './morePicksWorker';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJob(overrides: Partial<{ id: string; data: object; attemptsMade: number }> = {}) {
  return {
    id: 'job-1',
    attemptsMade: 0,
    data: {
      recommendationId: 'rec-uuid',
      slug: 'test-slug',
      locale: 'en',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createMorePicksWorker', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
    // By default simulate a live connection
    mockCreateBullMQConnection.mockReturnValue({ host: 'localhost' });
    mockPgQuery.mockReset();
    mockRunMorePicksPipeline.mockReset();
    mockInsertMorePicksMovies.mockReset();
    mockGetRecommendationTMDBExcludeIds.mockReset();
    mockUpdateMorePicksStatus.mockReset();
    mockWorkerOn.mockReset();
    capturedProcessor.current = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when REDIS_URL is not set', () => {
    mockCreateBullMQConnection.mockReturnValue(null);

    const worker = createMorePicksWorker();

    expect(worker).toBeNull();
  });

  it('creates a Worker and registers event listeners when Redis is available', () => {
    createMorePicksWorker();

    expect(mockWorkerOn).toHaveBeenCalledWith('completed', expect.any(Function));
    expect(mockWorkerOn).toHaveBeenCalledWith('failed', expect.any(Function));
  });

  it('processes a job successfully: fetches quiz_data, runs pipeline, inserts movies, marks completed', async () => {
    const quizData = { favoriteMovie: 'Inception', newVsClassic: 'new' };
    const movies = [{ id: -1, name: 'Movie A', year: 2020 }];

    mockPgQuery.mockResolvedValueOnce({ rows: [{ quiz_data: quizData }] });
    mockGetRecommendationTMDBExcludeIds.mockResolvedValueOnce([-321]);
    mockRunMorePicksPipeline.mockResolvedValueOnce(movies);
    mockInsertMorePicksMovies.mockResolvedValueOnce(undefined);
    mockUpdateMorePicksStatus.mockResolvedValue(undefined);

    createMorePicksWorker();

    expect(capturedProcessor.current).not.toBeNull();
    await capturedProcessor.current!(makeJob());

    expect(mockUpdateMorePicksStatus).toHaveBeenCalledWith('rec-uuid', 'processing');
    expect(mockGetRecommendationTMDBExcludeIds).toHaveBeenCalledWith('rec-uuid');
    expect(mockRunMorePicksPipeline).toHaveBeenCalledWith(quizData, [-321], 2, 'en');
    expect(mockInsertMorePicksMovies).toHaveBeenCalledWith('rec-uuid', movies);
    expect(mockUpdateMorePicksStatus).toHaveBeenCalledWith('rec-uuid', 'completed');
  });

  it('marks the job failed and rethrows when pipeline throws', async () => {
    const pipelineError = new Error('TMDB unreachable');

    mockPgQuery.mockResolvedValueOnce({ rows: [{ quiz_data: {} }] });
    mockGetRecommendationTMDBExcludeIds.mockResolvedValueOnce([]);
    mockRunMorePicksPipeline.mockRejectedValueOnce(pipelineError);
    mockUpdateMorePicksStatus.mockResolvedValue(undefined);

    createMorePicksWorker();

    expect(capturedProcessor.current).not.toBeNull();
    await expect(capturedProcessor.current!(makeJob())).rejects.toThrow('TMDB unreachable');

    expect(mockUpdateMorePicksStatus).toHaveBeenCalledWith(
      'rec-uuid',
      'failed',
      'TMDB unreachable',
    );
  });

  it('marks the job failed when quiz_data is not found in DB', async () => {
    mockPgQuery.mockResolvedValueOnce({ rows: [] }); // no quiz_data row
    mockUpdateMorePicksStatus.mockResolvedValue(undefined);

    createMorePicksWorker();

    expect(capturedProcessor.current).not.toBeNull();
    await expect(capturedProcessor.current!(makeJob())).rejects.toThrow(
      'Quiz data not found for recommendation',
    );

    expect(mockUpdateMorePicksStatus).toHaveBeenCalledWith(
      'rec-uuid',
      'failed',
      'Quiz data not found for recommendation',
    );
  });
});

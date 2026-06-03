import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeDatabase, initDatabase } from './db.js';
import {
  completeRecommendationEvalRun,
  createRecommendationEvalRun,
  ensureRecommendationEvalRunSchema,
  getRecommendationEvalRunDetail,
  listRecommendationEvalRunPage,
  markRecommendationEvalRunProcessing,
  markRecommendationEvalRunQueued,
} from './recommendationEvalRuns.js';

vi.mock('pg', () => {
  const mClient = {
    query: vi.fn(),
    release: vi.fn(),
  };
  const mPool = {
    connect: vi.fn().mockResolvedValue(mClient),
    query: vi.fn(),
    end: vi.fn(),
  };
  return {
    default: {
      Pool: vi.fn(function () {
        return mPool;
      }),
    },
  };
});

function runRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    mode: 'mock',
    status: 'pending',
    source: 'backoffice',
    actor: 'operator',
    queue_name: null,
    job_name: null,
    job_id: null,
    git_sha: 'abc123',
    app_version: null,
    requested_options: { fixtureSet: 'default' },
    report: {},
    summary: {},
    error_message: null,
    created_at: '2026-05-29 09:00:00+00',
    queued_at: null,
    started_at: null,
    completed_at: null,
    updated_at: '2026-05-29 09:00:00+00',
    ...overrides,
  };
}

function resultRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '7',
    run_id: '11111111-1111-4111-8111-111111111111',
    fixture_id: 'solo-fast-safe-hit',
    fixture_name: 'Solo fast safe hit',
    status: 'passed',
    passed: true,
    score: 93,
    max_score: 100,
    min_passing_score: 85,
    checks: [{ id: 'main-title', passed: true }],
    fixture_snapshot: { id: 'solo-fast-safe-hit' },
    response: { mainRecommendation: { name: 'Paddington 2' } },
    result: { score: 93 },
    error_message: null,
    created_at: '2026-05-29 09:00:01+00',
    ...overrides,
  };
}

describe('recommendation eval run storage', () => {
  let poolMock: any;
  let clientMock: any;

  beforeEach(() => {
    initDatabase('postgres://user:pass@localhost:5432/db');
    poolMock = new pg.Pool();
    clientMock = {
      query: vi.fn(),
      release: vi.fn(),
    };
    poolMock.connect.mockResolvedValue(clientMock);
  });

  afterEach(async () => {
    await closeDatabase();
    vi.clearAllMocks();
  });

  it('ensures durable eval run and result schema', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [] });

    await ensureRecommendationEvalRunSchema();

    const sql = String(poolMock.query.mock.calls[0][0]);
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS recommendation_eval_runs');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS recommendation_eval_results');
    expect(sql).toContain("mode IN ('mock', 'real-data', 'live')");
    expect(sql).toContain("'enqueue_failed'");
    expect(sql).toContain('idx_recommendation_eval_runs_job_id');
    expect(sql).toContain('idx_recommendation_eval_results_run_fixture');
  });

  it('creates runs and records queue lifecycle states', async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [runRow()] })
      .mockResolvedValueOnce({
        rows: [
          runRow({
            status: 'queued',
            queue_name: 'recommendation-evals',
            job_name: 'recommendation-eval',
            job_id: 'recommendation-eval-111',
            queued_at: '2026-05-29 09:01:00+00',
          }),
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          runRow({
            status: 'processing',
            started_at: '2026-05-29 09:02:00+00',
          }),
        ],
      });

    const created = await createRecommendationEvalRun({
      actor: 'operator',
      gitSha: 'abc123',
      mode: 'mock',
      requestedOptions: { fixtureSet: 'default' },
      source: 'backoffice',
    });
    const queued = await markRecommendationEvalRunQueued({
      jobId: 'recommendation-eval-111',
      jobName: 'recommendation-eval',
      queueName: 'recommendation-evals',
      runId: created.id,
    });
    const processing = await markRecommendationEvalRunProcessing(created.id);

    expect(created).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      mode: 'mock',
      source: 'backoffice',
      requestedOptions: { fixtureSet: 'default' },
    });
    expect(queued).toMatchObject({ status: 'queued', jobId: 'recommendation-eval-111' });
    expect(processing).toMatchObject({ status: 'processing' });
    expect(poolMock.query.mock.calls[0][1]).toEqual([
      'mock',
      'backoffice',
      'operator',
      null,
      null,
      null,
      'abc123',
      null,
      JSON.stringify({ fixtureSet: 'default' }),
    ]);
  });

  it('completes runs with fixture-level results in one transaction', async () => {
    clientMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [resultRow()] })
      .mockResolvedValueOnce({
        rows: [
          runRow({
            status: 'completed',
            completed_at: '2026-05-29 09:03:00+00',
            report: { passed: true },
            summary: { fixtureCount: 1, passed: 1, failed: 0 },
          }),
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const detail = await completeRecommendationEvalRun({
      report: { passed: true },
      results: [
        {
          checks: [{ id: 'main-title', passed: true }],
          fixtureId: 'solo-fast-safe-hit',
          fixtureName: 'Solo fast safe hit',
          fixtureSnapshot: { id: 'solo-fast-safe-hit' },
          maxScore: 100,
          minPassingScore: 85,
          passed: true,
          response: { mainRecommendation: { name: 'Paddington 2' } },
          result: { score: 93 },
          score: 93,
        },
      ],
      runId: '11111111-1111-4111-8111-111111111111',
    });

    expect(clientMock.query.mock.calls.map((call: unknown[]) => call[0])).toEqual([
      'BEGIN',
      'DELETE FROM recommendation_eval_results WHERE run_id = $1',
      expect.stringContaining('INSERT INTO recommendation_eval_results'),
      expect.stringContaining('UPDATE recommendation_eval_runs'),
      'COMMIT',
    ]);
    expect(clientMock.query.mock.calls[2][1][3]).toBe('passed');
    expect(clientMock.query.mock.calls[3][1][2]).toBe(
      JSON.stringify({ failed: 0, fixtureCount: 1, passed: 1 }),
    );
    expect(detail.run).toMatchObject({ status: 'completed' });
    expect(detail.results[0]).toMatchObject({ fixtureId: 'solo-fast-safe-hit', passed: true });
    expect(clientMock.release).toHaveBeenCalledTimes(1);
  });

  it('lists filtered pages and loads run details', async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [{ count: 3 }] })
      .mockResolvedValueOnce({
        rows: [
          runRow({
            status: 'completed',
            summary: { fixtureCount: 3, passed: 3, failed: 0 },
          }),
        ],
      })
      .mockResolvedValueOnce({ rows: [runRow({ status: 'completed' })] })
      .mockResolvedValueOnce({ rows: [resultRow()] });

    const page = await listRecommendationEvalRunPage({
      limit: 250,
      mode: 'mock',
      offset: 100_001,
      source: 'backoffice',
      status: 'completed',
    });
    const detail = await getRecommendationEvalRunDetail('11111111-1111-4111-8111-111111111111');

    expect(page).toMatchObject({
      limit: 100,
      offset: 100_000,
      totalCount: 3,
      runs: [{ status: 'completed', summary: { fixtureCount: 3, passed: 3, failed: 0 } }],
    });
    expect(poolMock.query.mock.calls[0][1]).toEqual(['mock', 'backoffice', 'completed']);
    expect(poolMock.query.mock.calls[1][1]).toEqual([
      'mock',
      'backoffice',
      'completed',
      100,
      100_000,
    ]);
    expect(detail).toMatchObject({
      run: { status: 'completed' },
      results: [{ fixtureId: 'solo-fast-safe-hit', score: 93 }],
    });
  });
});

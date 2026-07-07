import { getPool } from './db.js';
import { RECOMMENDATION_EVAL_RUN_SCHEMA_SQL } from './recommendationEvalSchema.js';

export type RecommendationEvalRunMode = 'mock' | 'real-data' | 'live';
export type RecommendationEvalRunStatus =
  'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'enqueue_failed' | 'canceled';
export type RecommendationEvalRunSource = 'cli' | 'backoffice' | 'schedule' | 'worker' | 'ci';
export type RecommendationEvalResultStatus = 'passed' | 'failed' | 'error';

export interface RecommendationEvalRun {
  id: string;
  mode: RecommendationEvalRunMode;
  status: RecommendationEvalRunStatus;
  source: RecommendationEvalRunSource;
  actor: string | null;
  queueName: string | null;
  jobName: string | null;
  jobId: string | null;
  gitSha: string | null;
  appVersion: string | null;
  requestedOptions: Record<string, unknown>;
  report: Record<string, unknown>;
  summary: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  queuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface RecommendationEvalResult {
  id: string;
  runId: string;
  fixtureId: string;
  fixtureName: string;
  status: RecommendationEvalResultStatus;
  passed: boolean;
  score: number;
  maxScore: number;
  minPassingScore: number;
  checks: unknown[];
  fixtureSnapshot: Record<string, unknown>;
  response: Record<string, unknown>;
  result: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
}

export interface CreateRecommendationEvalRunInput {
  mode: RecommendationEvalRunMode;
  source?: RecommendationEvalRunSource;
  actor?: string;
  queueName?: string;
  jobName?: string;
  jobId?: string;
  gitSha?: string;
  appVersion?: string;
  requestedOptions?: Record<string, unknown>;
}

export interface MarkRecommendationEvalRunQueuedInput {
  runId: string;
  queueName: string;
  jobName: string;
  jobId: string;
}

export interface CompleteRecommendationEvalRunResultInput {
  fixtureId: string;
  fixtureName: string;
  passed: boolean;
  score: number;
  maxScore: number;
  minPassingScore: number;
  checks?: unknown[];
  fixtureSnapshot?: Record<string, unknown>;
  response?: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string;
}

export interface CompleteRecommendationEvalRunInput {
  runId: string;
  report: Record<string, unknown>;
  summary?: Record<string, unknown>;
  results?: CompleteRecommendationEvalRunResultInput[];
}

export interface FailRecommendationEvalRunInput {
  runId: string;
  errorMessage: string;
  status?: Extract<RecommendationEvalRunStatus, 'failed' | 'enqueue_failed' | 'canceled'>;
  report?: Record<string, unknown>;
  summary?: Record<string, unknown>;
}

export interface ListRecommendationEvalRunPageOptions {
  limit?: number;
  offset?: number;
  mode?: RecommendationEvalRunMode;
  source?: RecommendationEvalRunSource;
  status?: RecommendationEvalRunStatus;
}

export interface RecommendationEvalRunPage {
  runs: RecommendationEvalRun[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface RecommendationEvalRunDetail {
  run: RecommendationEvalRun;
  results: RecommendationEvalResult[];
}

type RecommendationEvalRunRow = {
  id: string;
  mode: RecommendationEvalRunMode;
  status: RecommendationEvalRunStatus;
  source: RecommendationEvalRunSource;
  actor: string | null;
  queue_name: string | null;
  job_name: string | null;
  job_id: string | null;
  git_sha: string | null;
  app_version: string | null;
  requested_options: unknown;
  report: unknown;
  summary: unknown;
  error_message: string | null;
  created_at: string;
  queued_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

type RecommendationEvalResultRow = {
  id: string | number;
  run_id: string;
  fixture_id: string;
  fixture_name: string;
  status: RecommendationEvalResultStatus;
  passed: boolean;
  score: string | number;
  max_score: string | number;
  min_passing_score: string | number;
  checks: unknown;
  fixture_snapshot: unknown;
  response: unknown;
  result: unknown;
  error_message: string | null;
  created_at: string;
};

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return 25;
  return Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 100) : 25;
}

function clampOffset(offset: number | undefined): number {
  if (offset === undefined) return 0;
  return Number.isSafeInteger(offset) && offset > 0 ? Math.min(offset, 100_000) : 0;
}

function normalizeRun(row: RecommendationEvalRunRow): RecommendationEvalRun {
  return {
    id: row.id,
    mode: row.mode,
    status: row.status,
    source: row.source,
    actor: row.actor,
    queueName: row.queue_name,
    jobName: row.job_name,
    jobId: row.job_id,
    gitSha: row.git_sha,
    appVersion: row.app_version,
    requestedOptions: toRecord(row.requested_options),
    report: toRecord(row.report),
    summary: toRecord(row.summary),
    errorMessage: row.error_message,
    createdAt: row.created_at,
    queuedAt: row.queued_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function normalizeResult(row: RecommendationEvalResultRow): RecommendationEvalResult {
  return {
    id: String(row.id),
    runId: row.run_id,
    fixtureId: row.fixture_id,
    fixtureName: row.fixture_name,
    status: row.status,
    passed: row.passed,
    score: toNumber(row.score),
    maxScore: toNumber(row.max_score),
    minPassingScore: toNumber(row.min_passing_score),
    checks: toArray(row.checks),
    fixtureSnapshot: toRecord(row.fixture_snapshot),
    response: toRecord(row.response),
    result: toRecord(row.result),
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

function resultStatusFor(
  input: CompleteRecommendationEvalRunResultInput,
): RecommendationEvalResultStatus {
  if (input.errorMessage) return 'error';
  return input.passed ? 'passed' : 'failed';
}

function summaryFromResults(
  results: CompleteRecommendationEvalRunResultInput[],
): Record<string, unknown> {
  const passed = results.filter((result) => result.passed).length;
  return {
    failed: results.length - passed,
    fixtureCount: results.length,
    passed,
  };
}

function summaryForCompletedRun(
  input: CompleteRecommendationEvalRunInput,
): Record<string, unknown> {
  if (input.summary) return input.summary;
  const reportSummary = input.report.summary;
  if (
    typeof reportSummary === 'object' &&
    reportSummary !== null &&
    !Array.isArray(reportSummary)
  ) {
    return reportSummary as Record<string, unknown>;
  }
  return summaryFromResults(input.results ?? []);
}

export async function ensureRecommendationEvalRunSchema(): Promise<void> {
  await getPool().query(RECOMMENDATION_EVAL_RUN_SCHEMA_SQL);
}

export async function createRecommendationEvalRun(
  input: CreateRecommendationEvalRunInput,
): Promise<RecommendationEvalRun> {
  const result = await getPool().query<RecommendationEvalRunRow>(
    `
      INSERT INTO recommendation_eval_runs (
        mode,
        source,
        actor,
        queue_name,
        job_name,
        job_id,
        git_sha,
        app_version,
        requested_options
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      RETURNING *
    `,
    [
      input.mode,
      input.source ?? 'cli',
      input.actor ?? null,
      input.queueName ?? null,
      input.jobName ?? null,
      input.jobId ?? null,
      input.gitSha ?? null,
      input.appVersion ?? null,
      JSON.stringify(input.requestedOptions ?? {}),
    ],
  );

  return normalizeRun(result.rows[0]);
}

export async function markRecommendationEvalRunQueued(
  input: MarkRecommendationEvalRunQueuedInput,
): Promise<RecommendationEvalRun> {
  const result = await getPool().query<RecommendationEvalRunRow>(
    `
      UPDATE recommendation_eval_runs
      SET
        status = 'queued',
        queue_name = $2,
        job_name = $3,
        job_id = $4,
        queued_at = now(),
        updated_at = now(),
        error_message = NULL
      WHERE id = $1
      RETURNING *
    `,
    [input.runId, input.queueName, input.jobName, input.jobId],
  );

  return normalizeRun(result.rows[0]);
}

export async function markRecommendationEvalRunProcessing(
  runId: string,
): Promise<RecommendationEvalRun> {
  const result = await getPool().query<RecommendationEvalRunRow>(
    `
      UPDATE recommendation_eval_runs
      SET
        status = 'processing',
        started_at = COALESCE(started_at, now()),
        updated_at = now(),
        error_message = NULL
      WHERE id = $1
      RETURNING *
    `,
    [runId],
  );

  return normalizeRun(result.rows[0]);
}

export async function completeRecommendationEvalRun(
  input: CompleteRecommendationEvalRunInput,
): Promise<RecommendationEvalRunDetail> {
  const pool = getPool();
  const client = await pool.connect();
  const results = input.results ?? [];
  const summary = summaryForCompletedRun(input);

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM recommendation_eval_results WHERE run_id = $1', [input.runId]);

    const insertedResults: RecommendationEvalResult[] = [];
    for (const evalResult of results) {
      const insertResult = await client.query<RecommendationEvalResultRow>(
        `
          INSERT INTO recommendation_eval_results (
            run_id,
            fixture_id,
            fixture_name,
            status,
            passed,
            score,
            max_score,
            min_passing_score,
            checks,
            fixture_snapshot,
            response,
            result,
            error_message
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9::jsonb,
            $10::jsonb,
            $11::jsonb,
            $12::jsonb,
            $13
          )
          RETURNING *
        `,
        [
          input.runId,
          evalResult.fixtureId,
          evalResult.fixtureName,
          resultStatusFor(evalResult),
          evalResult.passed,
          evalResult.score,
          evalResult.maxScore,
          evalResult.minPassingScore,
          JSON.stringify(evalResult.checks ?? []),
          JSON.stringify(evalResult.fixtureSnapshot ?? {}),
          JSON.stringify(evalResult.response ?? {}),
          JSON.stringify(evalResult.result ?? {}),
          evalResult.errorMessage ?? null,
        ],
      );
      insertedResults.push(normalizeResult(insertResult.rows[0]));
    }

    const runResult = await client.query<RecommendationEvalRunRow>(
      `
        UPDATE recommendation_eval_runs
        SET
          status = 'completed',
          report = $2::jsonb,
          summary = $3::jsonb,
          error_message = NULL,
          completed_at = now(),
          updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [input.runId, JSON.stringify(input.report), JSON.stringify(summary)],
    );

    await client.query('COMMIT');
    return {
      run: normalizeRun(runResult.rows[0]),
      results: insertedResults,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function failRecommendationEvalRun(
  input: FailRecommendationEvalRunInput,
): Promise<RecommendationEvalRun> {
  const result = await getPool().query<RecommendationEvalRunRow>(
    `
      UPDATE recommendation_eval_runs
      SET
        status = $2,
        error_message = $3,
        report = COALESCE($4::jsonb, report),
        summary = COALESCE($5::jsonb, summary),
        completed_at = now(),
        updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [
      input.runId,
      input.status ?? 'failed',
      input.errorMessage,
      input.report ? JSON.stringify(input.report) : null,
      input.summary ? JSON.stringify(input.summary) : null,
    ],
  );

  return normalizeRun(result.rows[0]);
}

export async function listRecommendationEvalRunPage(
  options: ListRecommendationEvalRunPageOptions = {},
): Promise<RecommendationEvalRunPage> {
  const limit = clampLimit(options.limit);
  const offset = clampOffset(options.offset);
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (options.mode) {
    params.push(options.mode);
    clauses.push(`mode = $${params.length}`);
  }
  if (options.source) {
    params.push(options.source);
    clauses.push(`source = $${params.length}`);
  }
  if (options.status) {
    params.push(options.status);
    clauses.push(`status = $${params.length}`);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const countResult = await getPool().query<{ count: string | number }>(
    `SELECT COUNT(*)::int AS count FROM recommendation_eval_runs ${where}`,
    params,
  );

  const rowParams = [...params, limit, offset];
  const rowResult = await getPool().query<RecommendationEvalRunRow>(
    `
      SELECT *
      FROM recommendation_eval_runs
      ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT $${rowParams.length - 1}
      OFFSET $${rowParams.length}
    `,
    rowParams,
  );

  return {
    runs: rowResult.rows.map(normalizeRun),
    totalCount: toNumber(countResult.rows[0]?.count),
    limit,
    offset,
  };
}

export async function getRecommendationEvalRunDetail(
  runId: string,
): Promise<RecommendationEvalRunDetail | null> {
  const runResult = await getPool().query<RecommendationEvalRunRow>(
    'SELECT * FROM recommendation_eval_runs WHERE id = $1',
    [runId],
  );
  if (!runResult.rows[0]) {
    return null;
  }

  const resultRows = await getPool().query<RecommendationEvalResultRow>(
    `
      SELECT *
      FROM recommendation_eval_results
      WHERE run_id = $1
      ORDER BY id ASC
    `,
    [runId],
  );

  return {
    run: normalizeRun(runResult.rows[0]),
    results: resultRows.rows.map(normalizeResult),
  };
}

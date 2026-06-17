import {
  createCatalogRepairBatch,
  ensureCatalogRepairActionSchema,
  listCatalogHealthIssueMoviePage,
  recordCatalogRepairAction,
  updateCatalogRepairBatchOrchestrationResult,
} from '@pop-choice/shared';

import {
  CATALOG_MAINTENANCE_JOB_NAMES,
  CATALOG_MAINTENANCE_JOB_OPTIONS,
  catalogMaintenanceQueue,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';
import { getTraceCarrier } from '@/lib/tracing';

import type { CatalogEnqueueRepairBatchJobData } from '@/lib/jobQueue';
import type { CuratedMovieSeedSummaryStatus } from '@/lib/workers/curatedMovieSeed';
import type { CatalogRepairBatch } from '@pop-choice/shared';

const REPAIR_ISSUE_KEYS = ['missing_tmdb_id', 'missing_poster_url'] as const;
const DEFAULT_CATALOG_SEED_REPAIR_LIMIT = 50;
const DEFAULT_CATALOG_SEED_REPAIR_PAGE_SIZE = 25;
const MAX_CATALOG_SEED_REPAIR_LIMIT = 250;
const DEFAULT_CATALOG_HEALTH_STALE_DAYS = 180;
const DEFAULT_TMDB_LANGUAGE = 'en-US';

type CatalogSeedRepairIssueKey = (typeof REPAIR_ISSUE_KEYS)[number];

export type CuratedMovieSeedCatalogRepairStatus =
  | 'disabled'
  | 'empty'
  | 'failed'
  | 'queued'
  | 'skipped'
  | 'unavailable';

export type CuratedMovieSeedCatalogRepairSummary = {
  batchId?: string;
  issueKey?: CatalogSeedRepairIssueKey;
  jobId?: string;
  limit: number;
  pageSize: number;
  status: CuratedMovieSeedCatalogRepairStatus;
  totalCandidates?: number;
};

export type CuratedMovieSeedCatalogRepairInput = {
  dryRun: boolean;
  requestedBy?: string;
  runId?: string;
  seedStatus: CuratedMovieSeedSummaryStatus;
};

function parsePositiveIntEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : fallback;
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function parseNonNegativeIntEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : fallback;
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
}

function getCatalogRepairLimit(): number {
  return Math.min(
    parseNonNegativeIntEnv('CATALOG_SEED_REPAIR_LIMIT', DEFAULT_CATALOG_SEED_REPAIR_LIMIT),
    MAX_CATALOG_SEED_REPAIR_LIMIT,
  );
}

function getCatalogRepairPageSize(): number {
  return Math.min(
    parsePositiveIntEnv('CATALOG_SEED_REPAIR_PAGE_SIZE', DEFAULT_CATALOG_SEED_REPAIR_PAGE_SIZE),
    MAX_CATALOG_SEED_REPAIR_LIMIT,
  );
}

function getCatalogHealthStaleDays(): number {
  return parsePositiveIntEnv('CATALOG_HEALTH_STALE_DAYS', DEFAULT_CATALOG_HEALTH_STALE_DAYS);
}

function getTMDBLanguage(): string {
  return process.env.TMDB_LANGUAGE?.trim() || DEFAULT_TMDB_LANGUAGE;
}

function toBullMQJobIdPart(value: string | number): string {
  return String(value).replace(/[^a-zA-Z0-9_.-]/g, '-');
}

function getCatalogRepairBatchJobId(batchId: string | number): string {
  return `repair-batch-${toBullMQJobIdPart(batchId)}`;
}

function getSeedRepairActor(requestedBy: string | undefined): string {
  return requestedBy?.trim() ? `movie-seed:${requestedBy.trim()}` : 'movie-seed';
}

function shouldRunCatalogRepair(input: CuratedMovieSeedCatalogRepairInput): boolean {
  if (input.dryRun) return false;
  return input.seedStatus === 'completed' || input.seedStatus === 'no_new_movies';
}

function disabledSummary(limit: number, pageSize: number): CuratedMovieSeedCatalogRepairSummary {
  return {
    limit,
    pageSize,
    status: 'disabled',
  };
}

function skippedSummary(limit: number, pageSize: number): CuratedMovieSeedCatalogRepairSummary {
  return {
    limit,
    pageSize,
    status: 'skipped',
  };
}

function emptySummary(input: {
  limit: number;
  pageSize: number;
  totalCandidates: number;
}): CuratedMovieSeedCatalogRepairSummary {
  return {
    limit: input.limit,
    pageSize: input.pageSize,
    status: 'empty',
    totalCandidates: input.totalCandidates,
  };
}

function unavailableSummary(input: {
  batchId: string;
  issueKey: CatalogSeedRepairIssueKey;
  limit: number;
  pageSize: number;
  totalCandidates: number;
}): CuratedMovieSeedCatalogRepairSummary {
  return {
    batchId: input.batchId,
    issueKey: input.issueKey,
    limit: input.limit,
    pageSize: input.pageSize,
    status: 'unavailable',
    totalCandidates: input.totalCandidates,
  };
}

function queuedSummary(input: {
  batchId: string;
  issueKey: CatalogSeedRepairIssueKey;
  jobId: string;
  limit: number;
  pageSize: number;
  totalCandidates: number;
}): CuratedMovieSeedCatalogRepairSummary {
  return {
    batchId: input.batchId,
    issueKey: input.issueKey,
    jobId: input.jobId,
    limit: input.limit,
    pageSize: input.pageSize,
    status: 'queued',
    totalCandidates: input.totalCandidates,
  };
}

export function failedCatalogRepairSummary(
  input: {
    limit?: number;
    pageSize?: number;
  } = {},
): CuratedMovieSeedCatalogRepairSummary {
  return {
    limit: input.limit ?? getCatalogRepairLimit(),
    pageSize: input.pageSize ?? getCatalogRepairPageSize(),
    status: 'failed',
  };
}

async function createCatalogSeedRepairBatch(input: {
  issueKey: CatalogSeedRepairIssueKey;
  limit: number;
  requestedBy?: string;
  runId?: string;
  totalCandidates: number;
}): Promise<CatalogRepairBatch> {
  return createCatalogRepairBatch({
    action: 'bulk_enqueue_backfill',
    actor: getSeedRepairActor(input.requestedBy),
    issueKey: input.issueKey,
    targetType: 'catalog_issue',
    targetId: input.issueKey,
    requestedLimit: input.limit,
    totalCandidates: input.totalCandidates,
    attemptedCount: 0,
    note: 'Automatically queued after curated movie seed.',
    previousState: {
      issueKey: input.issueKey,
      requestedLimit: input.limit,
      runId: input.runId ?? null,
      totalCandidates: input.totalCandidates,
      trigger: 'curated_movie_seed',
    },
  });
}

async function markCatalogRepairUnavailable(input: {
  batch: CatalogRepairBatch;
  issueKey: CatalogSeedRepairIssueKey;
  limit: number;
  pageSize: number;
  totalCandidates: number;
}): Promise<CuratedMovieSeedCatalogRepairSummary> {
  const summary = unavailableSummary({
    batchId: input.batch.id,
    issueKey: input.issueKey,
    limit: input.limit,
    pageSize: input.pageSize,
    totalCandidates: input.totalCandidates,
  });

  await updateCatalogRepairBatchOrchestrationResult({
    batchId: input.batch.id,
    status: 'unavailable',
    result: { ...summary, queueName: 'catalog-maintenance' },
  });

  return summary;
}

async function enqueueCatalogRepairBatch(input: {
  batch: CatalogRepairBatch;
  issueKey: CatalogSeedRepairIssueKey;
  limit: number;
  pageSize: number;
  staleAfterDays: number;
  totalCandidates: number;
}): Promise<CuratedMovieSeedCatalogRepairSummary> {
  if (!catalogMaintenanceQueue) {
    return markCatalogRepairUnavailable(input);
  }

  const jobId = getCatalogRepairBatchJobId(input.batch.id);
  const jobData: CatalogEnqueueRepairBatchJobData = {
    version: 1,
    batchId: input.batch.id,
    issueKey: input.issueKey,
    limit: input.limit,
    pageSize: input.pageSize,
    language: getTMDBLanguage(),
    staleAfterDays: input.staleAfterDays,
    trace: getTraceCarrier(),
  };
  const job = await catalogMaintenanceQueue.add(
    CATALOG_MAINTENANCE_JOB_NAMES.enqueueCatalogRepairBatch,
    jobData,
    {
      ...CATALOG_MAINTENANCE_JOB_OPTIONS,
      jobId,
    },
  );
  const summary = queuedSummary({
    batchId: input.batch.id,
    issueKey: input.issueKey,
    jobId: String(job.id ?? jobId),
    limit: input.limit,
    pageSize: input.pageSize,
    totalCandidates: input.totalCandidates,
  });

  await updateCatalogRepairBatchOrchestrationResult({
    batchId: input.batch.id,
    status: 'enqueueing',
    result: { ...summary, queueName: 'catalog-maintenance' },
  });

  return summary;
}

async function recordCatalogSeedRepairAudit(input: {
  batch: CatalogRepairBatch;
  issueKey: CatalogSeedRepairIssueKey;
  requestedBy?: string;
  runId?: string;
  summary: CuratedMovieSeedCatalogRepairSummary;
  totalCandidates: number;
}): Promise<void> {
  await recordCatalogRepairAction({
    action: 'bulk_enqueue_backfill',
    actor: getSeedRepairActor(input.requestedBy),
    issueKey: input.issueKey,
    targetType: 'catalog_issue',
    targetId: input.issueKey,
    note: 'Automatically queued after curated movie seed.',
    previousState: {
      issueKey: input.issueKey,
      runId: input.runId ?? null,
      totalCandidates: input.totalCandidates,
      trigger: 'curated_movie_seed',
    },
    result: { ...input.summary },
    repairBatchId: input.batch.id,
  });
}

async function findCatalogSeedRepairTarget(input: {
  staleAfterDays: number;
}): Promise<{ issueKey: CatalogSeedRepairIssueKey; totalCandidates: number } | null> {
  for (const issueKey of REPAIR_ISSUE_KEYS) {
    const page = await listCatalogHealthIssueMoviePage({
      issueKey,
      limit: 1,
      offset: 0,
      staleAfterDays: input.staleAfterDays,
    });
    if (page.totalCount > 0) return { issueKey, totalCandidates: page.totalCount };
  }

  return null;
}

export async function enqueueCuratedMovieSeedCatalogRepair(
  input: CuratedMovieSeedCatalogRepairInput,
): Promise<CuratedMovieSeedCatalogRepairSummary> {
  const limit = getCatalogRepairLimit();
  const pageSize = getCatalogRepairPageSize();

  if (limit === 0) return disabledSummary(limit, pageSize);
  if (!shouldRunCatalogRepair(input)) return skippedSummary(limit, pageSize);

  await ensureCatalogRepairActionSchema();

  const staleAfterDays = getCatalogHealthStaleDays();
  const target = await findCatalogSeedRepairTarget({ staleAfterDays });
  const requestedLimit = Math.min(limit, target?.totalCandidates ?? 0);

  if (!target || requestedLimit === 0) {
    return emptySummary({
      limit: requestedLimit,
      pageSize,
      totalCandidates: target?.totalCandidates ?? 0,
    });
  }

  const batch = await createCatalogSeedRepairBatch({
    issueKey: target.issueKey,
    limit: requestedLimit,
    requestedBy: input.requestedBy,
    runId: input.runId,
    totalCandidates: target.totalCandidates,
  });
  const summary = await enqueueCatalogRepairBatch({
    batch,
    issueKey: target.issueKey,
    limit: requestedLimit,
    pageSize,
    staleAfterDays,
    totalCandidates: target.totalCandidates,
  });

  await recordCatalogSeedRepairAudit({
    batch,
    issueKey: target.issueKey,
    requestedBy: input.requestedBy,
    runId: input.runId,
    summary,
    totalCandidates: target.totalCandidates,
  });

  logger.info({ summary }, 'Curated movie seed catalog repair phase queued');
  return summary;
}

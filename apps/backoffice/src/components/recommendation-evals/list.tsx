import type { RecommendationEvalRun, RecommendationEvalRunPage } from '@pop-choice/shared';
import { Button, ButtonLink } from '@pop-choice/ui';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import type { BackofficeOpenAIUsageState, OpenAIUsagePeriodKey } from '../../lib/openAIUsage';
import { BackofficeLayout } from '../backoffice-layout';
import { DataTable, EmptyState, SimplePaginationControls } from '../shared';
import {
  formatProviderUsageCost,
  providerUsageText,
  providerUsageViewFromReport,
} from './providerUsageViewModel';
import { buildRecommendationEvalPageHref, RecommendationEvalStatusBadge } from './shared';

const USAGE_PERIOD_LABELS: Record<OpenAIUsagePeriodKey, string> = {
  '24h': '24h',
  '7d': '7d',
  '30d': '30d',
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function runOpenAIUsage(run: RecommendationEvalRun): { cost: string; usage: string } {
  const usage = providerUsageViewFromReport(run.report);

  return {
    cost: formatProviderUsageCost(usage?.cost ?? null),
    usage: providerUsageText(usage),
  };
}

function OpenAIUsagePeriodLinks({ active }: { active: OpenAIUsagePeriodKey }) {
  return (
    <div className="segmented-links" aria-label="OpenAI usage period">
      {(Object.keys(USAGE_PERIOD_LABELS) as OpenAIUsagePeriodKey[]).map((period) => (
        <a
          aria-current={period === active ? 'page' : undefined}
          className={period === active ? 'active' : undefined}
          href={`/recommendation-evals?usagePeriod=${period}`}
          key={period}
        >
          {USAGE_PERIOD_LABELS[period]}
        </a>
      ))}
    </div>
  );
}

function OpenAIUsageOverview({ state }: { state: BackofficeOpenAIUsageState }) {
  if (state.status !== 'available') {
    return (
      <section className="panel openai-usage-panel">
        <div className="panel-header">
          <div>
            <h2>OpenAI usage</h2>
            <p className="panel-subtitle">Admin usage and cost telemetry</p>
          </div>
          <OpenAIUsagePeriodLinks active={state.period} />
        </div>
        <p className="empty">{state.message}</p>
      </section>
    );
  }

  const { summary } = state;
  const categories = Object.entries(summary.usage.byCategory).filter(
    ([, totals]) => totals.requests > 0 || totals.inputTokens > 0 || totals.outputTokens > 0,
  );

  return (
    <section className="panel openai-usage-panel">
      <div className="panel-header">
        <div>
          <h2>OpenAI usage</h2>
          <p className="panel-subtitle">
            {formatBackofficeDateTime(summary.period.startTime)} -{' '}
            {formatBackofficeDateTime(summary.period.endTime)}
          </p>
        </div>
        <OpenAIUsagePeriodLinks active={state.period} />
      </div>
      <div className="openai-usage-summary">
        <div>
          <span>Total cost</span>
          <strong>{formatProviderUsageCost(summary.costs.total)}</strong>
        </div>
        <div>
          <span>Requests</span>
          <strong>{formatNumber(summary.usage.total.requests)}</strong>
        </div>
        <div>
          <span>Input tokens</span>
          <strong>{formatNumber(summary.usage.total.inputTokens)}</strong>
        </div>
        <div>
          <span>Output tokens</span>
          <strong>{formatNumber(summary.usage.total.outputTokens)}</strong>
        </div>
      </div>
      {categories.length > 0 ? (
        <DataTable
          className="openai-usage-table"
          columns={['Category', 'Requests', 'Input tokens', 'Output tokens', 'Cached input']}
        >
          {categories.map(([category, totals]) => (
            <tr key={category}>
              <td>{category}</td>
              <td>{formatNumber(totals.requests)}</td>
              <td>{formatNumber(totals.inputTokens)}</td>
              <td>{formatNumber(totals.outputTokens)}</td>
              <td>{formatNumber(totals.cachedInputTokens)}</td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <p className="empty">No OpenAI usage was reported for this period.</p>
      )}
    </section>
  );
}

function RecommendationEvalRows({ runs }: { runs: RecommendationEvalRun[] }) {
  if (runs.length === 0) {
    return (
      <tr>
        <td colSpan={11} className="empty">
          No recommendation eval runs have been recorded yet.
        </td>
      </tr>
    );
  }

  return (
    <>
      {runs.map((run) => {
        const openAIUsage = runOpenAIUsage(run);

        return (
          <tr key={run.id}>
            <td>
              <a href={`/recommendation-evals/${encodeURIComponent(run.id)}`}>
                {run.id.slice(0, 8)}
              </a>
            </td>
            <td>
              <RecommendationEvalStatusBadge status={run.status} />
            </td>
            <td>{run.mode}</td>
            <td>{run.source}</td>
            <td>{run.actor ?? '-'}</td>
            <td>{typeof run.summary.passed === 'number' ? run.summary.passed : '-'}</td>
            <td>{typeof run.summary.failed === 'number' ? run.summary.failed : '-'}</td>
            <td>{openAIUsage.cost}</td>
            <td>{openAIUsage.usage}</td>
            <td>{formatBackofficeDateTime(run.createdAt)}</td>
            <td>
              <ButtonLink size="sm" href={`/recommendation-evals/${encodeURIComponent(run.id)}`}>
                Open
              </ButtonLink>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function RecommendationEvalRunForm() {
  return (
    <div className="eval-run-stack">
      <form className="eval-safe-form" action="/recommendation-evals/actions" method="post">
        <label>
          <span>Mode</span>
          <select name="mode" defaultValue="real-data">
            <option value="real-data">Seeded catalog retrieval - no OpenAI</option>
            <option value="mock">Mock fixtures - no OpenAI</option>
          </select>
        </label>
        <p>Runs deterministic checks with controlled recommendation output. No OpenAI calls.</p>
        <Button type="submit" variant="success">
          Run non-provider eval
        </Button>
      </form>
      <form className="live-eval-form" action="/recommendation-evals/actions" method="post">
        <input type="hidden" name="mode" value="live" />
        <div className="issue-hint">
          Live OpenAI evals call the provider-backed recommendation pipeline for every fixture. They
          can spend credits, take longer, and fail because provider output is non-deterministic.
        </div>
        <label className="checkbox-line">
          <input type="checkbox" name="acknowledge_live_cost" value="yes" />
          <span>I understand this will call OpenAI and can spend provider credits.</span>
        </label>
        <label>
          <span>Type RUN LIVE RECOMMENDATION EVAL</span>
          <input name="live_confirmation" autoComplete="off" />
        </label>
        <Button type="submit" variant="danger">
          Run live OpenAI eval
        </Button>
      </form>
    </div>
  );
}

function RecommendationEvalFlash({ status }: { status: string | null }) {
  if (!status) return null;
  const copy: Record<string, string> = {
    failed: 'Recommendation eval failed to enqueue. Check backoffice logs.',
    forbidden: 'Recommendation eval action was rejected.',
    queued: 'Recommendation eval job queued.',
    unavailable: 'Recommendation eval queue is unavailable. Check REDIS_URL and worker status.',
  };
  const message = copy[status];
  if (!message) return null;

  return <div className={`flash ${status === 'queued' ? 'success' : 'warn'}`}>{message}</div>;
}

export function RecommendationEvalListPage({
  openAIUsage,
  runPage,
  status,
}: {
  openAIUsage: BackofficeOpenAIUsageState;
  runPage: RecommendationEvalRunPage;
  status: string | null;
}) {
  return (
    <BackofficeLayout
      active="recommendation-evals"
      title="Recommendation Evals"
      eyebrow="Eval operations"
      description="Run deterministic catalog checks or guarded live OpenAI evals, watch queue status, and inspect persisted fixture results."
      actions={
        <>
          <ButtonLink href="/recommendation-evals">Refresh</ButtonLink>
          <ButtonLink variant="quiet" href="/api/recommendation-evals">
            JSON
          </ButtonLink>
        </>
      }
    >
      <RecommendationEvalFlash status={status} />
      <OpenAIUsageOverview state={openAIUsage} />
      <section className="eval-run-panel" aria-labelledby="recommendation-eval-run-title">
        <div className="eval-run-panel-heading">
          <h2 id="recommendation-eval-run-title">Run eval</h2>
          <p>Non-provider evals are safe. Live OpenAI evals require an explicit guard.</p>
        </div>
        <RecommendationEvalRunForm />
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Recent runs</h2>
          <span className="count">{runPage.totalCount}</span>
        </div>
        {runPage.totalCount === 0 ? (
          <EmptyState>No recommendation eval runs have been recorded yet.</EmptyState>
        ) : (
          <>
            <SimplePaginationControls
              ariaLabel="Recommendation eval run pagination"
              emptyLabel="No recommendation eval runs"
              itemLabel="eval runs"
              limit={runPage.limit}
              offset={runPage.offset}
              totalCount={runPage.totalCount}
              hrefForPage={(page) =>
                buildRecommendationEvalPageHref({
                  page,
                  pageSize: runPage.limit,
                  usagePeriod: openAIUsage.period,
                })
              }
            />
            <DataTable
              className="recommendation-eval-table"
              columns={[
                'Run',
                'Status',
                'Mode',
                'Source',
                'Actor',
                'Passed',
                'Failed',
                'OpenAI cost',
                'OpenAI usage',
                'Created',
                'Actions',
              ]}
            >
              <RecommendationEvalRows runs={runPage.runs} />
            </DataTable>
            <SimplePaginationControls
              ariaLabel="Recommendation eval run pagination bottom"
              emptyLabel="No recommendation eval runs"
              itemLabel="eval runs"
              limit={runPage.limit}
              offset={runPage.offset}
              totalCount={runPage.totalCount}
              hrefForPage={(page) =>
                buildRecommendationEvalPageHref({
                  page,
                  pageSize: runPage.limit,
                  usagePeriod: openAIUsage.period,
                })
              }
            />
          </>
        )}
      </section>
    </BackofficeLayout>
  );
}

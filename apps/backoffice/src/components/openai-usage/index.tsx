import { ButtonLink } from '@pop-choice/ui';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { formatProviderUsageCost } from '../recommendation-evals/providerUsageViewModel';
import { DataTable } from '../shared';

import type { BackofficeOpenAIUsageState, OpenAIUsagePeriodKey } from '../../lib/openAIUsage';

const USAGE_PERIOD_LABELS: Record<OpenAIUsagePeriodKey, string> = {
  '24h': '24h',
  '7d': '7d',
  '30d': '30d',
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function OpenAIUsagePeriodLinks({ active }: { active: OpenAIUsagePeriodKey }) {
  return (
    <div className="segmented-links" aria-label="OpenAI usage period">
      {(Object.keys(USAGE_PERIOD_LABELS) as OpenAIUsagePeriodKey[]).map((period) => (
        <a
          aria-current={period === active ? 'page' : undefined}
          className={period === active ? 'active' : undefined}
          href={`/openai-usage?usagePeriod=${period}`}
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

export function OpenAIUsagePage({ openAIUsage }: { openAIUsage: BackofficeOpenAIUsageState }) {
  return (
    <BackofficeLayout
      active="openai-usage"
      title="OpenAI Usage"
      eyebrow="Provider spend"
      description="Review aggregate OpenAI usage and cost telemetry by period."
      actions={
        <>
          <ButtonLink href={`/openai-usage?usagePeriod=${openAIUsage.period}`}>Refresh</ButtonLink>
          <ButtonLink variant="quiet" href="/recommendation-evals">
            Eval runs
          </ButtonLink>
        </>
      }
    >
      <OpenAIUsageOverview state={openAIUsage} />
    </BackofficeLayout>
  );
}

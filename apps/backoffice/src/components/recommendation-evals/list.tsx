import { Button, ButtonLink } from '@pop-choice/ui';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { DataTable, EmptyState, SimplePaginationControls } from '../shared';

import { buildRecommendationEvalPageHref, RecommendationEvalStatusBadge } from './shared';

import type { RecommendationEvalRun, RecommendationEvalRunPage } from '@pop-choice/shared';

function RecommendationEvalRows({ runs }: { runs: RecommendationEvalRun[] }) {
  if (runs.length === 0) {
    return (
      <tr>
        <td colSpan={9} className="empty">
          No recommendation eval runs have been recorded yet.
        </td>
      </tr>
    );
  }

  return (
    <>
      {runs.map((run) => (
        <tr key={run.id}>
          <td>
            <a href={`/recommendation-evals/${encodeURIComponent(run.id)}`}>{run.id.slice(0, 8)}</a>
          </td>
          <td>
            <RecommendationEvalStatusBadge status={run.status} />
          </td>
          <td>{run.mode}</td>
          <td>{run.source}</td>
          <td>{run.actor ?? '-'}</td>
          <td>{typeof run.summary.passed === 'number' ? run.summary.passed : '-'}</td>
          <td>{typeof run.summary.failed === 'number' ? run.summary.failed : '-'}</td>
          <td>{formatBackofficeDateTime(run.createdAt)}</td>
          <td>
            <ButtonLink size="sm" href={`/recommendation-evals/${encodeURIComponent(run.id)}`}>
              Open
            </ButtonLink>
          </td>
        </tr>
      ))}
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
  runPage,
  status,
}: {
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
                buildRecommendationEvalPageHref({ page, pageSize: runPage.limit })
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
                buildRecommendationEvalPageHref({ page, pageSize: runPage.limit })
              }
            />
          </>
        )}
      </section>
    </BackofficeLayout>
  );
}

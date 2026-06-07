import type { RecommendationEvalRun, RecommendationEvalRunPage } from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { DataTable, SimplePaginationControls } from '../shared';
import { buildRecommendationEvalPageHref, RecommendationEvalStatusBadge } from './shared';

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
            <a
              className="button small"
              href={`/recommendation-evals/${encodeURIComponent(run.id)}`}
            >
              Open
            </a>
          </td>
        </tr>
      ))}
    </>
  );
}

function RecommendationEvalRunForm() {
  return (
    <div className="eval-action-grid">
      <form className="inline-action-form" action="/recommendation-evals/actions" method="post">
        <label>
          <span>Mode</span>
          <select name="mode" defaultValue="real-data">
            <option value="real-data">Real-data retrieval</option>
            <option value="mock">Mock fixtures</option>
          </select>
        </label>
        <button className="button success" type="submit">
          Run safe eval
        </button>
      </form>
      <form className="live-eval-form" action="/recommendation-evals/actions" method="post">
        <input type="hidden" name="mode" value="live" />
        <div className="issue-hint">
          Live evals can call OpenAI and provider-backed recommendation paths. Use only for
          intentional validation.
        </div>
        <label className="checkbox-line">
          <input type="checkbox" name="acknowledge_live_cost" value="yes" />
          <span>I understand this can spend provider credits and may be flaky.</span>
        </label>
        <label>
          <span>Type RUN LIVE RECOMMENDATION EVAL</span>
          <input name="live_confirmation" autoComplete="off" />
        </label>
        <button className="button danger" type="submit">
          Run live eval
        </button>
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
      description="Run safe recommendation evals, watch queue status, and inspect persisted fixture results."
      actions={
        <>
          <a className="button" href="/recommendation-evals">
            Refresh
          </a>
          <a className="button quiet" href="/api/recommendation-evals">
            JSON
          </a>
        </>
      }
    >
      <RecommendationEvalFlash status={status} />
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Run eval</h2>
            <div className="issue-hint">
              Safe evals are the default. Live provider evals require an explicit guard.
            </div>
          </div>
        </div>
        <div className="panel-body">
          <RecommendationEvalRunForm />
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Recent runs</h2>
          <span className="count">{runPage.totalCount}</span>
        </div>
        <SimplePaginationControls
          ariaLabel="Recommendation eval run pagination"
          emptyLabel="No recommendation eval runs"
          itemLabel="eval runs"
          limit={runPage.limit}
          offset={runPage.offset}
          totalCount={runPage.totalCount}
          hrefForPage={(page) => buildRecommendationEvalPageHref({ page, pageSize: runPage.limit })}
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
          hrefForPage={(page) => buildRecommendationEvalPageHref({ page, pageSize: runPage.limit })}
        />
      </section>
    </BackofficeLayout>
  );
}

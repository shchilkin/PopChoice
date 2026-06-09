import type {
  RecommendationEvalResult,
  RecommendationEvalRun,
  RecommendationEvalRunDetail,
} from '@pop-choice/shared';

import { formatBackofficeDateTime } from '../../lib/backoffice';
import { BackofficeLayout } from '../backoffice-layout';
import { CatalogStat, DataTable } from '../shared';
import { JsonBlock, recommendationEvalStatusLabel, RecommendationEvalStatusBadge } from './shared';

function EvalRunSummary({ run }: { run: RecommendationEvalRun }) {
  return (
    <section className="summary batch-summary" aria-label="Recommendation eval run summary">
      <CatalogStat
        label="Status"
        value={recommendationEvalStatusLabel(run.status)}
        meta={run.errorMessage ?? `Mode ${run.mode}`}
        state={
          run.status === 'completed'
            ? 'healthy'
            : run.status === 'failed' || run.status === 'enqueue_failed'
              ? 'warning'
              : 'neutral'
        }
      />
      <CatalogStat
        label="Fixtures"
        value={typeof run.summary.fixtureCount === 'number' ? run.summary.fixtureCount : '-'}
        meta="Persisted result rows"
      />
      <CatalogStat
        label="Passed"
        value={typeof run.summary.passed === 'number' ? run.summary.passed : '-'}
        meta="Fixture checks passed"
      />
      <CatalogStat
        label="Failed"
        value={typeof run.summary.failed === 'number' ? run.summary.failed : '-'}
        meta="Fixture checks failed"
        state={run.summary.failed === 0 ? 'healthy' : 'warning'}
      />
    </section>
  );
}

function EvalResultRows({ results }: { results: RecommendationEvalResult[] }) {
  if (results.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="empty">
          No fixture result rows have been persisted yet.
        </td>
      </tr>
    );
  }

  return (
    <>
      {results.map((result) => (
        <tr key={result.id}>
          <td>{result.fixtureId}</td>
          <td>{result.fixtureName}</td>
          <td>
            <span className={`status eval-result-${result.status}`}>{result.status}</span>
          </td>
          <td>
            {result.score}/{result.maxScore}
          </td>
          <td>{result.checks.length}</td>
          <td>{result.errorMessage ?? '-'}</td>
        </tr>
      ))}
    </>
  );
}

export function RecommendationEvalDetailPage({ detail }: { detail: RecommendationEvalRunDetail }) {
  const { run, results } = detail;

  return (
    <BackofficeLayout
      active="recommendation-evals"
      title={`Recommendation Eval ${run.id.slice(0, 8)}`}
      eyebrow="Eval detail"
      breadcrumbs={[
        { href: '/', label: 'Backoffice' },
        { href: '/recommendation-evals', label: 'Recommendation evals' },
        { label: `Eval ${run.id.slice(0, 8)}` },
      ]}
      description={
        <div className="toolbar-summary">
          <RecommendationEvalStatusBadge status={run.status} />
          <span>{run.mode}</span>
          <span>Updated {formatBackofficeDateTime(run.updatedAt)}</span>
        </div>
      }
      actions={
        <>
          <a className="button" href="/recommendation-evals">
            Back to evals
          </a>
          <a
            className="button quiet"
            href={`/api/recommendation-evals/${encodeURIComponent(run.id)}`}
          >
            JSON
          </a>
        </>
      }
    >
      <EvalRunSummary run={run} />
      <section className="detail-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Run context</h2>
          </div>
          <dl className="facts">
            <div>
              <dt>Source</dt>
              <dd>{run.source}</dd>
            </div>
            <div>
              <dt>Actor</dt>
              <dd>{run.actor ?? '-'}</dd>
            </div>
            <div>
              <dt>Queue</dt>
              <dd>{run.queueName ?? '-'}</dd>
            </div>
            <div>
              <dt>Job</dt>
              <dd>{run.jobId ?? '-'}</dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{formatBackofficeDateTime(run.startedAt)}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{formatBackofficeDateTime(run.completedAt)}</dd>
            </div>
          </dl>
        </article>
        <article className="panel">
          <div className="panel-header">
            <h2>Requested options</h2>
          </div>
          <JsonBlock value={run.requestedOptions} />
        </article>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Fixture results</h2>
          <span className="count">{results.length}</span>
        </div>
        <DataTable
          className="recommendation-eval-table"
          columns={['Fixture', 'Name', 'Status', 'Score', 'Checks', 'Error']}
        >
          <EvalResultRows results={results} />
        </DataTable>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Report</h2>
        </div>
        <JsonBlock value={run.report} />
      </section>
    </BackofficeLayout>
  );
}

export function RecommendationEvalNotFoundPage({ runId }: { runId: string }) {
  return (
    <BackofficeLayout
      active="recommendation-evals"
      title="Recommendation Eval Not Found"
      eyebrow="Eval detail"
      breadcrumbs={[
        { href: '/', label: 'Backoffice' },
        { href: '/recommendation-evals', label: 'Recommendation evals' },
        { label: 'Eval not found' },
      ]}
      description={`No recommendation eval run exists for id ${runId}.`}
      actions={
        <a className="button" href="/recommendation-evals">
          Back to evals
        </a>
      }
    >
      <section className="panel">
        <p className="empty">The run may have been created in another environment or deleted.</p>
      </section>
    </BackofficeLayout>
  );
}

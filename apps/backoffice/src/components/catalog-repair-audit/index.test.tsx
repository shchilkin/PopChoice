import type { CatalogRepairActionAudit } from '@pop-choice/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  RepairAuditRows,
  humanizeBackofficeIdentifier,
  repairResultChips,
  repairResultStatusLabel,
  repairResultStatusTone,
} from '.';

function auditEntry(overrides: Partial<CatalogRepairActionAudit> = {}): CatalogRepairActionAudit {
  return {
    action: 'bulk_enqueue_backfill',
    actor: 'lexi',
    createdAt: '2026-05-28T15:23:07.000Z',
    id: 'audit-1',
    issueKey: 'missing_poster_url',
    note: null,
    previousState: {},
    repairBatchId: '42',
    repairBatchItemId: null,
    result: {
      deduped: 2,
      failed: 1,
      queued: 25,
      status: 'partial',
      unavailable: 'ignored',
    },
    targetId: 'missing_poster_url',
    targetType: 'catalog_issue',
    ...overrides,
  };
}

describe('catalog repair audit presentation', () => {
  it('humanizes stored identifiers for operator-facing labels', () => {
    expect(humanizeBackofficeIdentifier('missing_poster_url')).toBe('Missing Poster Url');
    expect(humanizeBackofficeIdentifier('bulk_enqueue_backfill')).toBe('Bulk Enqueue Backfill');
  });

  it('summarizes numeric repair result counters and ignores malformed values', () => {
    expect(
      repairResultChips({
        attempted: 30,
        deduped: 2,
        failed: 1,
        queued: 25,
        totalCandidates: 40,
        unavailable: 'not-a-number',
      }),
    ).toEqual([
      { key: 'queued', label: 'Accepted', value: 25 },
      { key: 'deduped', label: 'Already queued', value: 2 },
      { key: 'failed', label: 'Failed', value: 1 },
      { key: 'attempted', label: 'Attempted', value: 30 },
      { key: 'totalCandidates', label: 'Total', value: 40 },
    ]);
  });

  it('keeps queued audit results neutral until the catalog issue clears', () => {
    expect(repairResultStatusLabel('queued')).toBe('Accepted');
    expect(repairResultStatusTone('queued')).toBe('neutral');
    expect(repairResultStatusTone('deduped')).toBe('neutral');
    expect(repairResultStatusTone('completed_resolved')).toBe('good');
    expect(repairResultStatusTone('failed')).toBe('warn');
  });

  it('renders compact, scannable repair audit rows', () => {
    const html = renderToStaticMarkup(<RepairAuditRows audit={[auditEntry()]} />);

    expect(html).toContain('Missing Poster Url');
    expect(html).toContain('Bulk Enqueue Backfill');
    expect(html).toContain('Batch #42');
    expect(html).toContain('Partially accepted');
    expect(html).toContain('25</strong> accepted');
    expect(html).toContain('2</strong> already queued');
    expect(html).toContain('1</strong> failed');
    expect(html).toContain('/#issue-missing_poster_url');
  });

  it('renders an empty state when no repair actions exist', () => {
    expect(renderToStaticMarkup(<RepairAuditRows audit={[]} />)).toContain(
      'No catalog repair actions have been recorded yet.',
    );
  });
});

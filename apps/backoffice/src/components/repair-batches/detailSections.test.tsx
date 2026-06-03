import type { CatalogRepairBatchItem } from '@pop-choice/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RepairBatchItemRows } from './detailSections';

function batchItem(overrides: Partial<CatalogRepairBatchItem> = {}): CatalogRepairBatchItem {
  return {
    batchId: 'batch-1',
    completedAt: null,
    createdAt: '2026-06-02T12:00:00.000Z',
    errorMessage: null,
    id: 'item-1',
    issueKey: 'missing_poster_url',
    jobId: null,
    jobName: null,
    language: 'en',
    movieId: '42',
    movieSnapshot: { id: '42', name: 'Heat', year: 1995 },
    queueName: null,
    reason: 'missing_metadata',
    result: {},
    status: 'failed',
    updatedAt: '2026-06-02T12:05:00.000Z',
    ...overrides,
  };
}

describe('repair batch detail sections', () => {
  it('shows retry actions only for failed, enqueue-failed, and unavailable items', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RepairBatchItemRows
            items={[
              batchItem({ id: 'failed-item', status: 'failed' }),
              batchItem({ id: 'unavailable-item', status: 'unavailable' }),
              batchItem({ id: 'unresolved-item', status: 'completed_unresolved' }),
            ]}
          />
        </tbody>
      </table>,
    );

    expect(html.match(/Retry item/g)).toHaveLength(2);
    expect(html).toContain('name="item_id" value="failed-item"');
    expect(html).toContain('name="item_id" value="unavailable-item"');
    expect(html).not.toContain('name="item_id" value="unresolved-item"');
    expect(html).toContain('Inspect');
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { catalogRepairBatchItem } from '../../test/backofficeFixtures';

import { RepairBatchItemRows } from './detailSections';

describe('repair batch detail sections', () => {
  it('shows retry actions only for failed, enqueue-failed, and unavailable items', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RepairBatchItemRows
            items={[
              catalogRepairBatchItem({ id: 'failed-item', status: 'failed' }),
              catalogRepairBatchItem({ id: 'unavailable-item', status: 'unavailable' }),
              catalogRepairBatchItem({ id: 'unresolved-item', status: 'completed_unresolved' }),
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

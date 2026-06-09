import type { CatalogRepairBatchPage } from '@pop-choice/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { RepairBatchListPage } from './list';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function batchPage(overrides: Partial<CatalogRepairBatchPage> = {}): CatalogRepairBatchPage {
  return {
    batches: [],
    limit: 25,
    offset: 0,
    totalCount: 0,
    ...overrides,
  };
}

describe('RepairBatchListPage', () => {
  it('renders one quiet empty state instead of empty table chrome', () => {
    const html = renderToStaticMarkup(
      <RepairBatchListPage batchPage={batchPage()} selectedSort="newest" selectedStatus="all" />,
    );

    expect(html).toContain('No durable catalog repair batches have been recorded yet.');
    expect(html).not.toContain('class="repair-batch-table"');
    expect(html).not.toContain('Catalog repair batch pagination');
    expect(html).not.toContain('Page 1 / 1');
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DataTable, EmptyState, JsonDetails, PanelHeader, TableEmptyRow, TableScroll } from '.';

describe('shared backoffice components', () => {
  it('renders panel headers with optional hints, counts, and actions', () => {
    const html = renderToStaticMarkup(
      <PanelHeader
        title="Recent batches"
        hint="Filter durable batches by state."
        count={3}
        actions={<a href="/repair-batches">Open</a>}
      />,
    );

    expect(html).toContain('class="panel-header"');
    expect(html).toContain('<h2>Recent batches</h2>');
    expect(html).toContain('class="issue-hint"');
    expect(html).toContain('Filter durable batches by state.');
    expect(html).toContain('class="count"');
    expect(html).toContain('>3</span>');
    expect(html).toContain('href="/repair-batches"');
  });

  it('preserves custom hint nodes in panel headers', () => {
    const html = renderToStaticMarkup(
      <PanelHeader
        title={<h2>Waiting jobs</h2>}
        hint={<p className="small-note">Shown fields</p>}
      />,
    );

    expect(html).toContain('<p class="small-note">Shown fields</p>');
    expect(html).not.toContain('issue-hint');
  });

  it('renders shared empty and table shell primitives', () => {
    const empty = renderToStaticMarkup(<EmptyState compact>No rows</EmptyState>);
    const table = renderToStaticMarkup(
      <TableScroll>
        <table>
          <tbody>
            <TableEmptyRow colSpan={4}>No records</TableEmptyRow>
          </tbody>
        </table>
      </TableScroll>,
    );

    expect(empty).toBe('<p class="empty compact">No rows</p>');
    expect(table).toContain('class="table-scroll"');
    expect(table).toContain('<td colSpan="4" class="empty">No records</td>');
  });

  it('renders shared data tables with headers and scroll chrome', () => {
    const html = renderToStaticMarkup(
      <DataTable className="result-table" columns={['Name', 'Status', 'Actions']}>
        <tr>
          <td>Fixture A</td>
          <td>passed</td>
          <td>
            <a href="/fixtures/a">Open</a>
          </td>
        </tr>
      </DataTable>,
    );

    expect(html).toContain('class="table-scroll"');
    expect(html).toContain('<table class="result-table">');
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<th>Actions</th>');
    expect(html).toContain('<td>Fixture A</td>');
  });

  it('renders JSON details with a fallback for unserializable values', () => {
    const value: Record<string, unknown> = {};
    value.self = value;

    const html = renderToStaticMarkup(<JsonDetails label="Raw" value={value} />);

    expect(html).toContain('<summary>Raw</summary>');
    expect(html).toContain('[object Object]');
  });
});

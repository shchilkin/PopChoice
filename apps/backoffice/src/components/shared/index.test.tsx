import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JsonDetails } from '.';

describe('shared backoffice components', () => {
  it('renders JSON details with a fallback for unserializable values', () => {
    const value: Record<string, unknown> = {};
    value.self = value;

    const html = renderToStaticMarkup(<JsonDetails label="Raw" value={value} />);

    expect(html).toContain('<summary>Raw</summary>');
    expect(html).toContain('[object Object]');
  });
});

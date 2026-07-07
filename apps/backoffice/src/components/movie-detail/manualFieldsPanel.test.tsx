import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { catalogMovieDetail } from '../../test/backofficeFixtures';

import { ManualMovieMetadataPanel } from './manualFieldsPanel';

describe('ManualMovieMetadataPanel', () => {
  it('renders a compact dialog trigger for manual metadata correction', () => {
    const html = renderToStaticMarkup(
      <ManualMovieMetadataPanel detail={catalogMovieDetail()} manualStatus="updated" />,
    );

    expect(html).toContain('Manual correction');
    expect(html).toContain('Edit fields');
    expect(html).toContain('Manual metadata fields were applied.');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain('name="tmdb_id"');
    expect(html).not.toContain('name="note"');
    expect(html).not.toContain('placeholder="e.g. 475557"');
    expect(html).not.toContain('placeholder="PG-13"');
  });
});

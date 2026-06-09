import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { catalogMovieDetail } from '../../test/backofficeFixtures';
import { ManualMovieMetadataPanel } from './manualFieldsPanel';

describe('ManualMovieMetadataPanel', () => {
  it('renders a blank manual override form with current values as operator context', () => {
    const html = renderToStaticMarkup(
      <ManualMovieMetadataPanel detail={catalogMovieDetail()} manualStatus="updated" />,
    );

    expect(html).toContain('Manual metadata override');
    expect(html).toContain('Manual metadata fields were applied.');
    expect(html).toContain('href="https://www.themoviedb.org/search?query=Heat%201995"');
    expect(html).toContain('Current: 949');
    expect(html).toContain('name="tmdb_id"');
    expect(html).not.toContain('name="tmdb_id" placeholder="e.g. 475557" value=');
    expect(html).toContain('Apply manual fields');
  });
});

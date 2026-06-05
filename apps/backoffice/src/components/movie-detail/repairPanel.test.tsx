import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { catalogMovieDetail, catalogMovieDetailHealthFlag } from '../../test/backofficeFixtures';
import { MovieRepairPanel } from './repairPanel';

describe('MovieRepairPanel', () => {
  it('renders the focused repair form for repairable active flags', () => {
    const html = renderToStaticMarkup(
      <MovieRepairPanel detail={catalogMovieDetail()} repairStatus="queued" />,
    );

    expect(html).toContain('1 repairable');
    expect(html).toContain('repair-message accepted');
    expect(html).toContain('name="action" value="enqueue_backfill"');
    expect(html).toContain('name="movie_id" value="42"');
    expect(html).toContain('name="issue_key"');
    expect(html).toContain('Missing poster');
    expect(html).toContain('Queue focused repair');
  });

  it('renders manual-review copy for active non-repairable flags', () => {
    const detail = catalogMovieDetail({
      healthFlags: [catalogMovieDetailHealthFlag({ key: 'duplicate_tmdb_id', label: 'Duplicate' })],
    });

    const html = renderToStaticMarkup(<MovieRepairPanel detail={detail} repairStatus="failed" />);

    expect(html).toContain('No action');
    expect(html).toContain('repair-message warn');
    expect(html).toContain('manual review or duplicate-merge tooling');
    expect(html).not.toContain('Queue focused repair');
  });

  it('renders the no-active-flags copy for healthy movies', () => {
    const detail = catalogMovieDetail({
      healthFlags: [catalogMovieDetailHealthFlag({ isActive: false })],
    });

    const html = renderToStaticMarkup(<MovieRepairPanel detail={detail} repairStatus={null} />);

    expect(html).toContain('No action');
    expect(html).toContain('No active catalog-health flags need repair for this movie.');
    expect(html).not.toContain('repair-message');
  });
});

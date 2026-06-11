import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { catalogMovieDetail, catalogMovieDetailHealthFlag } from '../../test/backofficeFixtures';
import { MovieIdentityPanel } from './identityPanel';

describe('MovieIdentityPanel', () => {
  it('renders active issue, poster fallback, localized title, and TMDB metadata', () => {
    const html = renderToStaticMarkup(
      <MovieIdentityPanel detail={catalogMovieDetail()} manualStatus={null} />,
    );

    expect(html).toContain('Movie #42');
    expect(html).toContain('1 active issue(s)');
    expect(html).toContain('No poster');
    expect(html).toContain('Fuego contra fuego');
    expect(html).toContain('2h 50m');
    expect(html).toContain('href="https://www.themoviedb.org/movie/949"');
    expect(html).toContain('92%');
    expect(html).toContain('manual_review');
    expect(html).toContain('Manual correction');
    expect(html).toContain('Edit fields');
    expect(html).not.toContain('name="poster_url"');
  });

  it('renders the healthy state and local fallbacks when metadata is missing', () => {
    const detail = catalogMovieDetail({
      healthFlags: [catalogMovieDetailHealthFlag({ isActive: false })],
      movie: {
        ...catalogMovieDetail().movie,
        ageRating: '',
        description: '',
        localizedName: null,
        posterUrl: 'https://image.test/poster.jpg',
        tmdbId: null,
        tmdbMatchConfidence: null,
        tmdbMatchSource: null,
      },
    });

    const html = renderToStaticMarkup(<MovieIdentityPanel detail={detail} manualStatus={null} />);

    expect(html).toContain('Healthy');
    expect(html).toContain('src="https://image.test/poster.jpg"');
    expect(html).toContain('Heat poster');
    expect(html).toContain('No local description stored.');
    expect(html).toContain('<span class="data-pill neutral">-</span>');
  });
});

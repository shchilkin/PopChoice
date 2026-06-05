import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  catalogMovieDetailPersonCredit,
  catalogMovieDetailTaxonomyItem,
} from '../../test/backofficeFixtures';
import { PeopleTable, TaxonomyList } from './taxonomyPanels';

describe('movie detail taxonomy panels', () => {
  it('renders taxonomy chips and empty taxonomy states', () => {
    expect(
      renderToStaticMarkup(
        <TaxonomyList emptyLabel="No genres stored" items={[catalogMovieDetailTaxonomyItem()]} />,
      ),
    ).toContain('Crime');

    expect(
      renderToStaticMarkup(<TaxonomyList emptyLabel="No genres stored" items={[]} />),
    ).toContain('No genres stored');
  });

  it('renders people rows with role, TMDB, order, and fallback fields', () => {
    const html = renderToStaticMarkup(
      <PeopleTable
        emptyLabel="No people stored"
        people={[
          catalogMovieDetailPersonCredit(),
          catalogMovieDetailPersonCredit({
            billingOrder: null,
            characterName: null,
            id: 'credit-2',
            job: 'Director',
            name: 'Michael Mann',
            role: 'director',
            tmdbId: null,
          }),
        ]}
      />,
    );

    expect(html).toContain('Robert De Niro');
    expect(html).toContain('Neil McCauley');
    expect(html).toContain('380');
    expect(html).toContain('Michael Mann');
    expect(html).toContain('Director');
    expect(html).toContain('<td>-</td>');
    expect(
      renderToStaticMarkup(<PeopleTable emptyLabel="No people stored" people={[]} />),
    ).toContain('No people stored');
  });
});

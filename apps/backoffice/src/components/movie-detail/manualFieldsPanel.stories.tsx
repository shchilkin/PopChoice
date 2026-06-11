import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { catalogMovieDetail, catalogMovieDetailHealthFlag } from '../../test/backofficeFixtures';
import { ManualMovieMetadataPanel } from './manualFieldsPanel';

import '../../app/globals.css';

const meta: Meta<typeof ManualMovieMetadataPanel> = {
  title: 'Backoffice/Movie Detail/Edit Metadata Fields',
  component: ManualMovieMetadataPanel,
  parameters: {
    layout: 'padded',
    surface: 'backoffice',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ManualMovieMetadataPanel>;

export const MissingIdentity: Story = {
  args: {
    detail: catalogMovieDetail({
      healthFlags: [
        catalogMovieDetailHealthFlag({ key: 'missing_tmdb_id', label: 'Missing tmdb_id' }),
        catalogMovieDetailHealthFlag({ key: 'missing_poster_url', label: 'Missing poster_url' }),
      ],
      movie: {
        ...catalogMovieDetail().movie,
        localizedName: null,
        posterUrl: null,
        tmdbId: null,
        tmdbMatchConfidence: null,
        tmdbMatchSource: null,
        tmdbMatchedAt: null,
      },
    }),
    manualStatus: null,
  },
};

export const Updated: Story = {
  args: {
    detail: catalogMovieDetail(),
    manualStatus: 'updated',
  },
};

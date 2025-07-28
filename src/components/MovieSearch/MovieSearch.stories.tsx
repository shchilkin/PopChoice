import type { Meta, StoryObj } from '@storybook/react';

import { MovieSearch } from './MovieSearch';

const meta: Meta<typeof MovieSearch> = {
  title: 'Components/MovieSearch',
  component: MovieSearch,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    loading: {
      control: 'boolean',
      description: 'Whether the search is in a loading state',
    },
    searchCapabilities: {
      control: 'object',
      description: 'Search capabilities configuration',
    },
  },
  args: {
    onSearch: () => {},
    onClear: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    loading: false,
    searchCapabilities: {
      supportsBasicSearch: true,
      supportsAdvancedSearch: true,
    },
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    searchCapabilities: {
      supportsBasicSearch: true,
      supportsAdvancedSearch: true,
    },
  },
};

export const BasicSearchOnly: Story = {
  args: {
    loading: false,
    searchCapabilities: {
      supportsBasicSearch: true,
      supportsAdvancedSearch: false,
    },
  },
};

export const WithInitialFilters: Story = {
  args: {
    loading: false,
  },
  play: async ({ canvasElement }) => {
    // Note: In a real implementation, you might want to programmatically
    // set initial values, but for this story we'll show the empty state
    // and let users interact with the controls
  },
};
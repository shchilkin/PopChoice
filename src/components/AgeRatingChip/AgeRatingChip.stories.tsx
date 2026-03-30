import { AgeRatingChip } from './AgeRatingChip';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof AgeRatingChip> = {
  title: 'Components/AgeRatingChip',
  component: AgeRatingChip,
  parameters: {
    docs: {
      description: {
        component:
          'A reusable chip component for displaying movie age ratings with semantic color coding. Uses theme-aware color tokens that work across light and dark modes.',
      },
    },
  },
  argTypes: {
    rating: {
      control: 'select',
      options: ['G', 'PG', 'PG-13', 'R', 'NR', '12+', '15', '16+', '18+'],
      description: 'The age rating to display',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant of the chip',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply',
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AgeRatingChip>;

// Basic rating examples
export const SafeRating: Story = {
  args: {
    rating: 'G',
  },
  parameters: {
    docs: {
      description: {
        story:
          'General audiences - safe content suitable for all ages. Uses green semantic tokens (rating-safe-*).',
      },
    },
  },
};

export const CautionRating: Story = {
  args: {
    rating: 'PG',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Parental guidance suggested - some content may not be suitable for children. Uses blue semantic tokens (rating-caution-*).',
      },
    },
  },
};

export const TeenRating: Story = {
  args: {
    rating: 'PG-13',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Parents strongly cautioned - some material may be inappropriate for children under 13. Uses orange semantic tokens (rating-teen-*).',
      },
    },
  },
};

export const MatureRating: Story = {
  args: {
    rating: 'R',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Restricted - under 17 requires accompanying parent or guardian. Uses red semantic tokens (rating-mature-*).',
      },
    },
  },
};

export const UnknownRating: Story = {
  args: {
    rating: 'NR',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Not rated - no official rating assigned. Uses gray semantic tokens (rating-unknown-*).',
      },
    },
  },
};

// International ratings
export const InternationalRatings: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <AgeRatingChip rating="12+" />
      <AgeRatingChip rating="15" />
      <AgeRatingChip rating="16+" />
      <AgeRatingChip rating="18+" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'International age rating systems (European/UK ratings). All mature ratings use red semantic tokens (rating-mature-*).',
      },
    },
  },
};

// Size variants
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <AgeRatingChip rating="PG-13" size="sm" />
      <AgeRatingChip rating="PG-13" size="md" />
      <AgeRatingChip rating="PG-13" size="lg" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different size variants: small, medium (default), and large.',
      },
    },
  },
};

// All rating types showcase
export const AllRatingTypes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 p-4">
      <div className="text-center">
        <AgeRatingChip rating="G" />
        <p className="text-xs mt-2 text-gray-600">Safe</p>
      </div>
      <div className="text-center">
        <AgeRatingChip rating="PG" />
        <p className="text-xs mt-2 text-gray-600">Caution</p>
      </div>
      <div className="text-center">
        <AgeRatingChip rating="PG-13" />
        <p className="text-xs mt-2 text-gray-600">Teen</p>
      </div>
      <div className="text-center">
        <AgeRatingChip rating="R" />
        <p className="text-xs mt-2 text-gray-600">Mature</p>
      </div>
      <div className="text-center">
        <AgeRatingChip rating="NR" />
        <p className="text-xs mt-2 text-gray-600">Unknown</p>
      </div>
      <div className="text-center">
        <AgeRatingChip rating="18+" />
        <p className="text-xs mt-2 text-gray-600">International</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete showcase of all age rating types with their semantic color coding.',
      },
    },
  },
};

// Usage in context (simulating table row)
export const InTableContext: Story = {
  render: () => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
              Movie
            </th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
              Rating
            </th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
              Year
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
              The Lion King
            </td>
            <td className="px-4 py-3 text-center">
              <AgeRatingChip rating="G" size="sm" />
            </td>
            <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">1994</td>
          </tr>
          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
              Spider-Man
            </td>
            <td className="px-4 py-3 text-center">
              <AgeRatingChip rating="PG-13" size="sm" />
            </td>
            <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">2002</td>
          </tr>
          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
              Deadpool
            </td>
            <td className="px-4 py-3 text-center">
              <AgeRatingChip rating="R" size="sm" />
            </td>
            <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">2016</td>
          </tr>
        </tbody>
      </table>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Example usage within a table context, showing how the chips look in a real data table.',
      },
    },
  },
};

// Custom styling example
export const CustomStyling: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <AgeRatingChip rating="PG-13" className="border-2 border-gray-300 dark:border-gray-600" />
      <AgeRatingChip
        rating="R"
        className="shadow-lg transform hover:scale-105 transition-transform"
      />
      <AgeRatingChip rating="G" size="lg" className="font-bold tracking-wider" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Examples with custom styling applied via className prop. The component accepts additional CSS classes for customization.',
      },
    },
  },
};

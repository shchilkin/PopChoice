import { CreatorCredit } from './CreatorCredit';

import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof CreatorCredit> = {
  title: 'Components/CreatorCredit',
  component: CreatorCredit,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A floating credit card that shows creator information with GitHub links. Can be minimized or dismissed.',
      },
    },
  },
  argTypes: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The default expanded state of the creator credit card.',
      },
    },
  },
};

export const WithBackground: Story = {
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Creator credit card displayed on a dark background to show contrast.',
      },
    },
  },
};

export const InContext: Story = {
  decorators: [
    ((Story) => (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Sample Page</h1>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            This shows how the creator credit card appears in the context of a real page. It should
            be positioned in the bottom-right corner and not interfere with the content.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris.
          </p>
        </div>
        <Story />
      </div>
    )) as Decorator,
  ],
  parameters: {
    docs: {
      description: {
        story:
          'Creator credit card shown in the context of a page to demonstrate positioning and non-interference.',
      },
    },
  },
};

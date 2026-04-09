import { GroupSetup } from './GroupSetup';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof GroupSetup> = {
  title: 'Quiz/GroupSetup',
  component: GroupSetup,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Group setup screen where users add names for group movie night. Supports 2–6 people.',
      },
    },
  },
  args: {
    onGroupNamesChange: () => {},
    onBack: () => {},
    onStart: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof GroupSetup>;

export const TwoPeople: Story = {
  args: { groupNames: ['Alice', 'Bob'] },
};

export const Empty: Story = {
  args: { groupNames: ['', ''] },
};

export const FullGroup: Story = {
  args: {
    groupNames: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'],
  },
};

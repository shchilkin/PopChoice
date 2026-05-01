import { QuizIntro } from './QuizIntro';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof QuizIntro> = {
  title: 'Quiz/QuizIntro',
  component: QuizIntro,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The intro screen of the movie quiz. Users choose between solo and group mode.',
      },
    },
  },
  args: {
    onStartSolo: () => {},
    onStartGroup: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof QuizIntro>;

export const Default: Story = {};

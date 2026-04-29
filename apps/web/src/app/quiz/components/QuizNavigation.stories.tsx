import { QuizNavigation } from './QuizNavigation';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof QuizNavigation> = {
  title: 'Quiz/QuizNavigation',
  component: QuizNavigation,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Navigation bar with Back and Continue/Submit buttons for the quiz. Adapts label based on current step and person.',
      },
    },
  },
  args: {
    onBack: () => {},
    onNext: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof QuizNavigation>;

export const CanContinue: Story = {
  args: {
    canProceed: true,
    isSubmitting: false,
    isLastStep: false,
    isLastPerson: true,
  },
};

export const Disabled: Story = {
  args: {
    canProceed: false,
    isSubmitting: false,
    isLastStep: false,
    isLastPerson: true,
  },
};

export const Submitting: Story = {
  args: {
    canProceed: true,
    isSubmitting: true,
    isLastStep: true,
    isLastPerson: true,
  },
};

export const FindMyMovie: Story = {
  args: {
    canProceed: true,
    isSubmitting: false,
    isLastStep: true,
    isLastPerson: true,
  },
};

export const NextPerson: Story = {
  args: {
    canProceed: true,
    isSubmitting: false,
    isLastStep: true,
    isLastPerson: false,
  },
};

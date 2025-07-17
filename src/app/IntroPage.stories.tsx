import { expect, userEvent, waitFor, within } from 'storybook/test';

import IntroPage from './page';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof IntroPage> = {
  title: 'Pages/Intro Page',
  component: IntroPage,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
};

export default meta;

export const EmptyForm = () => <IntroPage />;

export const DisabledState: Story = {
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);

    // Start button should be disabled when form is empty
    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /Start/i })).toBeDisabled();
    });

    // Fill only people count
    await userEvent.type(canvas.getByPlaceholderText(/Enter number of people/i), '2');

    // Should still be disabled
    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /Start/i })).toBeDisabled();
    });

    // Clear people count and fill time
    await userEvent.clear(canvas.getByPlaceholderText(/Enter number of people/i));
    await userEvent.type(canvas.getByPlaceholderText(/How much time do you have?/i), '1 hour');

    // Should still be disabled
    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /Start/i })).toBeDisabled();
    });
  },
};

type Story = StoryObj<typeof meta>;

export const FilledForm: Story = {
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);

    // Initially the Start button should be disabled
    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /Start/i })).toBeDisabled();
    });

    await userEvent.type(canvas.getByPlaceholderText(/Enter number of people/i), '3', {
      delay: 20,
    });
    await new Promise((res) => setTimeout(res, 200));

    // Still disabled with only one field filled
    expect(canvas.getByRole('button', { name: /Start/i })).toBeDisabled();

    await userEvent.type(
      canvas.getByPlaceholderText(/How much time do you have?/i),
      '2 hours 30 minutes',
      {
        delay: 20,
      },
    );

    await new Promise((res) => setTimeout(res, 400));

    // Now should be enabled with both fields filled
    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /Start/i })).not.toBeDisabled();
    });

    // Click the button and it should become disabled (submitting state)
    await userEvent.click(canvas.getByRole('button', { name: /Start/i }));

    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /Start/i })).toBeDisabled();
    });
  },
};

export const FilledFormWithHelpers: Story = {
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);

    // Initially the Start button should be disabled
    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /Start/i })).toBeDisabled();
    });

    await userEvent.click(canvas.getByRole('button', { name: '3' }));
    await new Promise((res) => setTimeout(res, 200));

    // Still disabled with only one field filled
    expect(canvas.getByRole('button', { name: /Start/i })).toBeDisabled();

    await userEvent.click(canvas.getByRole('button', { name: '2 hours' }));

    await new Promise((res) => setTimeout(res, 400));

    // Now should be enabled with both fields filled
    await waitFor(() => {
      expect(canvas.getByPlaceholderText(/Enter number of people/i)).toHaveValue(3);
      expect(canvas.getByPlaceholderText(/How much time do you have?/i)).toHaveValue('2 hours');
      expect(canvas.getByRole('button', { name: /Start/i })).not.toBeDisabled();
    });

    // Click the button and it should become disabled (submitting state)
    await userEvent.click(canvas.getByRole('button', { name: /Start/i }));

    await waitFor(() => {
      expect(canvas.getByRole('button', { name: /Start/i })).toBeDisabled();
    });
  },
};

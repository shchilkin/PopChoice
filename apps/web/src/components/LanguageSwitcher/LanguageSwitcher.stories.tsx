import { LanguageSwitcher } from './LanguageSwitcher';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LanguageProvider } from '@/i18n';

const meta: Meta<typeof LanguageSwitcher> = {
  title: 'Components/LanguageSwitcher',
  component: LanguageSwitcher,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <LanguageProvider>
        <div className="flex items-center justify-center p-8">
          <Story />
        </div>
      </LanguageProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Dropdown menu for switching the UI language between English, Russian, and Finnish. Detects the browser language on first visit and persists the selection in `localStorage`. Press Escape or click outside to close.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof LanguageSwitcher>;

export const Default: Story = {};

export const InNavbar: Story = {
  render: () => (
    <LanguageProvider>
      <div
        className="flex items-center justify-between px-4 py-3 rounded-2xl w-80"
        style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd1)' }}
      >
        <span style={{ color: 'var(--pc-t1)', fontWeight: 600, fontSize: '0.9rem' }}>
          PopChoice
        </span>
        <LanguageSwitcher />
      </div>
    </LanguageProvider>
  ),
  parameters: {
    docs: {
      description: { story: 'As it appears in the navigation bar.' },
    },
  },
};

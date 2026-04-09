import { PCLayout } from './PCLayout';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof PCLayout> = {
  title: 'Components/PCLayout',
  component: PCLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'App shell containing the sticky header (logo, nav links, theme toggle, CTA) and footer. Wraps every page in the application. Header shows "Find a movie" CTA on all pages except the landing (`/`).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PCLayout>;

const SampleContent = () => (
  <div
    className="flex flex-col items-center justify-center gap-6 px-5 py-20 text-center"
    style={{ minHeight: '60vh' }}
  >
    <div className="text-5xl">🎬</div>
    <h1
      style={{
        fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
        fontSize: '2.5rem',
        letterSpacing: '0.06em',
        color: 'var(--pc-t1)',
      }}
    >
      Page content here
    </h1>
    <p style={{ color: 'var(--pc-t3)', maxWidth: 400 }}>
      The PCLayout wraps all pages and provides the sticky header and footer.
    </p>
  </div>
);

export const Default: Story = {
  args: {
    children: <SampleContent />,
  },
};

export const WithRichContent: Story = {
  args: {
    children: (
      <div className="px-5 py-10 max-w-2xl mx-auto w-full">
        <div
          className="p-6 rounded-2xl mb-6"
          style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
        >
          <h2
            style={{
              fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
              fontSize: '1.8rem',
              color: 'var(--pc-t1)',
              letterSpacing: '0.05em',
            }}
          >
            Sample card
          </h2>
          <p style={{ color: 'var(--pc-t3)', marginTop: 8, fontSize: '0.9rem', lineHeight: 1.7 }}>
            This shows how content renders inside the PCLayout shell, with the header above and
            footer below.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {['Action', 'Comedy', 'Drama', 'Sci-Fi'].map((genre) => (
            <div
              key={genre}
              className="p-4 rounded-xl"
              style={{
                background: 'var(--pc-surface)',
                border: '1px solid var(--pc-bd1)',
                color: 'var(--pc-t2)',
                fontSize: '0.88rem',
                textAlign: 'center',
              }}
            >
              {genre}
            </div>
          ))}
        </div>
      </div>
    ),
  },
};

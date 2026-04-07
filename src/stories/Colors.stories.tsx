import type { Meta, StoryObj } from '@storybook/nextjs-vite';

interface ColorSwatchProps {
  variable: string;
  label: string;
  description?: string;
}

const ColorSwatch = ({ variable, label, description }: ColorSwatchProps) => (
  <div className="flex flex-col gap-1">
    <div
      className="w-full h-16 rounded-lg border border-[var(--border)]"
      style={{ background: `var(${variable})` }}
    />
    <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
    <p className="text-xs text-[var(--muted-foreground)] font-mono">{variable}</p>
    {description && <p className="text-xs text-[var(--muted-foreground)]">{description}</p>}
  </div>
);

interface ColorGroupProps {
  title: string;
  colors: ColorSwatchProps[];
}

const ColorGroup = ({ title, colors }: ColorGroupProps) => (
  <section className="flex flex-col gap-4">
    <h2 className="text-lg font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
      {title}
    </h2>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {colors.map((color) => (
        <ColorSwatch key={color.variable} {...color} />
      ))}
    </div>
  </section>
);

const ColorsPage = () => (
  <div className="flex flex-col gap-10 p-6 bg-[var(--background)] min-h-screen">
    <div>
      <h1 className="text-3xl font-bold text-[var(--foreground)]">Color Palette</h1>
      <p className="text-[var(--muted-foreground)] mt-2">
        All color tokens available in PopChoice. These CSS custom properties adapt to the active
        theme (light/dark). Use the theme switcher in the toolbar to preview both modes.
      </p>
    </div>

    <ColorGroup
      title="Base"
      colors={[
        { variable: '--background', label: 'Background', description: 'Page background' },
        { variable: '--foreground', label: 'Foreground', description: 'Primary text' },
      ]}
    />

    <ColorGroup
      title="Card"
      colors={[
        { variable: '--card', label: 'Card', description: 'Card background' },
        { variable: '--card-foreground', label: 'Card Foreground', description: 'Card text' },
      ]}
    />

    <ColorGroup
      title="Primary"
      colors={[
        { variable: '--primary', label: 'Primary', description: 'Primary action color' },
        {
          variable: '--primary-foreground',
          label: 'Primary Foreground',
          description: 'Text on primary',
        },
      ]}
    />

    <ColorGroup
      title="Secondary"
      colors={[
        { variable: '--secondary', label: 'Secondary', description: 'Secondary surface color' },
        {
          variable: '--secondary-foreground',
          label: 'Secondary Foreground',
          description: 'Text on secondary',
        },
      ]}
    />

    <ColorGroup
      title="Muted"
      colors={[
        { variable: '--muted', label: 'Muted', description: 'Muted surface color' },
        {
          variable: '--muted-foreground',
          label: 'Muted Foreground',
          description: 'De-emphasized text',
        },
      ]}
    />

    <ColorGroup
      title="Accent"
      colors={[
        { variable: '--accent', label: 'Accent', description: 'Brand accent / CTA color' },
        {
          variable: '--accent-foreground',
          label: 'Accent Foreground',
          description: 'Text on accent',
        },
      ]}
    />

    <ColorGroup
      title="Utility"
      colors={[
        { variable: '--border', label: 'Border', description: 'Default border color' },
        { variable: '--input', label: 'Input', description: 'Input field background' },
        { variable: '--ring', label: 'Ring', description: 'Focus ring color' },
        { variable: '--alert', label: 'Alert', description: 'Alert / warning color' },
      ]}
    />

    <ColorGroup
      title="Age Rating — Safe (G)"
      colors={[
        {
          variable: '--rating-safe-bg',
          label: 'Background',
          description: 'Safe rating background',
        },
        { variable: '--rating-safe-text', label: 'Text', description: 'Safe rating text' },
        { variable: '--rating-safe-border', label: 'Border', description: 'Safe rating border' },
      ]}
    />

    <ColorGroup
      title="Age Rating — Caution (PG)"
      colors={[
        {
          variable: '--rating-caution-bg',
          label: 'Background',
          description: 'Caution rating background',
        },
        { variable: '--rating-caution-text', label: 'Text', description: 'Caution rating text' },
        {
          variable: '--rating-caution-border',
          label: 'Border',
          description: 'Caution rating border',
        },
      ]}
    />

    <ColorGroup
      title="Age Rating — Teen (PG-13)"
      colors={[
        {
          variable: '--rating-teen-bg',
          label: 'Background',
          description: 'Teen rating background',
        },
        { variable: '--rating-teen-text', label: 'Text', description: 'Teen rating text' },
        { variable: '--rating-teen-border', label: 'Border', description: 'Teen rating border' },
      ]}
    />

    <ColorGroup
      title="Age Rating — Mature (R)"
      colors={[
        {
          variable: '--rating-mature-bg',
          label: 'Background',
          description: 'Mature rating background',
        },
        { variable: '--rating-mature-text', label: 'Text', description: 'Mature rating text' },
        {
          variable: '--rating-mature-border',
          label: 'Border',
          description: 'Mature rating border',
        },
      ]}
    />

    <ColorGroup
      title="Age Rating — Unknown (NR)"
      colors={[
        {
          variable: '--rating-unknown-bg',
          label: 'Background',
          description: 'Unknown rating background',
        },
        { variable: '--rating-unknown-text', label: 'Text', description: 'Unknown rating text' },
        {
          variable: '--rating-unknown-border',
          label: 'Border',
          description: 'Unknown rating border',
        },
      ]}
    />
  </div>
);

const meta: Meta = {
  title: 'Design System/Colors',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Visual reference for all color tokens in the PopChoice design system. All tokens are CSS custom properties that respond to the active theme.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const AllColors: Story = {
  render: () => <ColorsPage />,
};

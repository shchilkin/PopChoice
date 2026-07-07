import { Badge, Button, ButtonLink, DataTable, TabsLink, TabsNav } from '..';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

function UiPackagePlan() {
  return (
    <section
      style={{
        display: 'grid',
        gap: 18,
        maxWidth: 860,
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <p style={{ margin: 0, color: '#737373', fontSize: 12, fontWeight: 800 }}>packages/ui</p>
      <h2 style={{ margin: 0, fontSize: 24 }}>Shared UI primitives</h2>
      <p style={{ color: '#525252', lineHeight: 1.5, margin: 0 }}>
        Domain-free shadcn-derived source components used by app workflows. Keep product-specific
        composition in the owning app.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Button type="button" variant="primary">
          Primary
        </Button>
        <Button type="button" variant="secondary">
          Secondary
        </Button>
        <Button type="button" variant="quiet">
          Quiet
        </Button>
        <ButtonLink href="#repair">Review repair</ButtonLink>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Badge variant="success">Healthy</Badge>
        <Badge variant="warning">Needs work</Badge>
        <Badge variant="accent">Repairable</Badge>
        <Badge variant="muted">Queued</Badge>
      </div>
      <TabsNav aria-label="Shared UI tabs">
        <TabsLink active href="#catalog">
          Catalog
        </TabsLink>
        <TabsLink href="#queue">Queue</TabsLink>
        <TabsLink href="#reviews">Reviews</TabsLink>
      </TabsNav>
      <DataTable columns={['Primitive', 'Purpose']}>
        <tr>
          <td>Button</td>
          <td>Commands, links, and form actions</td>
        </tr>
        <tr>
          <td>Badge</td>
          <td>Status, count, and health chips</td>
        </tr>
      </DataTable>
    </section>
  );
}

const meta: Meta<typeof UiPackagePlan> = {
  title: 'Shared UI/Architecture/Package Plan',
  component: UiPackagePlan,
  parameters: {
    layout: 'padded',
    surface: 'shared-ui',
  },
};

export default meta;
type Story = StoryObj<typeof UiPackagePlan>;

export const Plan: Story = {};

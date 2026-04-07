import { TopNavigation } from './TopNavigation';

export default {
  title: 'Components/TopNavigation',
  component: TopNavigation,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    minimizeMode: {
      control: 'boolean',
      description: 'Hide navigation links and show only logo/brand',
    },
    logoSize: {
      control: { type: 'range', min: 40, max: 100, step: 10 },
      description: 'Size of the logo in pixels',
    },
    firstStripeColor: {
      control: 'color',
      description: 'Primary color for the mascot stripes',
    },
    secondStripeColor: {
      control: 'color',
      description: 'Secondary color for the mascot stripes',
    },
  },
};

export const Default = () => (
  <div className="p-4">
    <TopNavigation firstStripeColor="#f20000" secondStripeColor="#fff" logoSize={60} />
  </div>
);

export const WithNavigation = () => (
  <div className="p-4">
    <TopNavigation
      firstStripeColor="#f20000"
      secondStripeColor="#fff"
      logoSize={60}
      minimizeMode={false}
    />
  </div>
);

export const MinimizeMode = () => (
  <div className="p-4">
    <TopNavigation
      firstStripeColor="#f20000"
      secondStripeColor="#fff"
      logoSize={60}
      minimizeMode={true}
    />
  </div>
);

export const Blue = () => (
  <div className="p-4">
    <TopNavigation firstStripeColor="#0066cc" secondStripeColor="#ffeb3b" logoSize={60} />
  </div>
);

export const Green = () => (
  <div className="p-4">
    <TopNavigation firstStripeColor="#4caf50" secondStripeColor="#e91e63" logoSize={60} />
  </div>
);

export const Large = () => (
  <div className="p-4">
    <TopNavigation firstStripeColor="#f20000" secondStripeColor="#fff" logoSize={80} />
  </div>
);

export const Small = () => (
  <div className="p-4">
    <TopNavigation firstStripeColor="#f20000" secondStripeColor="#fff" logoSize={40} />
  </div>
);

export const MobileView = () => (
  <div className="p-4 max-w-sm">
    <TopNavigation firstStripeColor="#f20000" secondStripeColor="#fff" logoSize={60} />
  </div>
);

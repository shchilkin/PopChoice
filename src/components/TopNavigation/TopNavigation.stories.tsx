import { TopNavigation } from './TopNavigation';

export default {
  title: 'Components/TopNavigation',
  component: TopNavigation,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => (
  <TopNavigation firstStripeColor="#f20000" secondStripeColor="#fff" logoSize={60} />
);

export const Blue = () => (
  <TopNavigation firstStripeColor="#0066cc" secondStripeColor="#ffeb3b" logoSize={60} />
);

export const Green = () => (
  <TopNavigation firstStripeColor="#4caf50" secondStripeColor="#e91e63" logoSize={60} />
);

export const Large = () => (
  <TopNavigation firstStripeColor="#f20000" secondStripeColor="#fff" logoSize={80} />
);

export const Small = () => (
  <TopNavigation firstStripeColor="#f20000" secondStripeColor="#fff" logoSize={40} />
);

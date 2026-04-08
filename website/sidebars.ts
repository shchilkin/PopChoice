import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Getting Started',
      items: ['setup'],
    },
    {
      type: 'category',
      label: 'Development',
      items: ['development', 'storybook-theming'],
    },
    {
      type: 'category',
      label: 'CI/CD',
      items: ['ci-cd'],
    },
  ],
};

export default sidebars;

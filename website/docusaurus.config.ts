import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'PopChoice',
  tagline: 'AI-powered movie recommendation engine',
  favicon: 'img/favicon.ico',

  url: 'https://shchilkin.github.io',
  baseUrl: '/PopChoice/',

  organizationName: 'shchilkin',
  projectName: 'PopChoice',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'PopChoice',
      logo: {
        alt: 'PopChoice Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/shchilkin/PopChoice',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/' },
            { label: 'Setup Guide', to: '/setup' },
            { label: 'Development Guide', to: '/development' },
            { label: 'CI/CD', to: '/ci-cd' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'Live App', href: 'https://pop-choice-beige.vercel.app' },
            { label: 'GitHub', href: 'https://github.com/shchilkin/PopChoice' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} PopChoice. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'sql', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

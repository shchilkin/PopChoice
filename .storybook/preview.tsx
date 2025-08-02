import { withThemeByClassName } from '@storybook/addon-themes';
import { initialize, mswLoader } from 'msw-storybook-addon';
import React from 'react';

import { ThemeProvider } from '../src/components/ThemeProvider';

import type { Preview } from '@storybook/nextjs-vite';
import type { ReactRenderer } from '@storybook/react';

import '../src/app/globals.css';

// Initialize MSW with proper configuration
initialize({
  onUnhandledRequest: 'bypass', // Let unhandled requests pass through instead of warning
  quiet: false, // Set to true to reduce MSW logging
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },

    // Global MSW configuration
    msw: {
      handlers: [], // No global handlers, only story-specific ones
    },

    // Docs configuration
    docs: {
      autodocs: 'tag', // Enable auto-generated docs for stories with 'autodocs' tag
      defaultName: 'Documentation', // Default name for docs page
    },

    // Theme backgrounds
    backgrounds: {
      disable: true, // Disable backgrounds since we use CSS variables
    },
  },
  // Provide the MSW addon loader globally
  loaders: [mswLoader],
  decorators: [
    // Theme decorator with ThemeProvider wrapper
    withThemeByClassName<ReactRenderer>({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
    // ThemeProvider decorator
    (Story) => {
      return (
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <div style={{ minHeight: '100vh' }}>
            <Story />
          </div>
        </ThemeProvider>
      );
    },
  ],
};

export default preview;

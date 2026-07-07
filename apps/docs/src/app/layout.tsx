import { RootProvider } from 'fumadocs-ui/provider/next';

import type { ReactNode } from 'react';

import './global.css';

export const metadata = {
  title: {
    default: 'PopChoice Docs',
    template: '%s | PopChoice Docs',
  },
  description: 'Project documentation for PopChoice.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

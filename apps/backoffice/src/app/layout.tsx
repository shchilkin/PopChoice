import { BackofficeQueryProvider } from '../components/queryProvider';

import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'PopChoice Backoffice',
    template: '%s · PopChoice Backoffice',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BackofficeQueryProvider>{children}</BackofficeQueryProvider>
      </body>
    </html>
  );
}

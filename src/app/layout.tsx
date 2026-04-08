import { Analytics } from '@vercel/analytics/next';
import { Bebas_Neue, DM_Sans } from 'next/font/google';

import { PCLayout } from '../components/PCLayout';
import { ThemeProvider } from '../components/ThemeProvider';

import type { Metadata } from 'next';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const bebasNeue = Bebas_Neue({
  variable: '--font-bebas-neue',
  subsets: ['latin'],
  weight: '400',
});
export const metadata: Metadata = {
  title: 'PopChoice - AI Movie Recommendations',
  description:
    'Discover your next favorite movie with AI-powered recommendations. PopChoice uses OpenAI embeddings and vector databases to provide personalized movie suggestions based on your preferences.',
  keywords: [
    'movie recommendations',
    'AI movies',
    'personalized suggestions',
    'OpenAI',
    'vector database',
    'film discovery',
    'movie finder',
    'cinema AI',
  ],
  authors: [{ name: 'PopChoice' }],
  creator: 'PopChoice',
  publisher: 'PopChoice',
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL('https://pop-choice-beige.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'PopChoice - AI Movie Recommendations',
    description:
      'Discover your next favorite movie with AI-powered recommendations. Get personalized movie suggestions based on your unique preferences.',
    url: 'https://pop-choice-beige.vercel.app',
    siteName: 'PopChoice',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-Image.png',
        width: 1200,
        height: 630,
        alt: 'PopChoice - AI Movie Recommendations',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PopChoice - AI Movie Recommendations',
    description: 'Discover your next favorite movie with AI-powered recommendations.',
    images: ['/og-Image.png'],
    creator: '@PopChoice',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'verification-token', // Add actual Google Search Console verification token if available
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${bebasNeue.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          <PCLayout>
            {children}
          </PCLayout>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}

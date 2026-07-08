'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { palette } from '@/styles/designTokens';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The error has already been reported server-side via the Pino logger.
    // Log it client-side as well so it surfaces in browser dev-tools.
    // oxlint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 min-h-[60vh]">
      <div aria-hidden="true" className="text-5xl mb-6">
        🎬
      </div>
      <h2
        className="mb-3 text-center"
        style={{
          fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
          fontWeight: '600',
          textTransform: 'uppercase',
          fontSize: 'clamp(1.4rem, 4vw, 2rem)',
          letterSpacing: '0.05em',
          color: 'var(--pc-t1)',
        }}
      >
        Something went wrong
      </h2>
      <p
        className="mb-8 text-center max-w-sm"
        style={{ color: 'var(--pc-t3)', fontSize: '0.9rem', lineHeight: 1.6 }}
      >
        An unexpected error occurred. Please try again or go back to the home page.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-2xl transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--pc-cta)',
            color: 'var(--pc-cta-text)',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-6 py-3 rounded-2xl text-center transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--pc-ghost)',
            border: '1px solid var(--pc-bd2)',
            color: 'var(--pc-t2)',
            fontSize: '0.9rem',
          }}
        >
          Go home
        </Link>
      </div>
      {error.digest && (
        <p className="mt-8" style={{ color: 'var(--pc-t5)', fontSize: '0.72rem' }}>
          Error ID: {error.digest}
        </p>
      )}
      {/* Subtle accent line */}
      <div
        className="fixed bottom-0 left-0 right-0 h-0.5 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${palette.red}40, transparent)`,
        }}
      />
    </div>
  );
}

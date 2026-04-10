'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  // global-error renders when the root layout itself throws, so it must supply
  // its own <html> and <body> tags (the normal layout is not available).
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: 'system-ui, sans-serif',
          background: '#0a0a0a',
          color: '#f5f5f5',
          padding: '1.5rem',
          textAlign: 'center',
        }}
      >
        <div aria-hidden="true" style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>
          🎬
        </div>
        <h1
          style={{
            fontSize: 'clamp(1.4rem, 4vw, 2rem)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem',
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            color: '#a1a1aa',
            fontSize: '0.9rem',
            lineHeight: 1.6,
            maxWidth: '26rem',
            marginBottom: '2rem',
          }}
        >
          A critical error occurred. Please try refreshing the page.
        </p>
        <div
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '1rem',
              background: '#f5c518',
              color: '#0a0a0a',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {/* global-error renders when the root layout throws, so the Next.js
              router may be unavailable — use a plain anchor for safe navigation. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '1rem',
              background: 'transparent',
              border: '1px solid #3f3f46',
              color: '#a1a1aa',
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
            Go home
          </a>
        </div>
        {error.digest && (
          <p style={{ marginTop: '2rem', color: '#52525b', fontSize: '0.72rem' }}>
            Error ID: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}

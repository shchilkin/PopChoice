import { getUmamiConfig } from './src/utils/analytics/getUmamiConfig';

import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV === 'development';
const umamiConfig = getUmamiConfig();
const umamiOrigin = umamiConfig?.scriptOrigin;

const scriptSrc = [
  `'self'`,
  "'unsafe-inline'",
  ...(umamiOrigin ? [umamiOrigin] : []),
  ...(isDevelopment ? [`'unsafe-eval'`] : []),
];
const connectSrc = [
  `'self'`,
  ...(umamiOrigin ? [umamiOrigin] : []),
  'https://api.themoviedb.org',
  ...(isDevelopment ? ['ws:', 'wss:'] : []),
];

// Content-Security-Policy
// 'unsafe-inline' for scripts is required because Next.js App Router injects
// inline hydration scripts. A nonce-based CSP (via middleware) can replace
// 'unsafe-inline' for scripts in a future hardening pass.
// In development, Next.js tooling also needs 'unsafe-eval' for source maps
// and ws: wss: connections for Hot Module Replacement.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  // next/font self-hosts all font files under /_next/static/media/
  "font-src 'self'",
  "img-src 'self' data: blob: https://image.tmdb.org https://images.unsplash.com",
  // TMDB API requests are made from the browser for movie enhancement/poster data.
  // When Umami is configured, allow browser requests to the Umami origin.
  `connect-src ${connectSrc.join(' ')}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },
  // Enforce HTTPS for 2 years; include subdomains; opt-in to preload list.
  // Omitted in development to prevent browsers from caching HSTS for localhost,
  // which would force HTTPS on subsequent HTTP dev sessions.
  ...(!isDevelopment
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
  // Prevent the page from being embedded in any frame (legacy header alongside CSP frame-ancestors)
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Prevent browsers from MIME-sniffing the response Content-Type
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Send full URL only to same-origin; only the origin to cross-origin HTTPS
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Disable browser features not used by this app
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    return [
      {
        // Apply security headers to every route
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

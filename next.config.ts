import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV === 'development';

// Content-Security-Policy
// 'unsafe-inline' for scripts is required because Next.js App Router injects
// inline hydration scripts. A nonce-based CSP (via middleware) can replace
// 'unsafe-inline' for scripts in a future hardening pass.
// In development, Next.js tooling also needs 'unsafe-eval' for source maps
// and ws:/wss: connections for Hot Module Replacement.
const ContentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // next/font self-hosts all font files under /_next/static/media/
  "font-src 'self'",
  "img-src 'self' data: blob: https://image.tmdb.org https://images.unsplash.com",
  // Vercel Analytics sends page-view pings to vitals.vercel-insights.com
  `connect-src 'self' https://vitals.vercel-insights.com${isDevelopment ? ' ws: wss:' : ''}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },
  // Enforce HTTPS for 2 years; include subdomains; opt-in to preload list
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
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

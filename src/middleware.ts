import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'ru', 'fi'],

  // Used when no locale matches
  defaultLocale: 'en',

  // Enable automatic locale detection
  localeDetection: true,
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(ru|fi|en)/:path*'],
};

import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

// Define the supported locales
const locales = ['en', 'ru', 'fi'] as const;
type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  // Try to extract locale from headers if not provided
  let finalLocale = locale;

  if (!finalLocale) {
    try {
      const headersList = await headers();
      const pathname = headersList.get('x-pathname') || '';

      // Extract locale from pathname
      const pathSegments = pathname.split('/').filter(Boolean);
      const possibleLocale = pathSegments[0];

      if (locales.includes(possibleLocale as Locale)) {
        finalLocale = possibleLocale;
      }
    } catch {
      // Headers not available, continue with fallback
    }
  }

  // Final fallback to 'en'
  if (!finalLocale || !locales.includes(finalLocale as Locale)) {
    finalLocale = 'en';
  }

  return {
    locale: finalLocale,
    messages: (await import(`../../messages/${finalLocale}.json`)).default,
  };
});

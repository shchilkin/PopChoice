import { parseLocale } from '@/lib/locale';

import type { Locale } from '@/lib/locale';

export function parseMovieMemoryLocale(
  requestedLocale: string | null | undefined,
  fallbackLocale: Locale,
): Locale {
  return requestedLocale ? parseLocale(requestedLocale) : fallbackLocale;
}

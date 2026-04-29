/**
 * Reads the `__csrf` cookie value set by the Next.js middleware.
 * Returns an empty string when no cookie is found (e.g. SSR or first visit).
 */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)__csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

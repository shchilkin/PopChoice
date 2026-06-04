'use client';

import { useEffect, useRef, useState } from 'react';

const CACHE_KEY = 'pc_poster_bg_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Solid-colour SVG placeholders shaped like movie posters (2:3 ratio).
// Shown instantly before the TMDB fetch resolves — guarantees the background
// is never blank, even when the API is unreachable.
const FALLBACK_POSTERS: string[] = [
  '#1a1a2e',
  '#16213e',
  '#0f3460',
  '#533483',
  '#2c003e',
  '#1b1b2f',
  '#0d1117',
  '#0a0a14',
].map(
  (color) =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><rect width="300" height="450" fill="${color}"/></svg>`,
    )}`,
);

interface CacheEntry {
  posters: string[];
  ts: number;
}

function readCache(): string[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
    return entry.posters.length > 0 ? entry.posters : null;
  } catch {
    return null;
  }
}

function writeCache(posters: string[]): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ posters, ts: Date.now() } satisfies CacheEntry),
    );
  } catch {
    // localStorage unavailable (private browsing, storage full, etc.) — ignore
  }
}

async function fetchPosterURLs(): Promise<string[]> {
  // Calls the internal API route, which uses the server-side TMDB_API_KEY
  // Bearer token — the key never reaches the browser.
  const r = await fetch('/api/poster-urls');
  if (!r.ok) throw new Error(`/api/poster-urls responded with ${r.status}`);
  const data = (await r.json()) as { posters: string[] };
  return data.posters ?? [];
}

/**
 * Pick the best available poster set synchronously (for `useState` lazy init).
 * Priority: SSR-prefetched → localStorage cache → fallback SVGs.
 * This runs client-side only because the component is loaded with `ssr: false`.
 */
function resolveInitialPosters(initialPosters?: string[]): string[] {
  if (initialPosters && initialPosters.length > 0) return initialPosters;
  if (typeof window !== 'undefined') {
    const cached = readCache();
    if (cached) return cached;
  }
  return FALLBACK_POSTERS;
}

/**
 * Returns an array of poster image URLs for the hero background grid.
 *
 * - Initialises immediately with the best available data (SSR prop → cache →
 *   fallback SVGs), so the background is visible on the very first render.
 * - On mount, fetches from TMDB when no cached data exists, then persists the
 *   result with a 24-hour TTL.
 * - Falls back silently to placeholder SVGs if the API is unreachable.
 *
 * @param initialPosters Optional server-fetched URLs to hydrate without flash.
 */
export function usePosterPosters(initialPosters?: string[]): string[] {
  // Lazy init reads cache synchronously — avoids calling setState inside an effect.
  const [posters, setPosters] = useState<string[]>(() => resolveInitialPosters(initialPosters));

  // Use a ref so the effect closure captures a stable reference without
  // needing to list `initialPosters` in the exhaustive-deps array.
  const initialPostersRef = useRef(initialPosters);

  useEffect(() => {
    // Skip fetch when the component already has real poster data:
    // either from SSR pre-fetch or from the localStorage cache hit in useState.
    if (initialPostersRef.current && initialPostersRef.current.length > 0) return;
    if (readCache()) return;

    fetchPosterURLs()
      .then((urls) => {
        if (urls.length >= 8) {
          setPosters(urls);
          writeCache(urls);
        }
        // Fewer than 8 results → keep showing fallback SVGs
      })
      .catch(() => {
        // Keep the existing fallback posters when the API is unreachable.
      });
  }, []); // Intentionally empty: fetch once on mount only

  return posters;
}

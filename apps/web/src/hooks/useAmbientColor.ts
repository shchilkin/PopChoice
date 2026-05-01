import { startTransition, useEffect, useState } from 'react';

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Samples dominant colorful pixels from a poster image via Canvas 2D.
 * Returns null when posterURL is absent, CORS blocks access, or canvas fails.
 * Progressive enhancement — callers must handle null gracefully.
 */
export function useAmbientColor(posterURL: string | undefined): RGB | null {
  const [color, setColor] = useState<RGB | null>(null);

  useEffect(() => {
    if (!posterURL) {
      startTransition(() => setColor(null));
      return;
    }

    // Reset stale color when posterURL changes
    startTransition(() => setColor(null));

    // Route TMDB images through a same-origin proxy so Canvas 2D can read pixels.
    // Parse the URL to check hostname exactly, avoiding substring-match bypasses.
    let proxyUrl: string;
    try {
      const parsed = new URL(posterURL);
      proxyUrl =
        parsed.hostname === 'image.tmdb.org'
          ? `/api/poster-proxy?url=${encodeURIComponent(posterURL)}`
          : posterURL;
    } catch {
      return;
    }

    let cancelled = false;
    const img = new Image();

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 36;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 24, 36);
        const { data } = ctx.getImageData(0, 0, 24, 36);

        let rColor = 0,
          gColor = 0,
          bColor = 0,
          colorCount = 0;
        let rAll = 0,
          gAll = 0,
          bAll = 0,
          allCount = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          rAll += r;
          gAll += g;
          bAll += b;
          allCount++;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          // Only count pixels that are bright and colorful enough to be meaningful
          if (max > 40 && saturation > 0.15) {
            rColor += r;
            gColor += g;
            bColor += b;
            colorCount++;
          }
        }

        if (cancelled) return;
        if (colorCount > 0) {
          setColor({
            r: Math.round(rColor / colorCount),
            g: Math.round(gColor / colorCount),
            b: Math.round(bColor / colorCount),
          });
        } else if (allCount > 0) {
          setColor({
            r: Math.round(rAll / allCount),
            g: Math.round(gAll / allCount),
            b: Math.round(bAll / allCount),
          });
        }
      } catch {
        // Canvas SecurityError (CORS) or other failure — silent no-op
      }
    };

    img.onerror = () => {
      if (!cancelled) startTransition(() => setColor(null));
    };

    img.src = proxyUrl;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [posterURL]);

  return color;
}

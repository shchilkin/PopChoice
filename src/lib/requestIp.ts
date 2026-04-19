import { isIP } from 'node:net';

/**
 * Extracts the real client IP address from a request object.
 *
 * Order of precedence:
 * 1. req.ip - trusted property populated by platforms like Vercel or Railway (from NextRequest)
 * 2. X-Real-IP - often set by edge proxies
 * 3. X-Forwarded-For - takes the LAST valid IP in the list, as this is the one appended by the last trusted proxy.
 *
 * @param req The Request object (can be a standard Request or NextRequest)
 * @returns The validated IP address or null if not found/invalid.
 */
export function getClientIp(req: Request & { ip?: string }): string | null {
  // 1. Try req.ip (Next.js populates this from trusted headers on supported platforms)
  if (req.ip && isIP(req.ip) !== 0) {
    return req.ip;
  }

  // 2. Fall back to X-Real-IP (often set by edge proxies like Railway/Vercel)
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp && isIP(realIp) !== 0) {
    return realIp;
  }

  // 3. Fall back to X-Forwarded-For (take the LAST ip, which is appended by trusted proxies)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((s) => s.trim());
    for (let i = ips.length - 1; i >= 0; i--) {
      const candidate = ips[i];
      if (candidate && isIP(candidate) !== 0) {
        return candidate;
      }
    }
  }

  return null;
}

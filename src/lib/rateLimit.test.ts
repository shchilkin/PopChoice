import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockConnect = vi.fn();
const mockEval = vi.fn();
const mockQuit = vi.fn();

const mockClient = {
  connect: mockConnect,
  eval: mockEval,
  quit: mockQuit,
};

// Mock redis before any imports that depend on it
vi.mock('redis', () => ({
  createClient: vi.fn(() => mockClient),
}));

// Import AFTER the mock is registered
const { applyRateLimit, closeRateLimiter } = await import('./rateLimit');

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/movie-recommendation', {
    method: 'POST',
    headers,
  });
}

describe('applyRateLimit', () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    // Reset module state between tests
    await closeRateLimiter();
  });

  describe('when REDIS_URL is not set', () => {
    it('returns null (fail-open)', async () => {
      vi.stubEnv('REDIS_URL', '');
      const result = await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(result).toBeNull();
    });
  });

  describe('when Redis connection fails', () => {
    it('returns null (fail-open)', async () => {
      vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
      mockConnect.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(result).toBeNull();
    });
  });

  describe('when Redis is available', () => {
    beforeEach(() => {
      vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
      mockConnect.mockResolvedValue(undefined);
    });

    it('returns null when IP cannot be determined (no headers)', async () => {
      const result = await applyRateLimit(makeRequest());
      expect(result).toBeNull();
      expect(mockEval).not.toHaveBeenCalled();
    });

    it('returns null when the extracted IP is invalid (malformed header)', async () => {
      const result = await applyRateLimit(makeRequest({ 'x-forwarded-for': 'not-an-ip-address' }));
      expect(result).toBeNull();
      expect(mockEval).not.toHaveBeenCalled();
    });

    it('extracts client IP from x-forwarded-for (last hop)', async () => {
      mockEval.mockResolvedValue(1);
      await applyRateLimit(makeRequest({ 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' }));
      expect(mockEval).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ keys: ['rl:movie-recommendation:10.0.0.3'] }),
      );
    });

    it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
      mockEval.mockResolvedValue(1);
      await applyRateLimit(makeRequest({ 'x-real-ip': '192.168.1.5' }));
      expect(mockEval).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ keys: ['rl:movie-recommendation:192.168.1.5'] }),
      );
    });

    it('accepts a valid IPv6 address', async () => {
      mockEval.mockResolvedValue(1);
      await applyRateLimit(makeRequest({ 'x-forwarded-for': '2001:db8::1' }));
      expect(mockEval).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ keys: ['rl:movie-recommendation:2001:db8::1'] }),
      );
    });

    it('uses a Lua eval call with a 60-second TTL argument', async () => {
      mockEval.mockResolvedValue(1);
      await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(mockEval).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ arguments: ['60'] }),
      );
    });

    it('returns null for requests within the limit', async () => {
      mockEval.mockResolvedValue(5);
      const result = await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(result).toBeNull();
    });

    it('returns 429 when the request count exceeds 10', async () => {
      mockEval.mockResolvedValue(11);
      const result = await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(result).not.toBeNull();
      expect(result!.status).toBe(429);
    });

    it('includes Retry-After: 60 header in the 429 response', async () => {
      mockEval.mockResolvedValue(11);
      const result = await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(result!.headers.get('Retry-After')).toBe('60');
    });

    it('returns null (fail-open) when Redis eval throws', async () => {
      mockEval.mockRejectedValue(new Error('Redis error'));
      const result = await applyRateLimit(makeRequest({ 'x-forwarded-for': '1.2.3.4' }));
      expect(result).toBeNull();
    });
  });
});
